import { randomBytes } from "node:crypto";
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderItems,
  orders,
  products,
  type Order,
  type OrderStatus,
} from "@/db/schema";
import {
  sendCashConfirmedEmail,
  sendOrderCancelledEmail,
  sendOrderCreatedEmail,
  sendAdminNewOrderEmail,
  sendPaymentConfirmedEmail,
  sendReadyForPickupEmail,
  sendTransferReminderEmail,
} from "@/lib/order-emails";
import {
  CASH_CONFIRMATION_MS,
  computeTotals,
  MAX_CART_UNITS,
  TRANSFER_REMINDER_AFTER_MS,
  TRANSFER_RESERVATION_MS,
} from "@/lib/order-rules";
import { discountFor, getSettings } from "@/lib/settings";

// Lógica de pedidos. El stock de products es el stock físico disponible: reservar un
// pedido lo descuenta y cancelarlo lo devuelve. Todo cambio de stock va en una
// transacción con UPDATE ... WHERE stock >= cantidad, así dos compras simultáneas no
// pueden llevarse la misma última unidad.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OrderError extends Error {}
// El pedido no está en el estado necesario para esa acción.
class OrderStateError extends OrderError {}

export type CartLine = { productId: string; quantity: number };

// Descuenta el stock de los ítems. Si alguno no alcanza, tira OrderError (y la
// transacción completa se deshace).
async function reserveStock(tx: Tx, items: { productId: string | null; name: string; quantity: number }[]) {
  for (const item of items) {
    if (!item.productId) throw new OrderError(`"${item.name}" ya no está disponible.`);
    const updated = await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}` })
      .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
      .returning({ id: products.id });
    if (updated.length === 0) {
      throw new OrderError(`No hay stock suficiente de "${item.name}".`);
    }
  }
}

async function releaseStock(tx: Tx, orderId: string) {
  const items = await tx
    .select({ productId: orderItems.productId, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (!item.productId) continue; // producto borrado
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
}

export async function getOrderItems(orderId: string) {
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

// ---------- Crear ----------

export async function createOrder(input: {
  lines: CartLine[];
  paymentMethod: "transferencia" | "efectivo";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIp: string | null;
}) {
  // Juntar líneas repetidas y validar el límite de unidades.
  const quantities = new Map<string, number>();
  for (const line of input.lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }
  const totalUnits = [...quantities.values()].reduce((a, b) => a + b, 0);
  if (totalUnits === 0) throw new OrderError("El carrito está vacío.");
  if (totalUnits > MAX_CART_UNITS) {
    throw new OrderError(`Podés llevar hasta ${MAX_CART_UNITS} unidades por pedido.`);
  }

  // Precios y nombres siempre desde la base (nunca desde el navegador).
  const rows = await db
    .select({ id: products.id, name: products.name, price: products.price, stock: products.stock, active: products.active })
    .from(products)
    .where(inArray(products.id, [...quantities.keys()]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const items = [...quantities].map(([productId, quantity]) => {
    const product = byId.get(productId);
    if (!product || !product.active) throw new OrderError("Uno de los productos ya no está disponible.");
    if (product.stock < quantity) {
      throw new OrderError(
        product.stock === 0
          ? `"${product.name}" se agotó.`
          : `De "${product.name}" quedan ${product.stock} unidades.`,
      );
    }
    return { productId, name: product.name, unitPrice: product.price, quantity };
  });

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const settings = await getSettings();
  const totals = computeTotals(subtotal, discountFor(input.paymentMethod, settings));

  const isTransfer = input.paymentMethod === "transferencia";
  const now = Date.now();

  const order = await db.transaction(async (tx) => {
    // Transferencia reserva al instante; efectivo recién cuando el admin confirma.
    if (isTransfer) await reserveStock(tx, items);

    const [created] = await tx
      .insert(orders)
      .values({
        token: randomBytes(24).toString("base64url"),
        status: isTransfer ? "pendiente_pago" : "pendiente_confirmacion",
        paymentMethod: input.paymentMethod,
        deliveryMethod: "retiro",
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        ...totals,
        stockReserved: isTransfer,
        expiresAt: new Date(now + (isTransfer ? TRANSFER_RESERVATION_MS : CASH_CONFIRMATION_MS)),
        customerIp: input.customerIp,
      })
      .returning();
    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: created.id })));
    return created;
  });

  await Promise.all([sendOrderCreatedEmail(order, items), sendAdminNewOrderEmail(order, items)]);
  return order;
}

// ---------- Cambios de estado ----------

// Bloquea la fila del pedido hasta el fin de la transacción: así el vencimiento
// automático y una acción del admin (o del cliente) no pueden pisarse.
async function lockOrder(tx: Tx, id: string) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
  return order ?? null;
}

async function update(tx: Tx, id: string, set: Partial<typeof orders.$inferInsert>) {
  const [updated] = await tx.update(orders).set(set).where(eq(orders.id, id)).returning();
  return updated;
}

export const CANCELLABLE: OrderStatus[] = [
  "pendiente_pago",
  "comprobante_recibido",
  "pendiente_confirmacion",
  "confirmado",
  "pagado",
  "listo_para_retirar",
];

// Cancela el pedido (si está en uno de los estados `from`) y devuelve el stock si lo
// tenía reservado. Devuelve null si no correspondía cancelarlo.
export async function cancelOrder(id: string, reason: string, from: OrderStatus[] = CANCELLABLE) {
  const cancelled = await db.transaction(async (tx) => {
    const current = await lockOrder(tx, id);
    if (!current || !from.includes(current.status)) return null;
    if (current.stockReserved) await releaseStock(tx, id);
    return update(tx, id, { status: "cancelado", cancelReason: reason, expiresAt: null, stockReserved: false });
  });
  if (cancelled) await sendOrderCancelledEmail(cancelled);
  return cancelled;
}

// Efectivo: el cliente escribió por WhatsApp y el admin confirma. Reserva el stock;
// si ya no alcanza, cancela el pedido y le avisa al cliente.
export async function confirmCashOrder(id: string): Promise<{ order: Order } | { error: string }> {
  try {
    const order = await db.transaction(async (tx) => {
      const current = await lockOrder(tx, id);
      if (!current || current.status !== "pendiente_confirmacion") {
        throw new OrderStateError("El pedido ya no está esperando confirmación.");
      }
      await reserveStock(tx, await tx.select().from(orderItems).where(eq(orderItems.orderId, id)));
      return update(tx, id, { status: "confirmado", stockReserved: true, expiresAt: null });
    });
    await sendCashConfirmedEmail(order);
    return { order };
  } catch (error) {
    if (!(error instanceof OrderError)) throw error;
    if (error instanceof OrderStateError) return { error: error.message };
    await cancelOrder(
      id,
      `Lo sentimos, no pudimos reservar tu pedido: ${error.message} Escribinos y vemos alternativas.`,
      ["pendiente_confirmacion"],
    );
    return { error: `${error.message} El pedido se canceló y se le avisó al cliente por email.` };
  }
}

// Transferencia: el admin revisó el comprobante (o le llegó por otro medio).
export async function markPaid(id: string) {
  const order = await db.transaction(async (tx) => {
    const current = await lockOrder(tx, id);
    if (!current || !["pendiente_pago", "comprobante_recibido"].includes(current.status)) return null;
    return update(tx, id, { status: "pagado", expiresAt: null });
  });
  if (order) await sendPaymentConfirmedEmail(order);
  return order;
}

export async function markReady(id: string) {
  const order = await db.transaction(async (tx) => {
    const current = await lockOrder(tx, id);
    if (!current || !["pagado", "confirmado"].includes(current.status)) return null;
    return update(tx, id, { status: "listo_para_retirar" });
  });
  if (order) await sendReadyForPickupEmail(order);
  return order;
}

export async function markDelivered(id: string) {
  return db.transaction(async (tx) => {
    const current = await lockOrder(tx, id);
    if (!current || !["pagado", "confirmado", "listo_para_retirar"].includes(current.status)) return null;
    return update(tx, id, { status: "entregado", stockReserved: false });
  });
}

// El cliente sube el comprobante desde el link de su pedido. Devuelve la ruta del
// comprobante anterior (si lo reemplazó) para borrarlo del storage.
export async function attachReceipt(token: string, path: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.token, token)).for("update");
    if (!current) throw new OrderError("No encontramos el pedido.");
    if (current.status === "pendiente_pago" && current.expiresAt && current.expiresAt < new Date()) {
      throw new OrderError("El plazo para subir el comprobante ya venció.");
    }
    if (!["pendiente_pago", "comprobante_recibido"].includes(current.status)) {
      throw new OrderError("Este pedido ya no está esperando un comprobante.");
    }
    const order = await update(tx, current.id, {
      status: "comprobante_recibido",
      receiptPath: path,
      receiptUploadedAt: new Date(),
      // Con comprobante subido, el pedido ya no vence.
      expiresAt: null,
    });
    return { order, previousPath: current.receiptPath };
  });
}

// ---------- Tareas automáticas (las dispara /api/cron/orders) ----------

export async function processScheduledOrderTasks() {
  const now = new Date();

  // 1. Transferencias sin comprobante pasadas las 2 hs.
  const expiredTransfers = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pendiente_pago"), lt(orders.expiresAt, now)));
  for (const { id } of expiredTransfers) {
    await cancelOrder(
      id,
      "Venció el plazo de 2 horas para subir el comprobante de transferencia, así que liberamos la reserva.",
      ["pendiente_pago"],
    );
  }

  // 2. Pedidos en efectivo sin confirmar por WhatsApp en 48 hs.
  const expiredCash = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pendiente_confirmacion"), lt(orders.expiresAt, now)));
  for (const { id } of expiredCash) {
    await cancelOrder(id, "No recibimos tu confirmación por WhatsApp dentro de las 48 horas.", [
      "pendiente_confirmacion",
    ]);
  }

  // 3. Recordatorio de comprobante a la hora (se marca antes de enviar: nunca dos veces).
  const toRemind = await db
    .update(orders)
    .set({ reminderSentAt: now })
    .where(
      and(
        eq(orders.status, "pendiente_pago"),
        isNull(orders.reminderSentAt),
        lt(orders.createdAt, new Date(now.getTime() - TRANSFER_REMINDER_AFTER_MS)),
        gte(orders.expiresAt, now),
      ),
    )
    .returning();
  for (const order of toRemind) await sendTransferReminderEmail(order);

  return {
    expiredTransfers: expiredTransfers.length,
    expiredCash: expiredCash.length,
    reminders: toRemind.length,
  };
}

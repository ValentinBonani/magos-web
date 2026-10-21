import { randomBytes } from "node:crypto";
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderItems,
  orders,
  products,
  type CounterPaymentMethod,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/db/schema";
import { emailKey, isBlocked, phoneKey } from "@/lib/contacts";
import { createPreference, getPayment, refundPayment } from "@/lib/mercadopago";
import {
  sendAdminRefundFailedEmail,
  sendCashConfirmedEmail,
  sendMpPaidEmail,
  sendMpRefundedEmail,
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
  MAX_PENDING_PER_CONTACT,
  MAX_PENDING_PER_IP,
  MP_RESERVATION_MS,
  PENDING_STATUSES,
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

function mergeLines(lines: CartLine[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.productId, (quantities.get(line.productId) ?? 0) + line.quantity);
  }
  return quantities;
}

// Precios y nombres siempre desde la base (nunca desde el navegador). `allowHidden`:
// en el mostrador se puede vender un producto oculto en la web.
async function priceItems(quantities: Map<string, number>, { allowHidden = false } = {}) {
  const rows = await db
    .select({ id: products.id, name: products.name, price: products.price, stock: products.stock, active: products.active })
    .from(products)
    .where(inArray(products.id, [...quantities.keys()]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  return [...quantities].map(([productId, quantity]) => {
    const product = byId.get(productId);
    if (!product || (!product.active && !allowHidden)) throw new OrderError("Uno de los productos ya no está disponible.");
    if (product.stock < quantity) {
      throw new OrderError(
        product.stock === 0
          ? `"${product.name}" se agotó.`
          : `De "${product.name}" quedan ${product.stock} unidades.`,
      );
    }
    return { productId, name: product.name, unitPrice: product.price, quantity };
  });
}

// Protección contra pedidos falsos que bloquean stock: contactos bloqueados y límite
// de pedidos sin pagar por persona y por IP. Un pago de Mercado Pago que la misma
// persona dejó sin terminar se cancela (lo reemplaza el pedido nuevo).
async function checkCustomerLimits(input: { customerEmail: string; customerPhone: string; customerIp: string | null }) {
  if (await isBlocked(input.customerEmail, input.customerPhone)) {
    throw new OrderError("No pudimos tomar tu pedido por la web. Escribinos por WhatsApp y lo resolvemos.");
  }

  const pending = await db
    .select({
      id: orders.id,
      number: orders.number,
      status: orders.status,
      customerEmail: orders.customerEmail,
      customerPhone: orders.customerPhone,
      customerIp: orders.customerIp,
    })
    .from(orders)
    .where(and(eq(orders.channel, "web"), inArray(orders.status, PENDING_STATUSES), gte(orders.expiresAt, new Date())));

  const email = emailKey(input.customerEmail);
  const phone = phoneKey(input.customerPhone);
  const sameContact = pending.filter((o) => emailKey(o.customerEmail) === email || phoneKey(o.customerPhone) === phone);

  const abandonedMp = sameContact.filter((o) => o.status === "pendiente_mp");
  const blocking = sameContact.filter((o) => o.status !== "pendiente_mp");
  if (blocking.length >= MAX_PENDING_PER_CONTACT) {
    throw new OrderError(
      `Ya tenés un pedido pendiente (#${blocking[0].number}). Para hacer uno nuevo, primero cancelalo desde el link que te mandamos por email, o escribinos por WhatsApp.`,
    );
  }

  const replaced = new Set(abandonedMp.map((o) => o.id));
  const sameIp = input.customerIp
    ? pending.filter((o) => o.customerIp === input.customerIp && !replaced.has(o.id))
    : [];
  if (sameIp.length >= MAX_PENDING_PER_IP) {
    throw new OrderError("Hay muchos pedidos sin pagar desde tu conexión. Probá más tarde o escribinos por WhatsApp.");
  }

  for (const o of abandonedMp) {
    await cancelOrder(o.id, "Se reemplazó por un pedido nuevo.", ["pendiente_mp"], { notify: false });
  }
}

export type WebPaymentMethod = Exclude<PaymentMethod, "tarjeta">;

export async function createOrder(input: {
  lines: CartLine[];
  paymentMethod: WebPaymentMethod;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerIp: string | null;
}) {
  // Juntar líneas repetidas y validar el límite de unidades.
  const quantities = mergeLines(input.lines);
  const totalUnits = [...quantities.values()].reduce((a, b) => a + b, 0);
  if (totalUnits === 0) throw new OrderError("El carrito está vacío.");
  if (totalUnits > MAX_CART_UNITS) {
    throw new OrderError(`Podés llevar hasta ${MAX_CART_UNITS} unidades por pedido.`);
  }

  const items = await priceItems(quantities);
  await checkCustomerLimits(input);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const settings = await getSettings();
  const totals = computeTotals(subtotal, discountFor(input.paymentMethod, settings));

  // Transferencia y Mercado Pago reservan al instante; efectivo recién cuando el
  // admin confirma.
  const flows: Record<WebPaymentMethod, { status: OrderStatus; reserve: boolean; ttl: number }> = {
    transferencia: { status: "pendiente_pago", reserve: true, ttl: TRANSFER_RESERVATION_MS },
    mercadopago: { status: "pendiente_mp", reserve: true, ttl: MP_RESERVATION_MS },
    efectivo: { status: "pendiente_confirmacion", reserve: false, ttl: CASH_CONFIRMATION_MS },
  };
  const flow = flows[input.paymentMethod];

  const order = await db.transaction(async (tx) => {
    if (flow.reserve) await reserveStock(tx, items);

    const [created] = await tx
      .insert(orders)
      .values({
        token: randomBytes(24).toString("base64url"),
        status: flow.status,
        paymentMethod: input.paymentMethod,
        deliveryMethod: "retiro",
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        ...totals,
        stockReserved: flow.reserve,
        expiresAt: new Date(Date.now() + flow.ttl),
        customerIp: input.customerIp,
      })
      .returning();
    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: created.id })));
    return created;
  });

  if (input.paymentMethod === "mercadopago") {
    // Los emails salen cuando se acredita el pago (processMercadoPagoPayment).
    try {
      const preference = await createPreference(order, items);
      const [withLink] = await db
        .update(orders)
        .set({ mpInitPoint: preference.init_point })
        .where(eq(orders.id, order.id))
        .returning();
      return withLink;
    } catch (error) {
      console.error(`[mp] No se pudo crear la preferencia del pedido #${order.number}:`, error);
      await cancelOrder(order.id, "No se pudo iniciar el pago con Mercado Pago.", ["pendiente_mp"], { notify: false });
      throw new OrderError("No pudimos conectar con Mercado Pago. Probá de nuevo o elegí otro medio de pago.");
    }
  }

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
  "pendiente_mp",
  "confirmado",
  "pagado",
  "listo_para_retirar",
];

// Cancela el pedido (si está en uno de los estados `from`) y devuelve el stock si lo
// tenía reservado. Devuelve null si no correspondía cancelarlo.
export async function cancelOrder(
  id: string,
  reason: string,
  from: OrderStatus[] = CANCELLABLE,
  { notify = true }: { notify?: boolean } = {},
) {
  const cancelled = await db.transaction(async (tx) => {
    const current = await lockOrder(tx, id);
    if (!current || !from.includes(current.status)) return null;
    if (current.stockReserved) await releaseStock(tx, id);
    return update(tx, id, { status: "cancelado", cancelReason: reason, expiresAt: null, stockReserved: false });
  });
  if (cancelled && notify) await sendOrderCancelledEmail(cancelled);
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

// El cliente cancela su pedido sin pagar desde el link (por ejemplo, para cambiar el
// medio de pago). El token del link es la autorización.
export async function cancelByCustomer(token: string) {
  const [order] = await db.select({ id: orders.id }).from(orders).where(eq(orders.token, token)).limit(1);
  if (!order) return null;
  return cancelOrder(order.id, "Cancelaste el pedido.", PENDING_STATUSES);
}

// ---------- Mostrador ----------

// Venta en el local: descuenta el stock y queda registrada como entregada.
export async function createCounterSale(input: {
  lines: CartLine[];
  paymentMethod: CounterPaymentMethod;
  customerName: string | null;
}) {
  const quantities = mergeLines(input.lines);
  if (quantities.size === 0) throw new OrderError("Agregá al menos un producto.");
  const items = await priceItems(quantities, { allowHidden: true });

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totals = computeTotals(subtotal, discountFor(input.paymentMethod, await getSettings()));

  return db.transaction(async (tx) => {
    await reserveStock(tx, items);
    const [created] = await tx
      .insert(orders)
      .values({
        token: randomBytes(24).toString("base64url"),
        channel: "mostrador",
        status: "entregado",
        paymentMethod: input.paymentMethod,
        deliveryMethod: "retiro",
        customerName: input.customerName || "Mostrador",
        customerEmail: "",
        customerPhone: "",
        ...totals,
        stockReserved: false,
        expiresAt: null,
      })
      .returning();
    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: created.id })));
    return created;
  });
}

// Anula una venta del mostrador (se cargó mal o hubo devolución): vuelve el stock.
export async function voidCounterSale(id: string, reason: string) {
  return db.transaction(async (tx) => {
    const current = await lockOrder(tx, id);
    if (!current || current.channel !== "mostrador" || current.status !== "entregado") return null;
    await releaseStock(tx, id);
    return update(tx, id, { status: "cancelado", cancelReason: reason });
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

  // 3. Mercado Pago sin pagar a los 30 minutos (el link de pago ya venció).
  const expiredMp = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pendiente_mp"), lt(orders.expiresAt, now)));
  for (const { id } of expiredMp) {
    await cancelOrder(id, "No se completó el pago en Mercado Pago dentro de los 30 minutos.", ["pendiente_mp"]);
  }

  // 4. Recordatorio de comprobante a la hora (se marca antes de enviar: nunca dos veces).
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
    expiredMp: expiredMp.length,
    reminders: toRemind.length,
  };
}

// ---------- Mercado Pago ----------

// Procesa un pago informado por Mercado Pago (webhook o vuelta del cliente). Siempre
// consulta el pago a la API: nunca confía en lo que viene en la notificación o la URL.
// Es idempotente: procesar el mismo pago dos veces no cambia nada.
export async function processMercadoPagoPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  const orderId = payment.external_reference;
  if (!orderId || !/^[0-9a-f-]{36}$/.test(orderId)) return { handled: false as const, reason: "sin pedido" };

  type Outcome = "paid" | "late_paid" | "refund" | "waiting" | "noop";

  const result = await db.transaction(async (tx) => {
    const current = await lockOrder(tx, orderId);
    if (!current || current.paymentMethod !== "mercadopago") return null;

    const info = { mpPaymentId: String(payment.id), mpPaymentStatus: payment.status };
    const amountOk = payment.currency_id === "ARS" && Math.round(payment.transaction_amount) === current.total;

    if (payment.status === "approved") {
      if (!amountOk) {
        console.error(`[mp] Monto distinto en pedido #${current.number}: pagó ${payment.transaction_amount}, total ${current.total}`);
        return { order: await update(tx, orderId, info), outcome: "noop" as Outcome };
      }
      if (current.status === "pendiente_mp") {
        const order = await update(tx, orderId, { ...info, status: "pagado", expiresAt: null });
        return { order, outcome: "paid" as Outcome };
      }
      // Pagó después de que venciera la reserva: si todavía hay stock, se reserva de
      // nuevo; si no, se devuelve el pago.
      if (current.status === "cancelado" && current.mpPaymentId !== String(payment.id)) {
        try {
          await tx.transaction(async (inner) => {
            await reserveStock(inner, await inner.select().from(orderItems).where(eq(orderItems.orderId, orderId)));
          });
          const order = await update(tx, orderId, {
            ...info,
            status: "pagado",
            stockReserved: true,
            cancelReason: null,
            expiresAt: null,
          });
          return { order, outcome: "late_paid" as Outcome };
        } catch (error) {
          if (!(error instanceof OrderError)) throw error;
          return { order: await update(tx, orderId, info), outcome: "refund" as Outcome };
        }
      }
      return { order: current, outcome: "noop" as Outcome };
    }

    if ((payment.status === "in_process" || payment.status === "pending") && current.status === "pendiente_mp") {
      // Pago en revisión: no vencer la reserva mientras Mercado Pago decide.
      return { order: await update(tx, orderId, { ...info, expiresAt: null }), outcome: "waiting" as Outcome };
    }

    // Rechazado / cancelado: se registra; el cliente puede reintentar hasta que venza.
    return { order: await update(tx, orderId, info), outcome: "noop" as Outcome };
  });

  if (!result) return { handled: false as const, reason: "pedido no encontrado" };
  const { order, outcome } = result;

  if (outcome === "paid" || outcome === "late_paid") {
    const items = await getOrderItems(order.id);
    await Promise.all([sendMpPaidEmail(order, items), sendAdminNewOrderEmail(order, items)]);
  }
  if (outcome === "refund") {
    try {
      await refundPayment(String(payment.id));
      await sendMpRefundedEmail(order);
    } catch (error) {
      // El pedido ya quedó registrado con este pago: no se reintenta solo. Avisar al
      // admin para que haga la devolución a mano desde Mercado Pago.
      console.error(`[mp] Falló la devolución del pago ${payment.id} (pedido #${order.number}):`, error);
      await sendAdminRefundFailedEmail(order, String(payment.id));
    }
  }
  return { handled: true as const, outcome, status: order.status };
}

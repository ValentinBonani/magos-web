"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cancelOrder, confirmCashOrder, markDelivered, markPaid, markReady, voidCounterSale } from "@/lib/orders";
import { blockContacts } from "../configuracion/actions";

export type OrderActionState = { error?: string; ok?: string };

const ACTIONS = ["confirmCash", "markPaid", "markReady", "markDelivered", "cancel", "void", "block"] as const;

// Una sola Server Action para todos los botones del detalle del pedido.
export async function orderAction(
  id: string,
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  await requireAdmin();

  const action = z.enum(ACTIONS).safeParse(formData.get("action"));
  if (!action.success || !z.uuid().safeParse(id).success) return { error: "Acción inválida." };

  let result: OrderActionState;
  switch (action.data) {
    case "confirmCash": {
      const r = await confirmCashOrder(id);
      result = "error" in r ? { error: r.error } : { ok: "Pedido confirmado y stock reservado." };
      break;
    }
    case "markPaid":
      result = (await markPaid(id)) ? { ok: "Pago confirmado." } : { error: "El pedido ya no está esperando el pago." };
      break;
    case "markReady":
      result = (await markReady(id))
        ? { ok: "Marcado como listo. Le avisamos al cliente por email." }
        : { error: "No se puede marcar como listo en este estado." };
      break;
    case "markDelivered":
      result = (await markDelivered(id)) ? { ok: "Pedido entregado." } : { error: "No se puede entregar en este estado." };
      break;
    case "cancel": {
      const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
      result = (await cancelOrder(id, reason || "Cancelamos tu pedido. Escribinos si tenés dudas."))
        ? { ok: "Pedido cancelado. Se devolvió el stock y se le avisó al cliente." }
        : { error: "El pedido ya no se puede cancelar." };
      break;
    }
    case "void": {
      const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
      result = (await voidCounterSale(id, reason || "Venta anulada."))
        ? { ok: "Venta anulada. Se devolvió el stock." }
        : { error: "Esta venta ya no se puede anular." };
      break;
    }
    case "block": {
      const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order || order.channel !== "web") return { error: "Pedido no encontrado." };
      result = await blockContacts(
        [
          { kind: "email", value: order.customerEmail },
          { kind: "phone", value: order.customerPhone },
        ],
        `Pedido #${order.number}`,
      );
      if (result.ok) result.ok = "Email y teléfono bloqueados. Podés desbloquearlos desde Configuración.";
      break;
    }
  }

  revalidatePath("/", "layout");
  return result;
}

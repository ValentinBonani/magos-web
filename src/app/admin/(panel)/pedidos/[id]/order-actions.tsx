"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OrderStatus, PaymentMethod } from "@/db/schema";
import { orderAction, type OrderActionState } from "../actions";

type Props = { id: string; status: OrderStatus; paymentMethod: PaymentMethod; cancellable: boolean };

// Botones según el estado del pedido. Cada uno manda "action" a la misma Server Action.
export function OrderActions({ id, status, paymentMethod, cancellable }: Props) {
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(
    orderAction.bind(null, id),
    {},
  );
  const [cancelling, setCancelling] = useState(false);

  const primary: { action: string; label: string; hint?: string }[] = [];
  if (status === "pendiente_confirmacion") {
    primary.push({
      action: "confirmCash",
      label: "Confirmar pedido y reservar stock",
      hint: "Usalo cuando el cliente te escribió por WhatsApp.",
    });
  }
  if (status === "comprobante_recibido" || status === "pendiente_pago") {
    primary.push({
      action: "markPaid",
      label: "Confirmar pago",
      hint:
        status === "pendiente_pago"
          ? "Todavía no subió comprobante: confirmalo solo si ya viste la transferencia."
          : "Revisá el comprobante y que la plata haya entrado.",
    });
  }
  if (status === "pagado" || status === "confirmado") {
    primary.push({ action: "markReady", label: "Marcar listo para retirar", hint: "Le avisamos al cliente por email." });
  }
  if (status === "pagado" || status === "confirmado" || status === "listo_para_retirar") {
    primary.push({
      action: "markDelivered",
      label: paymentMethod === "efectivo" ? "Entregado y cobrado" : "Marcar entregado",
    });
  }

  return (
    <div className="space-y-3">
      {primary.map((p, i) => (
        <form key={p.action} action={formAction} className="space-y-1">
          <input type="hidden" name="action" value={p.action} />
          <Button type="submit" variant={i === 0 ? "default" : "outline"} disabled={pending} className="w-full">
            {p.label}
          </Button>
          {p.hint && <p className="text-xs text-muted-foreground">{p.hint}</p>}
        </form>
      ))}

      {cancellable &&
        (cancelling ? (
          <form action={formAction} className="space-y-2 rounded-lg border border-destructive/40 p-3">
            <input type="hidden" name="action" value="cancel" />
            <label className="block space-y-1 text-sm">
              <span>Motivo (le llega al cliente por email)</span>
              <textarea
                name="reason"
                rows={2}
                maxLength={300}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
                placeholder="Ej.: No recibimos la transferencia."
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                Cancelar pedido
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCancelling(false)}>
                Volver
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" className="w-full text-destructive" onClick={() => setCancelling(true)}>
            Cancelar pedido…
          </Button>
        ))}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
    </div>
  );
}

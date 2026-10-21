"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Channel, OrderStatus, PaymentMethod } from "@/db/schema";
import { orderAction, type OrderActionState } from "../actions";

type Props = {
  id: string;
  channel: Channel;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  cancellable: boolean;
  blocked: boolean;
};

// Botones según el estado del pedido. Cada uno manda "action" a la misma Server Action.
export function OrderActions({ id, channel, status, paymentMethod, cancellable, blocked }: Props) {
  const [state, formAction, pending] = useActionState<OrderActionState, FormData>(
    orderAction.bind(null, id),
    {},
  );
  const [cancelling, setCancelling] = useState(false);
  const [blocking, setBlocking] = useState(false);

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

  const isCounterSale = channel === "mostrador";
  const canVoid = isCounterSale && status === "entregado";

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

      {(cancellable || canVoid) &&
        (cancelling ? (
          <form action={formAction} className="space-y-2 rounded-lg border border-destructive/40 p-3">
            <input type="hidden" name="action" value={canVoid ? "void" : "cancel"} />
            <label className="block space-y-1 text-sm">
              <span>{canVoid ? "Motivo (queda en el historial)" : "Motivo (le llega al cliente por email)"}</span>
              <textarea
                name="reason"
                rows={2}
                maxLength={300}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring"
                placeholder={canVoid ? "Ej.: Se cargó mal / devolución." : "Ej.: No recibimos la transferencia."}
              />
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                {canVoid ? "Anular venta" : "Cancelar pedido"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCancelling(false)}>
                Volver
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" className="w-full text-destructive" onClick={() => setCancelling(true)}>
            {canVoid ? "Anular venta (devuelve el stock)…" : "Cancelar pedido…"}
          </Button>
        ))}

      {!isCounterSale &&
        !blocked &&
        (blocking ? (
          <form action={formAction} className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm">
            <input type="hidden" name="action" value="block" />
            <p>
              El email y el teléfono de este pedido no van a poder hacer más pedidos en la web. Si
              el pedido es falso, cancelalo también.
            </p>
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                Bloquear
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setBlocking(false)}>
                Volver
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setBlocking(true)}>
            Bloquear email y teléfono…
          </Button>
        ))}

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">{state.ok}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelMyOrder } from "./actions";

// Para pedidos sin pagar: liberar la reserva o cambiar de medio de pago.
export function CancelOrder({ token }: { token: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm text-muted-foreground hover:underline">
        Cancelar el pedido
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <p>¿Seguro que querés cancelar el pedido? Los productos dejan de estar reservados.</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelMyOrder(token);
              setError(result.error ?? null);
            })
          }
        >
          {pending ? "Cancelando…" : "Sí, cancelar"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          No
        </Button>
      </div>
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}

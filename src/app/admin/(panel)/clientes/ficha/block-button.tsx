"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { blockCustomer, type BlockCustomerState } from "../actions";

export function BlockCustomerButton({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<BlockCustomerState>({});
  const [pending, startTransition] = useTransition();

  if (state.ok) return <p className="text-sm text-green-700">{state.ok}</p>;

  return confirming ? (
    <div className="space-y-2 rounded-lg border border-destructive/40 p-3 text-sm">
      <p>
        El email y los teléfonos de este cliente no van a poder hacer más pedidos en la web.
        Sus pedidos actuales no cambian.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(async () => setState(await blockCustomer(email)))}
        >
          Bloquear
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Volver
        </Button>
      </div>
      {state.error && <p className="text-destructive">{state.error}</p>}
    </div>
  ) : (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirming(true)}>
      Bloquear email y teléfonos…
    </Button>
  );
}

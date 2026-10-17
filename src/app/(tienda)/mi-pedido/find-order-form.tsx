"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findOrder, type FindOrderState } from "./actions";

export function FindOrderForm() {
  const [state, formAction, pending] = useActionState<FindOrderState, FormData>(findOrder, {});

  return (
    <form action={formAction} className="space-y-4 rounded-xl border p-4">
      <div className="space-y-2">
        <Label htmlFor="number">Número de pedido</Label>
        <Input id="number" name="number" inputMode="numeric" placeholder="1001" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Buscando…" : "Ver mi pedido"}
      </Button>
    </form>
  );
}

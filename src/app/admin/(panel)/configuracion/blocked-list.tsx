"use client";

import { startTransition, useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { BlockKind } from "@/db/schema";
import { addBlock, removeBlock, type BlockState } from "./actions";

type Blocked = { id: string; kind: BlockKind; display: string; note: string | null };

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

export function BlockedList({ blocked }: { blocked: Blocked[] }) {
  const [state, formAction, pending] = useActionState<BlockState, FormData>(addBlock, {});
  const [removing, startRemoving] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        {/* key: al agregarse uno a la lista, el formulario se vacía. */}
        <form key={blocked.length} onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <select name="kind" className={selectClass} aria-label="Tipo">
            <option value="email">Email</option>
            <option value="phone">Teléfono</option>
          </select>
          <Input name="value" placeholder="Email o teléfono" required className="w-52" />
          <Input name="note" placeholder="Motivo (opcional)" className="w-44" />
          <Button type="submit" variant="outline" size="sm" disabled={pending} className="h-8">
            Bloquear
          </Button>
        </form>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}

        {blocked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay nadie bloqueado.</p>
        ) : (
          <ul className="divide-y text-sm">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="text-muted-foreground">{b.kind === "email" ? "Email" : "Teléfono"}:</span>{" "}
                  {b.display}
                  {b.note && <span className="block text-xs text-muted-foreground">{b.note}</span>}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removing}
                  onClick={() => startRemoving(() => removeBlock(b.id))}
                >
                  Desbloquear
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

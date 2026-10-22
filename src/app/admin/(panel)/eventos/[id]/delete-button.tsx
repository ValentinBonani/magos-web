"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "../actions";

// Borrado con confirmación en dos pasos.
export function DeleteEventButton({ id, title }: { id: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Borrar evento
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 p-2 text-sm">
      <span>¿Borrar &quot;{title}&quot;? No se puede deshacer.</span>
      <Button variant="destructive" size="sm" disabled={pending} onClick={() => startTransition(() => deleteEvent(id))}>
        {pending ? "Borrando…" : "Sí, borrar"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}

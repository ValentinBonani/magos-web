"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "../actions";

// Borrado con confirmación en dos pasos.
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Borrar producto
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 p-2 text-sm">
      <span>¿Borrar &quot;{name}&quot; y sus fotos? No se puede deshacer.</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => deleteProduct(id))}
      >
        {pending ? "Borrando…" : "Sí, borrar"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}

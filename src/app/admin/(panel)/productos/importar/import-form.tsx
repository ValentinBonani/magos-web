"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { importCatalog, type ImportState } from "./actions";

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(importCatalog, { step: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function send(mode: "preview" | "apply") {
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("mode", mode);
    startTransition(() => formAction(formData));
  }

  if (state.step === "done") {
    return (
      <div className="space-y-3 rounded-xl border border-green-300 bg-green-50 p-4">
        <p>
          <b>Listo.</b> Se crearon {state.created} productos y se actualizaron {state.updated}.
        </p>
        {state.created > 0 && (
          <p className="text-sm">Los nuevos quedaron ocultos: cargales las fotos y marcalos visibles.</p>
        )}
        <Link href="/admin/productos" className="text-sm text-primary hover:underline">
          Ir a Productos
        </Link>
      </div>
    );
  }

  const plan = state.step === "preview" ? state.plan : null;
  const nothingToDo = plan && plan.creates.length === 0 && plan.updates.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) {
              const formData = new FormData();
              formData.set("file", f);
              formData.set("mode", "preview");
              startTransition(() => formAction(formData));
            }
          }}
          className="text-sm file:mr-3 file:rounded-lg file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
        {file && (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => send("preview")}>
            Volver a leer
          </Button>
        )}
      </div>

      {pending && <p className="text-sm text-muted-foreground">Leyendo la planilla…</p>}
      {state.step === "error" && <p className="text-sm text-destructive">{state.error}</p>}

      {plan && !pending && (
        <div className="space-y-5">
          <p className="text-sm">
            <b>{plan.creates.length}</b> nuevos · <b>{plan.updates.length}</b> con cambios · {plan.unchanged} sin cambios
            {plan.errors.length > 0 && (
              <>
                {" "}
                · <b className="text-destructive">{plan.errors.length} errores</b>
              </>
            )}
          </p>

          {plan.errors.length > 0 && (
            <section className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <h2 className="font-semibold">Errores (corregilos en la planilla y volvé a subirla)</h2>
              <ul className="space-y-1">
                {plan.errors.map((e, i) => (
                  <li key={i}>
                    <span className="text-muted-foreground">Fila {e.row}:</span> {e.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.warnings.length > 0 && (
            <section className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
              <h2 className="font-semibold">Para tener en cuenta</h2>
              <ul className="space-y-1">
                {plan.warnings.map((w, i) => (
                  <li key={i}>
                    <span className="text-muted-foreground">Fila {w.row}:</span> {w.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.creates.length > 0 && (
            <section className="space-y-2 text-sm">
              <h2 className="font-semibold">Productos nuevos</h2>
              <ul className="divide-y rounded-lg border">
                {plan.creates.map((c) => (
                  <li key={c.row} className="px-3 py-2">
                    <span className="font-medium">{c.name}</span>{" "}
                    <span className="text-muted-foreground">{c.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plan.updates.length > 0 && (
            <section className="space-y-2 text-sm">
              <h2 className="font-semibold">Cambios</h2>
              <ul className="divide-y rounded-lg border">
                {plan.updates.map((u) => (
                  <li key={u.id} className="space-y-1 px-3 py-2">
                    <p className="font-medium">{u.name}</p>
                    <ul className="text-muted-foreground">
                      {u.changes.map((c) => (
                        <li key={c.field}>
                          {c.field}: <s>{c.from}</s> → <span className="text-foreground">{c.to}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {nothingToDo && plan.errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">La planilla no tiene cambios respecto de lo cargado.</p>
          ) : (
            <Button disabled={pending || plan.errors.length > 0} onClick={() => send("apply")}>
              Aplicar {plan.creates.length + plan.updates.length} cambios
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

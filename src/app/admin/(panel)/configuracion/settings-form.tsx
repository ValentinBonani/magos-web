"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings, type SettingsState } from "./actions";

export function SettingsForm(props: {
  transferDiscountPercent: number;
  cashDiscountPercent: number;
  whatsappButton: boolean;
}) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveSettings, {});

  // onSubmit para que React no vacíe los campos al guardar.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transferDiscountPercent">Transferencia (%)</Label>
              <Input
                id="transferDiscountPercent"
                name="transferDiscountPercent"
                type="number"
                min={0}
                max={90}
                defaultValue={props.transferDiscountPercent}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cashDiscountPercent">Efectivo (%)</Label>
              <Input
                id="cashDiscountPercent"
                name="cashDiscountPercent"
                type="number"
                min={0}
                max={90}
                defaultValue={props.cashDiscountPercent}
                required
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="whatsappButton"
              defaultChecked={props.whatsappButton}
              className="mt-0.5 size-4 accent-primary"
            />
            <span>
              Mostrar el botón flotante de WhatsApp en la tienda
              <span className="block text-muted-foreground">
                Los links de WhatsApp de Contacto y de los pedidos se ven siempre.
              </span>
            </span>
          </label>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.ok && <p className="text-sm text-green-700">Guardado.</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

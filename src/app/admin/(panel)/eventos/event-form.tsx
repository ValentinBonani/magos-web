"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "../productos/image-uploader";
import type { EventFormState } from "./actions";

type Props = {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  event?: { title: string; description: string; startsAt: string; imagePath: string | null };
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function EventForm({ action, event }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  // onSubmit para que React no vacíe el formulario si hay errores.
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" name="title" defaultValue={event?.title} placeholder="Torneo de Catan" required />
            <FieldError message={errors.title} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startsAt">Fecha y hora *</Label>
            <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={event?.startsAt} required className="w-fit" />
            <FieldError message={errors.startsAt} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={event?.description}
              placeholder="Qué es, cuánto sale, cómo anotarse (por WhatsApp)…"
              required
            />
            <FieldError message={errors.description} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <Label>Imagen</Label>
          <ImageUploader initialPaths={event?.imagePath ? [event.imagePath] : []} error={errors.images} max={1} />
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Link href="/admin/eventos" className={buttonVariants({ variant: "ghost" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

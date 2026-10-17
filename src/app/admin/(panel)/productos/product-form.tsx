"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SECTION_LABELS, SECTIONS, type Category, type Product } from "@/db/schema";
import type { ProductFormState } from "./actions";
import { ImageUploader } from "./image-uploader";

type Props = {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Pick<Category, "id" | "name" | "section">[];
  publishers: string[];
  product?: Product;
  imagePaths?: string[];
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function ProductForm({ action, categories, publishers, product, imagePaths = [] }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  // Se envía con onSubmit (y no con action={...}) para que React no vacíe el
  // formulario después de enviarlo: si hay errores, lo cargado se mantiene.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" defaultValue={product?.name} required />
            <FieldError message={errors.name} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoría *</Label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={product?.categoryId ?? ""}
              required
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Elegí una categoría
              </option>
              {SECTIONS.map((section) => (
                <optgroup key={section} label={SECTION_LABELS[section]}>
                  {categories
                    .filter((c) => c.section === section)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <FieldError message={errors.categoryId} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publisher">Editorial</Label>
            <Input
              id="publisher"
              name="publisher"
              list="publishers"
              defaultValue={product?.publisher ?? ""}
            />
            <datalist id="publishers">
              {publishers.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <FieldError message={errors.publisher} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Precio (pesos) *</Label>
            <Input
              id="price"
              name="price"
              inputMode="numeric"
              defaultValue={product?.price}
              placeholder="15000"
              required
            />
            <FieldError message={errors.price} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min={0}
              defaultValue={product?.stock ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              Disponible para vender. Lo reservado en pedidos ya está descontado.
            </p>
            <FieldError message={errors.stock} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción *</Label>
            <Textarea
              id="description"
              name="description"
              rows={6}
              defaultValue={product?.description}
              required
            />
            <FieldError message={errors.description} />
          </div>

          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="minPlayers">Jugadores mín.</Label>
              <Input
                id="minPlayers"
                name="minPlayers"
                type="number"
                min={1}
                defaultValue={product?.minPlayers ?? ""}
              />
              <FieldError message={errors.minPlayers} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPlayers">Jugadores máx.</Label>
              <Input
                id="maxPlayers"
                name="maxPlayers"
                type="number"
                min={1}
                defaultValue={product?.maxPlayers ?? ""}
              />
              <FieldError message={errors.maxPlayers} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAge">Edad mínima</Label>
              <Input
                id="minAge"
                name="minAge"
                type="number"
                min={1}
                defaultValue={product?.minAge ?? ""}
              />
              <FieldError message={errors.minAge} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="active"
              defaultChecked={product?.active ?? true}
              className="size-4 accent-primary"
            />
            Visible en la tienda
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <Label>Fotos *</Label>
          <ImageUploader initialPaths={imagePaths} error={errors.images} />
        </CardContent>
      </Card>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Link href="/admin/productos" className={buttonVariants({ variant: "ghost" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

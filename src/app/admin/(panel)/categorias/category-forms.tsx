"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Section } from "@/db/schema";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  type CategoryState,
} from "./actions";

export function NewCategoryForm({ section }: { section: Section }) {
  // React vacía el formulario solo después de enviarlo.
  const [state, formAction, pending] = useActionState<CategoryState, FormData>(
    createCategory,
    {},
  );

  return (
    <form action={formAction} className="space-y-1 border-t pt-3">
      <input type="hidden" name="section" value={section} />
      <div className="flex gap-2">
        <Input name="name" placeholder="Nueva categoría" required />
        <Button type="submit" disabled={pending}>
          Agregar
        </Button>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function CategoryRow({
  id,
  name,
  productCount,
}: {
  id: string;
  name: string;
  productCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [renameState, renameAction, renaming] = useActionState<
    CategoryState,
    FormData
  >(async (prev, formData) => {
    const result = await renameCategory(id, prev, formData);
    if (result.ok) setEditing(false);
    return result;
  }, {});
  const [deleteState, deleteAction, deleting] = useActionState<CategoryState>(
    deleteCategory.bind(null, id),
    {},
  );

  const error = renameState.error ?? deleteState.error;

  return (
    <li className="space-y-1">
      {editing ? (
        <form action={renameAction} className="flex gap-2">
          <Input name="name" defaultValue={name} autoFocus required />
          <Button type="submit" size="sm" disabled={renaming}>
            Guardar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="flex-1">
            {name}{" "}
            <span className="text-sm text-muted-foreground">({productCount})</span>
          </span>
          <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
            Editar
          </Button>
          <form action={deleteAction}>
            <Button
              type="submit"
              size="xs"
              variant="ghost"
              className="text-destructive"
              disabled={deleting || productCount > 0}
              title={productCount > 0 ? "Tiene productos" : undefined}
            >
              Borrar
            </Button>
          </form>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </li>
  );
}

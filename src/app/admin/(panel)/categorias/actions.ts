"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories, products, SECTIONS } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type CategoryState = { error?: string; ok?: boolean };

const nameSchema = z
  .string()
  .trim()
  .min(2, "El nombre es muy corto.")
  .max(60, "El nombre es muy largo.");

async function slugTaken(section: (typeof SECTIONS)[number], slug: string, exceptId?: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.section, section),
        eq(categories.slug, slug),
        exceptId ? ne(categories.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function createCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  await requireAdmin();

  const section = z.enum(SECTIONS).safeParse(formData.get("section"));
  const name = nameSchema.safeParse(formData.get("name"));
  if (!section.success) return { error: "Sección inválida." };
  if (!name.success) return { error: name.error.issues[0].message };

  const slug = slugify(name.data);
  if (!slug) return { error: "El nombre tiene que tener letras o números." };
  if (await slugTaken(section.data, slug)) {
    return { error: "Ya existe una categoría con ese nombre en esta sección." };
  }

  await db.insert(categories).values({ section: section.data, name: name.data, slug });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function renameCategory(
  id: string,
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  await requireAdmin();

  const name = nameSchema.safeParse(formData.get("name"));
  if (!name.success) return { error: name.error.issues[0].message };

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  if (!category) return { error: "La categoría ya no existe." };

  const slug = slugify(name.data);
  if (!slug) return { error: "El nombre tiene que tener letras o números." };
  if (await slugTaken(category.section, slug, id)) {
    return { error: "Ya existe una categoría con ese nombre en esta sección." };
  }

  await db.update(categories).set({ name: name.data, slug }).where(eq(categories.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<CategoryState> {
  await requireAdmin();

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.categoryId, id));
  if (total > 0) {
    return { error: "No se puede borrar: tiene productos. Movelos a otra categoría primero." };
  }

  await db.delete(categories).where(eq(categories.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

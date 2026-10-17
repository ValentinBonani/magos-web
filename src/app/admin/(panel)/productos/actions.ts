"use server";

import { eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";
import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------- Fotos ----------

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type UploadResult = { path: string } | { error: string };

// Sube una foto. Se re-procesa siempre en el servidor: valida que sea una imagen,
// la endereza, la achica a 1600px como máximo, le quita los metadatos y la guarda
// en WebP.
export async function uploadProductImage(formData: FormData): Promise<UploadResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No llegó la foto." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "La foto es demasiado grande." };

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return { error: "No se pudo leer la imagen. Probá con una foto JPG o PNG." };
  }

  const path = `${crypto.randomUUID()}.webp`;
  const { error } = await createAdminClient()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) return { error: "No se pudo guardar la foto. Probá de nuevo." };

  return { path };
}

async function removeImageFiles(paths: string[]) {
  if (paths.length === 0) return;
  await createAdminClient().storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
}

// ---------- Productos ----------

export type ProductFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

// "15.000" o "$ 15000" -> 15000. Vacío -> undefined.
const toInt = (v: unknown) => {
  const s = String(v ?? "").replace(/[^\d]/g, "");
  return s === "" ? undefined : Number(s);
};

const optionalInt = (label: string, max: number) =>
  z.preprocess(
    toInt,
    z.number().int().min(1, `${label}: mínimo 1.`).max(max, `${label}: máximo ${max}.`).optional(),
  );

const productSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre es obligatorio.").max(120, "Nombre muy largo."),
    description: z.string().trim().min(1, "La descripción es obligatoria.").max(5000),
    categoryId: z.uuid("Elegí una categoría."),
    price: z.preprocess(
      toInt,
      z.number({ error: "El precio es obligatorio." }).int().min(1, "El precio tiene que ser mayor a 0."),
    ),
    stock: z.preprocess(
      (v) => toInt(v) ?? 0,
      z.number().int().min(0).max(100000),
    ),
    minPlayers: optionalInt("Jugadores mínimos", 100),
    maxPlayers: optionalInt("Jugadores máximos", 100),
    minAge: optionalInt("Edad mínima", 99),
    publisher: z
      .string()
      .trim()
      .max(80)
      .transform((s) => s || undefined)
      .optional(),
    active: z.boolean(),
    images: z
      .array(z.string().regex(/^[0-9a-f-]{36}\.webp$/))
      .min(1, "Subí al menos una foto.")
      .max(10, "Máximo 10 fotos."),
  })
  .refine(
    (p) => !p.minPlayers || !p.maxPlayers || p.minPlayers <= p.maxPlayers,
    { path: ["maxPlayers"], message: "Tiene que ser mayor o igual a los mínimos." },
  );

function parseProductForm(formData: FormData) {
  let images: unknown = [];
  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
  } catch {}

  return productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    minPlayers: formData.get("minPlayers"),
    maxPlayers: formData.get("maxPlayers"),
    minAge: formData.get("minAge"),
    publisher: formData.get("publisher") ?? "",
    active: formData.get("active") === "on",
    images,
  });
}

function validationError(error: z.ZodError): ProductFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { error: "Revisá los campos marcados.", fieldErrors };
}

async function categoryExists(id: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return Boolean(row);
}

// Slug único: "catan", "catan-2", "catan-3"...
async function uniqueSlug(name: string) {
  const base = slugify(name) || "producto";
  const taken = new Set(
    (
      await db
        .select({ slug: products.slug })
        .from(products)
        .where(or(eq(products.slug, base), like(products.slug, `${base}-%`)))
    ).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) return validationError(parsed.error);
  const { images, ...data } = parsed.data;
  if (!(await categoryExists(data.categoryId))) {
    return { fieldErrors: { categoryId: "La categoría ya no existe." } };
  }

  const slug = await uniqueSlug(data.name);
  await db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({ ...data, slug })
      .returning({ id: products.id });
    await tx
      .insert(productImages)
      .values(images.map((path, position) => ({ productId: product.id, path, position })));
  });

  revalidatePath("/", "layout");
  redirect("/admin/productos?guardado=1");
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = parseProductForm(formData);
  if (!parsed.success) return validationError(parsed.error);
  const { images, ...data } = parsed.data;
  if (!(await categoryExists(data.categoryId))) {
    return { fieldErrors: { categoryId: "La categoría ya no existe." } };
  }

  const oldPaths = await db.transaction(async (tx) => {
    const updated = await tx
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (updated.length === 0) return null;

    const old = await tx
      .select({ path: productImages.path })
      .from(productImages)
      .where(eq(productImages.productId, id));
    await tx.delete(productImages).where(eq(productImages.productId, id));
    await tx
      .insert(productImages)
      .values(images.map((path, position) => ({ productId: id, path, position })));
    return old.map((r) => r.path);
  });
  if (oldPaths === null) return { error: "El producto ya no existe." };

  // Borrar del storage las fotos que se sacaron.
  await removeImageFiles(oldPaths.filter((p) => !images.includes(p)));

  revalidatePath("/", "layout");
  redirect("/admin/productos?guardado=1");
}

export async function deleteProduct(id: string) {
  await requireAdmin();

  const paths = await db.transaction(async (tx) => {
    const imgs = await tx
      .select({ path: productImages.path })
      .from(productImages)
      .where(eq(productImages.productId, id));
    await tx.delete(products).where(eq(products.id, id));
    return imgs.map((r) => r.path);
  });
  await removeImageFiles(paths);

  revalidatePath("/", "layout");
  redirect("/admin/productos?borrado=1");
}

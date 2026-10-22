"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { fromArgentinaInputValue } from "@/lib/format";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export type EventFormState = { error?: string; fieldErrors?: Partial<Record<string, string>> };

const schema = z.object({
  title: z.string().trim().min(2, "El título es obligatorio.").max(120, "Título muy largo."),
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(5000),
  startsAt: z.string().transform((v, ctx) => {
    const date = fromArgentinaInputValue(v);
    if (!date) ctx.addIssue({ code: "custom", message: "Elegí la fecha y la hora." });
    return date ?? new Date(0);
  }),
  images: z.array(z.string().regex(/^[0-9a-f-]{36}\.webp$/)).max(1),
});

function parse(formData: FormData) {
  let images: unknown = [];
  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
  } catch {}
  return schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    images,
  });
}

function validationError(error: z.ZodError): EventFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
  return { error: "Revisá los campos marcados.", fieldErrors };
}

async function removeImage(path: string | null | undefined) {
  if (path) await createAdminClient().storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
}

export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return validationError(parsed.error);
  const { images, ...data } = parsed.data;
  await db.insert(events).values({ ...data, imagePath: images[0] ?? null });
  revalidatePath("/eventos");
  redirect("/admin/eventos?guardado=1");
}

export async function updateEvent(id: string, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return validationError(parsed.error);
  const { images, ...data } = parsed.data;
  const [current] = await db.select({ imagePath: events.imagePath }).from(events).where(eq(events.id, id));
  if (!current) return { error: "El evento ya no existe." };
  const imagePath = images[0] ?? null;
  await db.update(events).set({ ...data, imagePath }).where(eq(events.id, id));
  if (current.imagePath !== imagePath) await removeImage(current.imagePath);
  revalidatePath("/eventos");
  redirect("/admin/eventos?guardado=1");
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return;
  const [deleted] = await db.delete(events).where(eq(events.id, id)).returning({ imagePath: events.imagePath });
  await removeImage(deleted?.imagePath);
  revalidatePath("/eventos");
  redirect("/admin/eventos?borrado=1");
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { blockedContacts, settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { contactKey } from "@/lib/contacts";

export type SettingsState = { error?: string; ok?: boolean };

const percent = z.coerce
  .number({ error: "Ingresá un número." })
  .int("Usá números enteros.")
  .min(0, "Mínimo 0%.")
  .max(90, "Máximo 90%.");

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();

  const parsed = z
    .object({ transferDiscountPercent: percent, cashDiscountPercent: percent, whatsappButton: z.boolean() })
    .safeParse({
      transferDiscountPercent: formData.get("transferDiscountPercent"),
      cashDiscountPercent: formData.get("cashDiscountPercent"),
      whatsappButton: formData.get("whatsappButton") === "on",
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .insert(settings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({ target: settings.id, set: parsed.data });

  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------- Contactos bloqueados ----------

export type BlockState = { error?: string; ok?: string };

const blockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("email"), value: z.email("Email inválido.").trim(), note: z.string().trim().max(200) }),
  z.object({
    kind: z.literal("phone"),
    value: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v.replace(/\D/g, "").length >= 8, "Teléfono inválido (mínimo 8 números)."),
    note: z.string().trim().max(200),
  }),
]);

export async function blockContacts(
  entries: { kind: "email" | "phone"; value: string }[],
  note: string,
): Promise<BlockState> {
  await requireAdmin();
  const rows = [];
  for (const entry of entries) {
    const parsed = blockSchema.safeParse({ ...entry, note });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    rows.push({
      kind: parsed.data.kind,
      value: contactKey(parsed.data.kind, parsed.data.value),
      display: parsed.data.value,
      note: parsed.data.note || null,
    });
  }
  if (rows.length === 0) return { error: "No hay nada para bloquear." };
  await db.insert(blockedContacts).values(rows).onConflictDoNothing();
  revalidatePath("/admin", "layout");
  return { ok: rows.length === 1 ? "Bloqueado." : "Bloqueados." };
}

export async function addBlock(_prev: BlockState, formData: FormData): Promise<BlockState> {
  const kind = formData.get("kind") === "phone" ? "phone" : "email";
  return blockContacts([{ kind, value: String(formData.get("value") ?? "") }], String(formData.get("note") ?? ""));
}

export async function removeBlock(id: string) {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return;
  await db.delete(blockedContacts).where(eq(blockedContacts.id, id));
  revalidatePath("/admin", "layout");
}

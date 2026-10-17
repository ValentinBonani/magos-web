"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export type SettingsState = { error?: string; ok?: boolean };

const percent = z.coerce
  .number({ error: "Ingresá un número." })
  .int("Usá números enteros.")
  .min(0, "Mínimo 0%.")
  .max(90, "Máximo 90%.");

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();

  const parsed = z
    .object({ transferDiscountPercent: percent, cashDiscountPercent: percent })
    .safeParse({
      transferDiscountPercent: formData.get("transferDiscountPercent"),
      cashDiscountPercent: formData.get("cashDiscountPercent"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db
    .insert(settings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({ target: settings.id, set: parsed.data });

  revalidatePath("/", "layout");
  return { ok: true };
}

import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { blockedContacts, type BlockKind } from "@/db/schema";

// Claves para comparar emails y teléfonos escritos de distintas formas.

export function emailKey(email: string) {
  return email.trim().toLowerCase();
}

// Últimos 8 dígitos: "+54 9 11 4041-4118", "011 15 4041-4118" y "1140414118" dan
// todos "40414118" (sin importar prefijos 0, 54, 9 o 15).
export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-8);
}

export function contactKey(kind: BlockKind, value: string) {
  return kind === "email" ? emailKey(value) : phoneKey(value);
}

export async function isBlocked(email: string, phone: string) {
  const rows = await db
    .select({ id: blockedContacts.id })
    .from(blockedContacts)
    .where(
      or(
        and(eq(blockedContacts.kind, "email"), eq(blockedContacts.value, emailKey(email))),
        and(eq(blockedContacts.kind, "phone"), eq(blockedContacts.value, phoneKey(phone))),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

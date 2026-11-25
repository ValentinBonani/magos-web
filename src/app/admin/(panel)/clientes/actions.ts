"use server";

import { requireAdmin } from "@/lib/auth";
import { getCustomer } from "@/lib/customers";
import { blockContacts } from "../configuracion/actions";

export type BlockCustomerState = { error?: string; ok?: string };

// Bloquea el email del cliente y todos los teléfonos que usó en sus pedidos.
export async function blockCustomer(email: string): Promise<BlockCustomerState> {
  await requireAdmin();
  const customer = await getCustomer(email);
  if (!customer) return { error: "Cliente no encontrado." };
  const result = await blockContacts(
    [{ kind: "email", value: customer.email }, ...customer.phones.map((value) => ({ kind: "phone" as const, value }))],
    `Cliente ${customer.name}`,
  );
  return result.ok ? { ok: "Bloqueado. Podés desbloquearlo desde Configuración." } : result;
}

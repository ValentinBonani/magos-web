"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";

export type FindOrderState = { error?: string };

// Busca un pedido por número + email y redirige a su página.
export async function findOrder(_prev: FindOrderState, formData: FormData): Promise<FindOrderState> {
  const number = Number(String(formData.get("number") ?? "").replace(/\D/g, ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!Number.isInteger(number) || number <= 0 || !email) {
    return { error: "Completá el número de pedido y el email." };
  }

  const [order] = await db
    .select({ token: orders.token })
    .from(orders)
    .where(and(eq(orders.number, number), eq(orders.customerEmail, email)))
    .limit(1);
  if (!order) return { error: "No encontramos un pedido con ese número y email." };

  redirect(`/pedido/${order.token}`);
}

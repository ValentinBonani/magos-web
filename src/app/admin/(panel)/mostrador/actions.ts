"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COUNTER_PAYMENT_METHODS } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { createCounterSale, OrderError } from "@/lib/orders";

export type SaleResult = { error?: string; sale?: { id: string; number: number; total: number } };

const schema = z.object({
  lines: z
    .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(999) }))
    .min(1, "Agregá al menos un producto.")
    .max(100),
  paymentMethod: z.enum(COUNTER_PAYMENT_METHODS, { error: "Elegí el medio de pago." }),
  customerName: z.string().trim().max(100),
});

export async function registerSale(input: z.input<typeof schema>): Promise<SaleResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const order = await createCounterSale({ ...parsed.data, customerName: parsed.data.customerName || null });
    // Cambió el stock (tienda y panel).
    revalidatePath("/", "layout");
    return { sale: { id: order.id, number: order.number, total: order.total } };
  } catch (error) {
    if (error instanceof OrderError) return { error: `${error.message} Si el stock del sistema está mal, corregilo en Productos.` };
    throw error;
  }
}

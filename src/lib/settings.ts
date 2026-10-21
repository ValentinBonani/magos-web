import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, type PaymentMethod } from "@/db/schema";

export async function getSettings() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return row ?? { id: 1, transferDiscountPercent: 10, cashDiscountPercent: 15, whatsappButton: true };
}

// Mismos descuentos en la web y en el mostrador; Mercado Pago y tarjeta, sin descuento.
export function discountFor(
  method: PaymentMethod,
  s: { transferDiscountPercent: number; cashDiscountPercent: number },
) {
  if (method === "transferencia") return s.transferDiscountPercent;
  if (method === "efectivo") return s.cashDiscountPercent;
  return 0;
}

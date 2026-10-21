"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { mercadoPagoEnabled } from "@/lib/mercadopago";
import { createOrder, OrderError } from "@/lib/orders";
import { verifyTurnstile } from "@/lib/turnstile";

export type CheckoutState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "phone" | "paymentMethod", string>>;
  token?: string;
  // Mercado Pago: link de pago al que hay que mandar al cliente.
  paymentUrl?: string;
};

const schema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre.").max(100),
  email: z.email("Ingresá un email válido.").trim().toLowerCase().max(200),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Ingresá un teléfono válido."),
  paymentMethod: z.enum(["transferencia", "efectivo", "mercadopago"], { error: "Elegí cómo vas a pagar." }),
  lines: z
    .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(1).max(10) }))
    .min(1, "El carrito está vacío.")
    .max(20),
});

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  let lines: unknown = [];
  try {
    lines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {}

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    paymentMethod: formData.get("paymentMethod"),
    lines,
  });
  if (!parsed.success) {
    const fieldErrors: CheckoutState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<CheckoutState["fieldErrors"]>;
      if (key === ("lines" as string)) return { error: issue.message };
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Revisá los datos marcados.", fieldErrors };
  }

  if (parsed.data.paymentMethod === "mercadopago" && !mercadoPagoEnabled()) {
    return { fieldErrors: { paymentMethod: "Mercado Pago todavía no está disponible." } };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  if (!(await verifyTurnstile(String(formData.get("turnstileToken") ?? "") || null, ip))) {
    return { error: "No pudimos verificar que no seas un robot. Probá de nuevo." };
  }

  try {
    const order = await createOrder({
      lines: parsed.data.lines,
      paymentMethod: parsed.data.paymentMethod,
      customerName: parsed.data.name,
      customerEmail: parsed.data.email,
      customerPhone: parsed.data.phone,
      customerIp: ip,
    });
    // El stock cambió (transferencia reserva al instante).
    revalidatePath("/", "layout");
    return { token: order.token, paymentUrl: order.mpInitPoint ?? undefined };
  } catch (error) {
    if (error instanceof OrderError) return { error: error.message };
    console.error("[checkout] Error creando pedido:", error);
    return { error: "No pudimos registrar el pedido. Probá de nuevo en un momento." };
  }
}

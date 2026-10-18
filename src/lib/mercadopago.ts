import { createHmac, timingSafeEqual } from "node:crypto";
import type { Order, OrderItem } from "@/db/schema";
import { siteUrl } from "@/lib/site";

// Integración con Mercado Pago (Checkout Pro) por API REST, sin SDK.
// Docs: https://www.mercadopago.com.ar/developers/es/reference

const API = "https://api.mercadopago.com";

export function mercadoPagoEnabled() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}

async function mpFetch<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("MP_ACCESS_TOKEN no configurado");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Mercado Pago respondió ${res.status} en ${path}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Cuotas que ofrece el checkout. 1 = solo en un pago (sin cuotas).
// Ver docs/requerimientos.md (cuotas: a definir por el dueño).
const MAX_INSTALLMENTS = 1;

// Crea la preferencia de pago (el link al que se manda al cliente).
export async function createPreference(order: Order, items: Pick<OrderItem, "name" | "unitPrice" | "quantity">[]) {
  const base = siteUrl();
  const orderUrl = `${base}/pedido/${order.token}`;

  // Mercado Pago cobra lo que dicen los ítems; con descuento (hoy MP no tiene) se
  // ajustaría acá. Verificamos que la suma coincida con el total del pedido.
  const sum = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0) - order.discountAmount + order.shippingCost;
  if (sum !== order.total) throw new Error(`Total inconsistente en el pedido #${order.number}`);

  const preference = await mpFetch<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    idempotencyKey: `pref-${order.id}`,
    body: JSON.stringify({
      items: items.map((i) => ({
        title: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        currency_id: "ARS",
      })),
      payer: { name: order.customerName, email: order.customerEmail },
      external_reference: order.id,
      back_urls: { success: orderUrl, pending: orderUrl, failure: orderUrl },
      auto_return: "approved",
      notification_url: `${base}/api/mercadopago/webhook`,
      statement_descriptor: "MAGOS DEL SUR",
      // Solo medios que se acreditan al instante (sin Rapipago / Pago Fácil).
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }, { id: "atm" }],
        installments: MAX_INSTALLMENTS,
      },
      // El link vence junto con la reserva de stock.
      expires: true,
      expiration_date_from: order.createdAt.toISOString(),
      expiration_date_to: order.expiresAt!.toISOString(),
      metadata: { order_number: order.number },
    }),
  });
  return preference;
}

export type MpPayment = {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back" | "authorized" | "in_mediation";
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
};

export function getPayment(paymentId: string) {
  return mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`);
}

export function refundPayment(paymentId: string) {
  return mpFetch<{ id: number }>(`/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
    method: "POST",
    idempotencyKey: `refund-${paymentId}`,
    body: "{}",
  });
}

// Verifica la firma de un webhook (x-signature), igual que el SDK oficial:
// HMAC-SHA256 hex de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con la clave
// secreta de la aplicación. Los pares sin valor se omiten.
export function verifyWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !xSignature) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=").trim();
    if (key.trim().toLowerCase() === "ts") ts = value;
    if (key.trim().toLowerCase() === "v1") v1 = value;
  }
  if (!ts || !/^\d+$/.test(ts) || !v1) return false;

  const parts: string[] = [];
  if (dataId?.trim()) parts.push(`id:${dataId.trim()}`);
  if (xRequestId?.trim()) parts.push(`request-id:${xRequestId.trim()}`);
  parts.push(`ts:${ts}`);
  const expected = createHmac("sha256", secret).update(parts.join(";") + ";").digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

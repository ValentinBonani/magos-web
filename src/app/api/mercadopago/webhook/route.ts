import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/mercadopago";
import { processMercadoPagoPayment } from "@/lib/orders";

// Notificaciones de Mercado Pago (webhook). Se configura en la aplicación de Mercado
// Pago apuntando a /api/mercadopago/webhook con el evento "Pagos".
// Responder 200 rápido; ante un error responder 500 para que Mercado Pago reintente.
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  let body: { type?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {}

  const type = params.get("type") ?? body.type;
  // La firma se calcula con el data.id de la URL (igual que el SDK oficial).
  const dataId = params.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);

  const valid = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId: params.get("data.id"),
  });
  if (!valid) {
    console.warn("[mp] Webhook con firma inválida", { type, dataId });
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  if (type !== "payment" || !dataId) return NextResponse.json({ ignored: true });

  try {
    const result = await processMercadoPagoPayment(dataId);
    // Pago tardío que volvió a reservar stock.
    if (result.handled && result.outcome === "late_paid") revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (error) {
    console.error(`[mp] Error procesando el pago ${dataId}:`, error);
    return NextResponse.json({ error: "error procesando" }, { status: 500 });
  }
}

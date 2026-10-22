import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { processLowStockReport } from "@/lib/low-stock";
import { processScheduledOrderTasks } from "@/lib/orders";

// Vencimientos y recordatorios de pedidos, y el aviso diario de stock bajo. La llama pg_cron (Supabase) cada 5 minutos
// con el header "Authorization: Bearer <CRON_SECRET>" (ver scripts/setup-cron.mjs).

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await processScheduledOrderTasks();
  // Los vencimientos devuelven stock: regenerar las páginas estáticas (inicio, etc.).
  if (result.expiredTransfers + result.expiredMp > 0) revalidatePath("/", "layout");
  const lowStockReportSent = await processLowStockReport();
  return NextResponse.json({ ...result, lowStockReportSent });
}

import { and, asc, count, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { products, settings } from "@/db/schema";
import { sendAdminLowStockEmail } from "@/lib/order-emails";

// Alerta de stock bajo: productos visibles con 1 unidad o menos (ver requerimientos).
export const LOW_STOCK_THRESHOLD = 1;
// El email diario sale en la primera corrida de la tarea automática desde esta hora.
const REPORT_HOUR = 9;

export const lowStockCondition = and(eq(products.active, true), lte(products.stock, LOW_STOCK_THRESHOLD));

export async function countLowStock() {
  const [{ n }] = await db.select({ n: count() }).from(products).where(lowStockCondition);
  return n;
}

function argentinaNow(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

// Una vez por día (desde las 9 hs): si hay productos con stock bajo que no estaban en
// el aviso anterior, manda un email con la lista. Devuelve si lo mandó.
export async function processLowStockReport(now = new Date()) {
  const { day, hour } = argentinaNow(now);
  if (hour < REPORT_HOUR) return false;

  // Marcar el día antes de mandar (con la condición en el UPDATE): aunque la tarea
  // corra dos veces a la vez, el email sale una sola vez.
  const [claimed] = await db
    .update(settings)
    .set({ lowStockReportDay: day })
    .where(and(eq(settings.id, 1), sql`${settings.lowStockReportDay} is distinct from ${day}`))
    .returning({ previousIds: settings.lowStockReportIds });
  if (!claimed) return false;

  const low = await db
    .select({ id: products.id, name: products.name, stock: products.stock })
    .from(products)
    .where(lowStockCondition)
    .orderBy(asc(products.stock), asc(products.name));
  // `returning` devuelve la fila ya actualizada, pero los ids no se tocaron todavía.
  const previous = new Set(claimed.previousIds);
  const newItems = low.filter((p) => !previous.has(p.id));

  await db.update(settings).set({ lowStockReportIds: low.map((p) => p.id) }).where(eq(settings.id, 1));
  if (newItems.length === 0) return false;
  await sendAdminLowStockEmail(newItems, low.filter((p) => previous.has(p.id)));
  return true;
}

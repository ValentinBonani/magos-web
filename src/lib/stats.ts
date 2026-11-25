import { and, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, type Channel, type OrderStatus } from "@/db/schema";

// Estadísticas de ventas (ver requerimientos). Cuentan los pedidos web cobrados y las
// ventas del mostrador (que quedan "entregado"); las anuladas quedan "cancelado".
// Cada venta se ubica por la fecha del pedido, en horario de Argentina (UTC-3 todo el año).
export const SOLD_STATUSES: OrderStatus[] = ["pagado", "listo_para_retirar", "entregado"];

const TIME_ZONE = "America/Argentina/Buenos_Aires";

// ---------- Fechas ("AAAA-MM-DD", día de Argentina) ----------

export function argentinaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
}

export function isDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

function monthStart(day: string) {
  return `${day.slice(0, 7)}-01`;
}

function lastDayOfMonth(day: string) {
  return addDays(monthStart(addDays(monthStart(day), 31)), -1);
}

const shortDate = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", day: "numeric", month: "short" });
const monthName = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "long", year: "numeric" });
const shortMonth = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", month: "short", year: "2-digit" });

// "3 nov." / "3 nov. – 24 nov."
export function formatDayRange(from: string, to: string) {
  const f = (d: string) => shortDate.format(new Date(`${d}T00:00:00Z`));
  return from === to ? f(from) : `${f(from)} – ${f(to)}`;
}

// ---------- Períodos ----------

export const PERIODS = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Esta semana" },
  { key: "mes", label: "Este mes" },
  { key: "mes-pasado", label: "Mes pasado" },
] as const;

export type PeriodKey = (typeof PERIODS)[number]["key"] | "rango";

export type Period = {
  key: PeriodKey;
  from: string;
  to: string;
  label: string;
  // Período anterior para comparar.
  prevFrom: string;
  prevTo: string;
  prevLabel: string;
};

// Rango a elección: como máximo un año.
export const MAX_RANGE_DAYS = 366;

export function resolvePeriod(params: { periodo?: unknown; desde?: unknown; hasta?: unknown }, today = argentinaToday()): Period {
  const { periodo, desde, hasta } = params;

  if (periodo === "rango" && isDay(desde) && isDay(hasta) && desde <= hasta && hasta <= today) {
    const length = daysBetween(desde, hasta);
    if (length < MAX_RANGE_DAYS) {
      const prevTo = addDays(desde, -1);
      const prevFrom = addDays(prevTo, -length);
      return {
        key: "rango",
        from: desde,
        to: hasta,
        label: formatDayRange(desde, hasta),
        prevFrom,
        prevTo,
        prevLabel: formatDayRange(prevFrom, prevTo),
      };
    }
  }

  if (periodo === "hoy") {
    const prev = addDays(today, -1);
    return { key: "hoy", from: today, to: today, label: "Hoy", prevFrom: prev, prevTo: prev, prevLabel: "ayer" };
  }

  if (periodo === "semana") {
    // De lunes a hoy; se compara con los mismos días de la semana pasada.
    const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
    const monday = addDays(today, -((dow + 6) % 7));
    return {
      key: "semana",
      from: monday,
      to: today,
      label: "Esta semana",
      prevFrom: addDays(monday, -7),
      prevTo: addDays(today, -7),
      prevLabel: "la semana pasada",
    };
  }

  if (periodo === "mes-pasado") {
    const from = monthStart(addDays(monthStart(today), -1));
    const prevFrom = monthStart(addDays(from, -1));
    return {
      key: "mes-pasado",
      from,
      to: lastDayOfMonth(from),
      label: monthName.format(new Date(`${from}T00:00:00Z`)),
      prevFrom,
      prevTo: lastDayOfMonth(prevFrom),
      prevLabel: monthName.format(new Date(`${prevFrom}T00:00:00Z`)),
    };
  }

  // Este mes (por defecto): del 1 a hoy; se compara con los mismos días del mes pasado.
  const from = monthStart(today);
  const prevFrom = monthStart(addDays(from, -1));
  const prevLast = lastDayOfMonth(prevFrom);
  const sameDay = `${prevFrom.slice(0, 8)}${today.slice(8)}`;
  return {
    key: "mes",
    from,
    to: today,
    label: "Este mes",
    prevFrom,
    prevTo: sameDay < prevLast ? sameDay : prevLast,
    prevLabel: "los mismos días del mes pasado",
  };
}

// ---------- Consultas ----------

function soldBetween(from: string, to: string) {
  return and(
    inArray(orders.status, SOLD_STATUSES),
    gte(orders.createdAt, new Date(`${from}T00:00:00-03:00`)),
    lt(orders.createdAt, new Date(`${addDays(to, 1)}T00:00:00-03:00`)),
  );
}

// Lo cobrado: con el descuento y sin el envío.
const amount = sql<number>`coalesce(sum(${orders.total} - ${orders.shippingCost}), 0)::int`;

export type ChannelTotals = { amount: number; count: number };
export type Summary = Record<Channel | "all", ChannelTotals>;

export async function salesSummary(from: string, to: string): Promise<Summary> {
  const rows = await db
    .select({ channel: orders.channel, amount, count: sql<number>`count(*)::int` })
    .from(orders)
    .where(soldBetween(from, to))
    .groupBy(orders.channel);
  const get = (c: Channel) => rows.find((r) => r.channel === c) ?? { amount: 0, count: 0 };
  const web = get("web");
  const mostrador = get("mostrador");
  return {
    web: { amount: web.amount, count: web.count },
    mostrador: { amount: mostrador.amount, count: mostrador.count },
    all: { amount: web.amount + mostrador.amount, count: web.count + mostrador.count },
  };
}

// Más de 3 meses: el gráfico agrupa por mes en lugar de por día.
const MAX_DAILY_BARS = 92;

export type ChartBar = { key: string; label: string; web: number; mostrador: number };

export async function salesChart(from: string, to: string): Promise<{ unit: "dia" | "mes"; bars: ChartBar[] }> {
  const unit = daysBetween(from, to) + 1 > MAX_DAILY_BARS ? "mes" : "dia";
  const format = unit === "mes" ? "YYYY-MM" : "YYYY-MM-DD";
  // Literales (constantes) para que el GROUP BY coincida con el SELECT.
  const bucket = sql<string>`to_char(${orders.createdAt} at time zone '${sql.raw(TIME_ZONE)}', '${sql.raw(format)}')`;
  const rows = await db
    .select({ bucket, channel: orders.channel, amount })
    .from(orders)
    .where(soldBetween(from, to))
    .groupBy(bucket, orders.channel);

  // Una barra por día (o mes) del período, aunque no haya ventas.
  const bars: ChartBar[] = [];
  for (let day = from; day <= to; day = unit === "mes" ? monthStart(addDays(lastDayOfMonth(day), 1)) : addDays(day, 1)) {
    const key = unit === "mes" ? day.slice(0, 7) : day;
    const date = new Date(`${day}T00:00:00Z`);
    bars.push({
      key,
      label: unit === "mes" ? shortMonth.format(date) : shortDate.format(date),
      web: 0,
      mostrador: 0,
    });
  }
  for (const r of rows) {
    const bar = bars.find((b) => b.key === r.bucket);
    if (bar) bar[r.channel] += r.amount;
  }
  return { unit, bars };
}

export type TopProduct = { productId: string | null; name: string; units: number; amount: number };

// Por producto (o por nombre, si el producto se borró). La plata de cada renglón lleva
// el descuento del pedido (redondeado), así que la suma puede diferir unos pesos del total.
export async function productSales(from: string, to: string): Promise<TopProduct[]> {
  const key = sql`coalesce(${orderItems.productId}::text, 'nombre:' || ${orderItems.name})`;
  return db
    .select({
      productId: sql<string | null>`(array_agg(${orderItems.productId}))[1]`,
      // El nombre más reciente con el que se vendió.
      name: sql<string>`(array_agg(${orderItems.name} order by ${orders.createdAt} desc))[1]`,
      units: sql<number>`sum(${orderItems.quantity})::int`,
      amount: sql<number>`sum(round(${orderItems.unitPrice} * ${orderItems.quantity} * (100 - ${orders.discountPercent}) / 100.0))::int`,
    })
    .from(orderItems)
    .innerJoin(orders, sql`${orders.id} = ${orderItems.orderId}`)
    .where(soldBetween(from, to))
    .groupBy(key);
}

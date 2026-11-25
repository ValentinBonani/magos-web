import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { blockedContacts, orders } from "@/db/schema";
import { emailKey, phoneKey } from "@/lib/contacts";
import { SOLD_STATUSES } from "@/lib/stats";

// Clientes = personas que hicieron pedidos en la web, reconocidas por el email (sin
// importar mayúsculas). Incluye a quienes solo tienen pedidos cancelados. Lo gastado
// cuenta solo los pedidos cobrados, igual que las estadísticas (sin envío).

export const CUSTOMER_SORTS = [
  { key: "reciente", label: "Último pedido" },
  { key: "gastado", label: "Total gastado" },
  { key: "pedidos", label: "Cantidad de pedidos" },
] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number]["key"];

export const CUSTOMERS_PER_PAGE = 50;

const key = sql<string>`lower(trim(${orders.customerEmail}))`;
const sold = sql`${orders.status} in (${sql.join(SOLD_STATUSES.map((s) => sql`${s}`), sql`, `)})`;
const digits = (column: typeof orders.customerPhone) => sql`regexp_replace(${column}, '\\D', '', 'g')`;

const customerColumns = {
  email: key,
  // Nombre y teléfono del pedido más reciente.
  name: sql<string>`(array_agg(${orders.customerName} order by ${orders.createdAt} desc))[1]`,
  phone: sql<string>`(array_agg(${orders.customerPhone} order by ${orders.createdAt} desc))[1]`,
  orders: sql<number>`count(*)::int`,
  paidOrders: sql<number>`(count(*) filter (where ${sold}))::int`,
  spent: sql<number>`(coalesce(sum(${orders.total} - ${orders.shippingCost}) filter (where ${sold}), 0))::int`,
  lastOrderAt: sql<Date>`max(${orders.createdAt})`.mapWith((v) => new Date(v)),
  firstOrderAt: sql<Date>`min(${orders.createdAt})`.mapWith((v) => new Date(v)),
};

export type CustomerRow = {
  email: string;
  name: string;
  phone: string;
  orders: number;
  paidOrders: number;
  spent: number;
  lastOrderAt: Date;
  firstOrderAt: Date;
};

export async function listCustomers({ q, sort, page }: { q: string; sort: CustomerSort; page: number }) {
  const phoneDigits = q.replace(/\D/g, "");
  const search = q
    ? sql`bool_or(
        extensions.unaccent(${orders.customerName}) ilike extensions.unaccent(${`%${q}%`})
        or ${orders.customerEmail} ilike ${`%${q}%`}
        ${phoneDigits.length >= 4 ? sql`or ${digits(orders.customerPhone)} like ${`%${phoneDigits}%`}` : sql``}
      )`
    : undefined;

  const order =
    sort === "gastado"
      ? [desc(customerColumns.spent), desc(customerColumns.lastOrderAt)]
      : sort === "pedidos"
        ? [desc(customerColumns.orders), desc(customerColumns.lastOrderAt)]
        : [desc(customerColumns.lastOrderAt)];

  const rows = await db
    .select({ ...customerColumns, total: sql<number>`(count(*) over ())::int` })
    .from(orders)
    .where(eq(orders.channel, "web"))
    .groupBy(key)
    .having(search)
    .orderBy(...order)
    .limit(CUSTOMERS_PER_PAGE)
    .offset((page - 1) * CUSTOMERS_PER_PAGE);

  return { rows: rows as (CustomerRow & { total: number })[], total: rows[0]?.total ?? 0 };
}

export async function getCustomer(email: string) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.channel, "web"), sql`${key} = ${emailKey(email)}`))
    .orderBy(desc(orders.createdAt));
  if (rows.length === 0) return null;

  const paid = rows.filter((o) => SOLD_STATUSES.includes(o.status));
  // Teléfonos distintos que usó (comparados por los últimos 8 dígitos).
  const phones = [...new Map(rows.map((o) => [phoneKey(o.customerPhone), o.customerPhone])).values()];
  return {
    email: emailKey(email),
    name: rows[0].customerName,
    phones,
    names: [...new Set(rows.map((o) => o.customerName.trim()))],
    orders: rows,
    paidOrders: paid.length,
    spent: paid.reduce((s, o) => s + o.total - o.shippingCost, 0),
  };
}

// Qué emails y teléfonos (claves) están bloqueados, para varios clientes a la vez.
export async function blockedKeys(emails: string[], phones: string[]) {
  const emailKeys = emails.map(emailKey);
  const phoneKeys = phones.map(phoneKey).filter(Boolean);
  if (emailKeys.length === 0 && phoneKeys.length === 0) return new Set<string>();
  const rows = await db
    .select({ kind: blockedContacts.kind, value: blockedContacts.value })
    .from(blockedContacts)
    .where(
      or(
        emailKeys.length ? and(eq(blockedContacts.kind, "email"), inArray(blockedContacts.value, emailKeys)) : undefined,
        phoneKeys.length ? and(eq(blockedContacts.kind, "phone"), inArray(blockedContacts.value, phoneKeys)) : undefined,
      ),
    );
  return new Set(rows.map((r) => `${r.kind}:${r.value}`));
}

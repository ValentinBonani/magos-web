import { and, asc, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { orders, products, type CounterPaymentMethod } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { COUNTER_PAYMENT_LABELS, formatDateTime } from "@/lib/order-rules";
import { getSettings } from "@/lib/settings";
import { StatusBadge } from "../pedidos/status-badge";
import { CounterForm } from "./counter-form";

// Comienzo del día de hoy en horario de Argentina.
const startOfToday = sql`date_trunc('day', now() at time zone 'America/Argentina/Buenos_Aires') at time zone 'America/Argentina/Buenos_Aires'`;

export default async function CounterPage() {
  await requireAdmin();
  const [catalog, settings, today] = await Promise.all([
    db
      .select({ id: products.id, name: products.name, price: products.price, stock: products.stock, active: products.active })
      .from(products)
      .orderBy(asc(products.name)),
    getSettings(),
    db
      .select()
      .from(orders)
      .where(and(eq(orders.channel, "mostrador"), sql`${orders.createdAt} >= ${startOfToday}`))
      .orderBy(desc(orders.createdAt)),
  ]);

  const sold = today.filter((o) => o.status === "entregado");
  const byMethod = new Map<CounterPaymentMethod, number>();
  for (const o of sold) {
    const method = o.paymentMethod as CounterPaymentMethod;
    byMethod.set(method, (byMethod.get(method) ?? 0) + o.total);
  }
  const totalToday = sold.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Mostrador</h1>

      <CounterForm
        products={catalog}
        transferDiscount={settings.transferDiscountPercent}
        cashDiscount={settings.cashDiscountPercent}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-xl font-semibold">Ventas de hoy</h2>
          <p className="text-sm text-muted-foreground">
            {sold.length} {sold.length === 1 ? "venta" : "ventas"} · {formatPrice(totalToday)}
            {[...byMethod].map(([method, total]) => ` · ${COUNTER_PAYMENT_LABELS[method]} ${formatPrice(total)}`)}
          </p>
        </div>
        {today.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay ventas hoy.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {today.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 hover:bg-muted/50">
                  <span className="font-medium">#{o.number}</span>
                  <span className="text-muted-foreground">{formatDateTime(o.createdAt)}</span>
                  <span>{COUNTER_PAYMENT_LABELS[o.paymentMethod]}</span>
                  {o.customerName !== "Mostrador" && <span className="text-muted-foreground">{o.customerName}</span>}
                  <span className="ml-auto font-medium">{formatPrice(o.total)}</span>
                  <StatusBadge status={o.status} channel={o.channel} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Para anular una venta, abrila. Todas las ventas quedan también en Pedidos → Mostrador.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import {
  argentinaToday,
  PERIODS,
  productSales,
  resolvePeriod,
  salesChart,
  salesSummary,
  type ChannelTotals,
  type TopProduct,
} from "@/lib/stats";
import { SalesChart } from "./sales-chart";

const TOP_LIMIT = 10;

// "2026-11-03" -> "03/11/2026"
const dmy = (day: string) => day.split("-").reverse().join("/");

const average = (t: ChannelTotals) => (t.count > 0 ? Math.round(t.amount / t.count) : 0);

// "+15%" / "−8%"; sin ventas en el período anterior no hay porcentaje.
function Change({ now, before, prevLabel }: { now: number; before: number; prevLabel: string }) {
  if (before === 0) {
    return <p className="text-xs text-muted-foreground">Sin ventas en {prevLabel}</p>;
  }
  const pct = Math.round(((now - before) / before) * 100);
  const tone = pct > 0 ? "text-green-700" : pct < 0 ? "text-red-700" : "text-muted-foreground";
  return (
    <p className="text-xs text-muted-foreground">
      <span className={`font-medium ${tone}`}>
        {pct > 0 ? "▲ +" : pct < 0 ? "▼ −" : ""}
        {Math.abs(pct)}%
      </span>{" "}
      vs. {prevLabel}
    </p>
  );
}

function StatTile(props: {
  title: string;
  value: string;
  now: number;
  before: number;
  prevLabel: string;
  web: string;
  mostrador: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{props.title}</p>
        <p className="text-3xl font-semibold tabular-nums">{props.value}</p>
        <Change now={props.now} before={props.before} prevLabel={props.prevLabel} />
        <p className="pt-1 text-xs text-muted-foreground">
          Web {props.web} · Mostrador {props.mostrador}
        </p>
      </CardContent>
    </Card>
  );
}

function TopTable({ title, rows, by }: { title: string; rows: TopProduct[]; by: "units" | "amount" }) {
  return (
    <Card>
      <CardContent className="space-y-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hubo ventas en este período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">{by === "units" ? "Unidades" : "Plata"}</TableHead>
                <TableHead className="text-right">{by === "units" ? "Plata" : "Unidades"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.productId ?? r.name}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="max-w-56 truncate whitespace-normal">
                    {r.productId ? (
                      <Link href={`/admin/productos/${r.productId}`} className="hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      <span title="Producto borrado">{r.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {by === "units" ? r.units : formatPrice(r.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {by === "units" ? formatPrice(r.amount) : r.units}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default async function StatsPage({ searchParams }: PageProps<"/admin/estadisticas">) {
  await requireAdmin();
  const params = await searchParams;
  const today = argentinaToday();
  const period = resolvePeriod(params, today);

  const [summary, prev, chart, products] = await Promise.all([
    salesSummary(period.from, period.to),
    salesSummary(period.prevFrom, period.prevTo),
    salesChart(period.from, period.to),
    productSales(period.from, period.to),
  ]);

  const byUnits = [...products].sort((a, b) => b.units - a.units || b.amount - a.amount).slice(0, TOP_LIMIT);
  const byAmount = [...products].sort((a, b) => b.amount - a.amount || b.units - a.units).slice(0, TOP_LIMIT);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos web cobrados (pagados, listos para retirar o entregados) y ventas del
          mostrador, por fecha del pedido. Montos con descuento y sin envío.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/estadisticas?periodo=${p.key}`}
            className={buttonVariants({ variant: period.key === p.key ? "default" : "outline", size: "sm" })}
          >
            {p.label}
          </Link>
        ))}
        <form className="flex flex-wrap items-end gap-2" action="/admin/estadisticas">
          <input type="hidden" name="periodo" value="rango" />
          <div className="space-y-1">
            <Label htmlFor="desde" className="text-xs">Desde</Label>
            <Input id="desde" name="desde" type="date" max={today} defaultValue={period.from} required className="h-8" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hasta" className="text-xs">Hasta</Label>
            <Input id="hasta" name="hasta" type="date" max={today} defaultValue={period.to} required className="h-8" />
          </div>
          <button
            type="submit"
            className={buttonVariants({ variant: period.key === "rango" ? "default" : "outline", size: "sm" })}
          >
            Ver rango
          </button>
        </form>
      </div>
      {params.periodo === "rango" && period.key !== "rango" && (
        <p className="text-sm text-destructive">
          Rango inválido: elegí fechas hasta hoy, con &quot;desde&quot; antes que &quot;hasta&quot; y
          como máximo un año. Se muestra este mes.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{period.label}</span> (
        {period.from === period.to ? dmy(period.from) : `${dmy(period.from)} al ${dmy(period.to)}`}
        ), comparado con {period.prevLabel}.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          title="Total vendido"
          value={formatPrice(summary.all.amount)}
          now={summary.all.amount}
          before={prev.all.amount}
          prevLabel={period.prevLabel}
          web={formatPrice(summary.web.amount)}
          mostrador={formatPrice(summary.mostrador.amount)}
        />
        <StatTile
          title="Ventas"
          value={String(summary.all.count)}
          now={summary.all.count}
          before={prev.all.count}
          prevLabel={period.prevLabel}
          web={String(summary.web.count)}
          mostrador={String(summary.mostrador.count)}
        />
        <StatTile
          title="Ticket promedio"
          value={formatPrice(average(summary.all))}
          now={average(summary.all)}
          before={average(prev.all)}
          prevLabel={period.prevLabel}
          web={formatPrice(average(summary.web))}
          mostrador={formatPrice(average(summary.mostrador))}
        />
      </div>

      <Card>
        <CardContent>
          <SalesChart bars={chart.bars} unit={chart.unit} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopTable title="Más vendidos (unidades)" rows={byUnits} by="units" />
        <TopTable title="Más vendidos (plata)" rows={byAmount} by="amount" />
      </div>
    </div>
  );
}

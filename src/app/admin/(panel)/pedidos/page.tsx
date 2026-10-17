import { and, desc, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { orders, type OrderStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { formatDateTime, NEEDS_ATTENTION, PAYMENT_LABELS } from "@/lib/order-rules";
import { StatusBadge } from "./status-badge";

const FILTERS: { key: string; label: string; statuses: OrderStatus[] | null }[] = [
  { key: "atender", label: "Para atender", statuses: NEEDS_ATTENTION },
  {
    key: "activos",
    label: "Activos",
    statuses: ["pendiente_pago", "comprobante_recibido", "pendiente_confirmacion", "confirmado", "pagado", "listo_para_retirar"],
  },
  { key: "entregados", label: "Entregados", statuses: ["entregado"] },
  { key: "cancelados", label: "Cancelados", statuses: ["cancelado"] },
  { key: "todos", label: "Todos", statuses: null },
];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.estado) ?? FILTERS[0];
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const qNumber = Number(q.replace(/^#/, ""));

  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        filter.statuses ? inArray(orders.status, filter.statuses) : undefined,
        q
          ? Number.isInteger(qNumber) && qNumber > 0
            ? sql`${orders.number} = ${qNumber}`
            : sql`(extensions.unaccent(${orders.customerName}) ilike extensions.unaccent(${`%${q}%`}) or ${orders.customerEmail} ilike ${`%${q}%`})`
          : undefined,
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pedidos</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/pedidos?estado=${f.key}`}
              className={buttonVariants({ variant: f.key === filter.key ? "secondary" : "ghost", size: "sm" })}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="estado" value={filter.key} />
          <input
            name="q"
            defaultValue={q}
            placeholder="N° de pedido, nombre o email"
            className="h-8 w-60 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring"
          />
          <button type="submit" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Buscar
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No hay pedidos en esta lista.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                      #{o.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                  <TableCell>
                    <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                      {o.customerName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{PAYMENT_LABELS[o.paymentMethod]}</TableCell>
                  <TableCell className="text-right">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

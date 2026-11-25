import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { emailKey, phoneKey } from "@/lib/contacts";
import {
  blockedKeys,
  CUSTOMER_SORTS,
  CUSTOMERS_PER_PAGE,
  listCustomers,
  type CustomerSort,
} from "@/lib/customers";
import { formatPrice } from "@/lib/format";
import { formatDateTime } from "@/lib/order-rules";

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clientes">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = CUSTOMER_SORTS.find((s) => s.key === sp.orden)?.key ?? "reciente";
  const page = Math.max(1, Math.floor(Number(sp.pagina)) || 1);

  const { rows, total } = await listCustomers({ q, sort, page });
  const blocked = await blockedKeys(
    rows.map((r) => r.email),
    rows.map((r) => r.phone),
  );
  const isBlocked = (r: (typeof rows)[number]) =>
    blocked.has(`email:${emailKey(r.email)}`) || blocked.has(`phone:${phoneKey(r.phone)}`);

  const pages = Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE));
  const href = (changes: { orden?: CustomerSort; pagina?: number }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const orden = changes.orden ?? sort;
    if (orden !== "reciente") params.set("orden", orden);
    const pagina = changes.pagina ?? 1;
    if (pagina > 1) params.set("pagina", String(pagina));
    const query = params.toString();
    return `/admin/clientes${query ? `?${query}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          Quienes hicieron pedidos en la web, por email. &quot;Gastado&quot; cuenta solo los
          pedidos cobrados, sin envío.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2" action="/admin/clientes">
          {sort !== "reciente" && <input type="hidden" name="orden" value={sort} />}
          <Input name="q" defaultValue={q} placeholder="Nombre, email o teléfono" className="w-64" />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Buscar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="text-muted-foreground">Ordenar por:</span>
          {CUSTOMER_SORTS.map((s) => (
            <Link
              key={s.key}
              href={href({ orden: s.key })}
              className={buttonVariants({ variant: sort === s.key ? "default" : "ghost", size: "sm" })}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {total === 0
          ? q
            ? "No hay clientes que coincidan con la búsqueda."
            : "Todavía no hay pedidos en la web."
          : `${total} ${total === 1 ? "cliente" : "clientes"}${q ? " encontrados" : ""}.`}
      </p>

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Cobrados</TableHead>
              <TableHead className="text-right">Gastado</TableHead>
              <TableHead>Último pedido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.email}>
                <TableCell>
                  <Link
                    href={`/admin/clientes/ficha?email=${encodeURIComponent(r.email)}`}
                    className="font-medium hover:underline"
                  >
                    {r.name}
                  </Link>
                  {isBlocked(r) && (
                    <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      Bloqueado
                    </span>
                  )}
                  <span className="block text-xs text-muted-foreground">{r.email}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                <TableCell className="text-right tabular-nums">{r.orders}</TableCell>
                <TableCell className="text-right tabular-nums">{r.paidOrders}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatPrice(r.spent)}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(r.lastOrderAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {page > 1 && (
            <Link href={href({ pagina: page - 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              ← Anterior
            </Link>
          )}
          <span className="text-muted-foreground">
            Página {page} de {pages}
          </span>
          {page < pages && (
            <Link href={href({ pagina: page + 1 })} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
import { blockedKeys, getCustomer } from "@/lib/customers";
import { formatPrice } from "@/lib/format";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/order-rules";
import { StatusBadge } from "../../pedidos/status-badge";
import { BlockCustomerButton } from "./block-button";

export default async function CustomerPage({ searchParams }: PageProps<"/admin/clientes/ficha">) {
  await requireAdmin();
  const { email } = await searchParams;
  if (typeof email !== "string" || !email.trim()) notFound();
  const customer = await getCustomer(email);
  if (!customer) notFound();

  const blocked = await blockedKeys([customer.email], customer.phones);
  const emailBlocked = blocked.has(`email:${emailKey(customer.email)}`);
  const phoneBlocked = (phone: string) => blocked.has(`phone:${phoneKey(phone)}`);
  const fullyBlocked = emailBlocked && customer.phones.every(phoneBlocked);
  const otherNames = customer.names.filter((n) => n !== customer.name.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/clientes" className="text-sm text-muted-foreground hover:underline">
          ← Clientes
        </Link>
        <h1 className="text-2xl font-semibold">{customer.name}</h1>
        {(emailBlocked || customer.phones.some(phoneBlocked)) && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            {fullyBlocked ? "Bloqueado" : "Bloqueado en parte"}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <Card>
          <CardContent className="space-y-2 text-sm">
            <p>
              <a href={`mailto:${customer.email}`} className="hover:underline">
                {customer.email}
              </a>
              {emailBlocked && <span className="ml-2 text-xs text-destructive">(bloqueado)</span>}
            </p>
            {customer.phones.map((phone) => (
              <p key={phone}>
                {phone}
                {phoneBlocked(phone) && <span className="ml-2 text-xs text-destructive">(bloqueado)</span>}
              </p>
            ))}
            {otherNames.length > 0 && (
              <p className="text-muted-foreground">También figura como: {otherNames.join(", ")}</p>
            )}
            <p className="text-muted-foreground">
              Cliente desde {formatDateTime(customer.orders[customer.orders.length - 1].createdAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">Gastado (pedidos cobrados)</p>
            <p className="text-3xl font-semibold tabular-nums">{formatPrice(customer.spent)}</p>
            <p className="text-muted-foreground">
              {customer.orders.length} {customer.orders.length === 1 ? "pedido" : "pedidos"} ·{" "}
              {customer.paidOrders} {customer.paidOrders === 1 ? "cobrado" : "cobrados"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Pedidos</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customer.orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell>
                  <Link href={`/admin/pedidos/${o.id}`} className="font-medium hover:underline">
                    #{o.number}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(o.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} channel={o.channel} />
                </TableCell>
                <TableCell className="text-muted-foreground">{PAYMENT_LABELS[o.paymentMethod]}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(o.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!fullyBlocked && <BlockCustomerButton email={customer.email} />}
    </div>
  );
}

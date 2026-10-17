import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/order-rules";
import { CANCELLABLE, getOrderItems } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "../status-badge";
import { OrderActions } from "./order-actions";

// "11 4041-4118" -> "5491140414118" (formato wa.me para celulares argentinos).
function whatsappForPhone(phone: string) {
  let digits = phone.replace(/\D/g, "").replace(/^0/, "");
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  return `https://wa.me/549${digits}`;
}

export default async function OrderDetailPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();
  const items = await getOrderItems(order.id);

  // Link temporal (10 min) al comprobante, que está en un bucket privado.
  let receiptUrl: string | null = null;
  if (order.receiptPath) {
    const { data } = await createAdminClient()
      .storage.from("receipts")
      .createSignedUrl(order.receiptPath, 600);
    receiptUrl = data?.signedUrl ?? null;
  }
  const receiptIsPdf = order.receiptPath?.endsWith(".pdf");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pedidos" className="text-sm text-muted-foreground hover:underline">
          ← Pedidos
        </Link>
        <h1 className="text-2xl font-semibold">Pedido #{order.number}</h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_18rem]">
        <div className="space-y-6">
          <section className="space-y-2 rounded-xl border p-4 text-sm">
            <h2 className="font-semibold">Cliente</h2>
            <p className="text-base">{order.customerName}</p>
            <p>
              <a href={`mailto:${order.customerEmail}`} className="text-primary hover:underline">
                {order.customerEmail}
              </a>
            </p>
            <p>
              {order.customerPhone} ·{" "}
              <a href={whatsappForPhone(order.customerPhone)} target="_blank" rel="noopener" className="text-primary hover:underline">
                Abrir WhatsApp
              </a>
            </p>
          </section>

          <section className="space-y-3 rounded-xl border p-4 text-sm">
            <h2 className="font-semibold">Productos</h2>
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>
                    {i.quantity} × {i.productId ? <Link href={`/admin/productos/${i.productId}`} className="hover:underline">{i.name}</Link> : i.name}
                  </span>
                  <span>{formatPrice(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Descuento {order.discountPercent}%</span>
                  <span>− {formatPrice(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </section>

          {order.paymentMethod === "transferencia" && (
            <section className="space-y-3 rounded-xl border p-4 text-sm">
              <h2 className="font-semibold">Comprobante</h2>
              {receiptUrl ? (
                <>
                  <p className="text-muted-foreground">Subido el {formatDateTime(order.receiptUploadedAt!)}</p>
                  {receiptIsPdf ? (
                    <a href={receiptUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
                      Abrir PDF del comprobante
                    </a>
                  ) : (
                    <a href={receiptUrl} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element -- link firmado temporal, no pasa por next/image */}
                      <img src={receiptUrl} alt="Comprobante" className="max-h-[32rem] rounded-lg border" />
                    </a>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Todavía no subió el comprobante.</p>
              )}
            </section>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-xl border p-4 text-sm">
          <dl className="space-y-2">
            <div>
              <dt className="text-muted-foreground">Fecha</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Pago</dt>
              <dd>{PAYMENT_LABELS[order.paymentMethod]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entrega</dt>
              <dd>Retiro en el local</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Stock</dt>
              <dd>{order.stockReserved ? "Reservado" : order.status === "entregado" ? "Vendido" : "Sin reservar"}</dd>
            </div>
            {order.expiresAt && (
              <div>
                <dt className="text-muted-foreground">Vence</dt>
                <dd>{formatDateTime(order.expiresAt)}</dd>
              </div>
            )}
            {order.cancelReason && (
              <div>
                <dt className="text-muted-foreground">Motivo de cancelación</dt>
                <dd>{order.cancelReason}</dd>
              </div>
            )}
          </dl>
          <OrderActions
            id={order.id}
            status={order.status}
            paymentMethod={order.paymentMethod}
            cancellable={CANCELLABLE.includes(order.status)}
          />
        </aside>
      </div>
    </div>
  );
}

import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { orders, type Order } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { formatDateTime, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/order-rules";
import { getOrderItems } from "@/lib/orders";
import { SITE, whatsappUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import { ReceiptUpload } from "./receipt-upload";

export const metadata: Metadata = {
  title: "Tu pedido — Magos del Sur",
  // Página privada (link con token): que no la indexen los buscadores.
  robots: { index: false, follow: false },
};

function Box({ tone = "default", children }: { tone?: "default" | "warning" | "success"; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border p-4",
        tone === "warning" && "border-amber-300 bg-amber-50",
        tone === "success" && "border-green-300 bg-green-50",
      )}
    >
      {children}
    </section>
  );
}

function BankDetails({ order }: { order: Order }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-background p-3 text-sm">
      <dt className="text-muted-foreground">Monto</dt>
      <dd className="font-semibold">{formatPrice(order.total)}</dd>
      <dt className="text-muted-foreground">Alias</dt>
      <dd className="font-semibold select-all">{SITE.bank.alias}</dd>
      <dt className="text-muted-foreground">Titular</dt>
      <dd>{SITE.bank.holder}</dd>
      <dt className="text-muted-foreground">Banco</dt>
      <dd>{SITE.bank.bank}</dd>
    </dl>
  );
}

function NextStep({ order }: { order: Order }) {
  const expired = order.expiresAt !== null && order.expiresAt < new Date();
  const confirmMessage = whatsappUrl(`¡Hola! Quiero confirmar mi pedido #${order.number}.`);

  switch (order.status) {
    case "pendiente_pago":
      if (expired) {
        return (
          <Box tone="warning">
            <p>Venció el plazo para subir el comprobante y la reserva se liberó.</p>
          </Box>
        );
      }
      return (
        <Box tone="warning">
          <h2 className="font-semibold">1. Transferí</h2>
          <BankDetails order={order} />
          <h2 className="font-semibold">2. Subí el comprobante</h2>
          <p className="text-sm">
            Te guardamos los productos hasta las <b>{formatDateTime(order.expiresAt!)}</b>. Si no
            subís el comprobante antes, la reserva se libera.
          </p>
          <ReceiptUpload token={order.token} replacing={false} />
        </Box>
      );
    case "comprobante_recibido":
      return (
        <Box tone="success">
          <p>
            <b>Recibimos tu comprobante.</b> Lo revisamos y te avisamos por email cuando confirmemos
            el pago. Tus productos quedan reservados.
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">¿Te equivocaste de archivo?</summary>
            <div className="pt-3">
              <ReceiptUpload token={order.token} replacing />
            </div>
          </details>
        </Box>
      );
    case "pendiente_confirmacion":
      return (
        <Box tone="warning">
          <p>
            <b>Para reservar tu pedido, escribinos por WhatsApp.</b> Hasta que te confirmemos, los
            productos no están reservados y se pueden vender en el local.
          </p>
          <a href={confirmMessage} target="_blank" rel="noopener" className={buttonVariants()}>
            Confirmar por WhatsApp
          </a>
          {order.expiresAt && (
            <p className="text-sm text-muted-foreground">
              Si no recibimos tu mensaje antes de las {formatDateTime(order.expiresAt)}, el pedido se
              cancela.
            </p>
          )}
        </Box>
      );
    case "confirmado":
      return (
        <Box tone="success">
          <p>
            <b>¡Tu pedido está reservado!</b> Pagás {formatPrice(order.total)} en efectivo cuando
            retirás.
          </p>
        </Box>
      );
    case "pagado":
      return (
        <Box tone="success">
          <p>
            <b>¡Pago confirmado!</b> Te avisamos por email cuando esté listo para retirar.
          </p>
        </Box>
      );
    case "listo_para_retirar":
      return (
        <Box tone="success">
          <p>
            <b>¡Tu pedido está listo!</b> Ya podés pasar a retirarlo
            {order.paymentMethod === "efectivo" && <> (traé {formatPrice(order.total)} en efectivo)</>}.
          </p>
        </Box>
      );
    case "entregado":
      return (
        <Box tone="success">
          <p>
            <b>Pedido entregado.</b> ¡Gracias por tu compra!
          </p>
        </Box>
      );
    case "cancelado":
      return (
        <Box tone="warning">
          <p>
            <b>Pedido cancelado.</b> {order.cancelReason}
          </p>
        </Box>
      );
  }
}

export default async function OrderPage({ params }: PageProps<"/pedido/[token]">) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.token, token)).limit(1);
  if (!order) notFound();
  const items = await getOrderItems(order.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Pedido #{order.number}</h1>
        <p className="text-muted-foreground">
          {STATUS_LABELS[order.status]} · {PAYMENT_LABELS[order.paymentMethod]}
        </p>
      </div>

      <NextStep order={order} />

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">Detalle</h2>
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>
                {i.quantity} × {i.name}
              </span>
              <span className="shrink-0">{formatPrice(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        {order.discountAmount > 0 && (
          <div className="flex justify-between border-t pt-2 text-sm text-green-700">
            <span>Descuento {order.discountPercent}%</span>
            <span>− {formatPrice(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </section>

      <section className="space-y-1 rounded-xl border p-4 text-sm">
        <h2 className="font-semibold">Retiro en el local</h2>
        <p>
          {SITE.address}, {SITE.city}
        </p>
        <p className="text-muted-foreground">{SITE.hours.join(" · ")}</p>
      </section>

      <p className="text-sm text-muted-foreground">
        Guardá este link para volver a tu pedido. También te lo mandamos por email a{" "}
        {order.customerEmail}. ¿Dudas?{" "}
        <a href={whatsappUrl(`¡Hola! Tengo una consulta sobre mi pedido #${order.number}.`)} target="_blank" rel="noopener" className="text-primary hover:underline">
          Escribinos por WhatsApp
        </a>
        .
      </p>
    </div>
  );
}

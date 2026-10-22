import type { Order, OrderItem } from "@/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { formatDateTime, PAYMENT_LABELS } from "@/lib/order-rules";
import { SITE, siteUrl, whatsappUrl } from "@/lib/site";

// Emails de pedidos. HTML simple con estilos en línea (los clientes de email no
// soportan CSS externo).

type Items = Pick<OrderItem, "name" | "unitPrice" | "quantity">[];

const VIOLET = "#835ca3";

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2f6;font-family:Arial,Helvetica,sans-serif;color:#1d1d1b">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:${VIOLET};color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">${SITE.name}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 24px;background:#faf9fb;font-size:12px;color:#666">
${escapeHtml(SITE.address)}, ${escapeHtml(SITE.city)} · WhatsApp ${escapeHtml(SITE.whatsappDisplay)}
</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 12px;line-height:1.5">${html}</p>`;

function button(href: string, label: string) {
  return `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:${VIOLET};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${label}</a></p>`;
}

function orderLink(order: Order) {
  return `${siteUrl()}/pedido/${order.token}`;
}

function itemsTable(order: Order, items: Items) {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantity} × ${escapeHtml(i.name)}</td><td align="right">${formatPrice(i.unitPrice * i.quantity)}</td></tr>`,
    )
    .join("");
  const discount =
    order.discountAmount > 0
      ? `<tr><td style="padding:6px 0;color:#666">Descuento ${order.discountPercent}%</td><td align="right" style="color:#666">− ${formatPrice(order.discountAmount)}</td></tr>`
      : "";
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;font-size:14px">
${rows}${discount}
<tr><td style="padding:8px 0;font-weight:bold">Total</td><td align="right" style="font-weight:bold">${formatPrice(order.total)}</td></tr>
</table>`;
}

function bankBox(order: Order) {
  return `<div style="background:#f4f2f6;border-radius:8px;padding:12px 16px;margin:12px 0;font-size:14px;line-height:1.6">
<b>Transferí ${formatPrice(order.total)} a:</b><br>
Alias: <b>${escapeHtml(SITE.bank.alias)}</b><br>
Titular: ${escapeHtml(SITE.bank.holder)}<br>
Banco: ${escapeHtml(SITE.bank.bank)}
</div>`;
}

const pickupInfo = () =>
  p(`Retirás en <b>${escapeHtml(SITE.address)}</b>, ${escapeHtml(SITE.city)}.<br>${SITE.hours.map(escapeHtml).join("<br>")}`);

// ---------- Al cliente ----------

export async function sendOrderCreatedEmail(order: Order, items: Items) {
  const greeting = p(`¡Hola ${escapeHtml(order.customerName)}! Recibimos tu pedido <b>#${order.number}</b>.`);
  let body: string;

  if (order.paymentMethod === "transferencia") {
    body =
      greeting +
      bankBox(order) +
      p(
        `Tenés tiempo hasta las <b>${formatDateTime(order.expiresAt!)}</b> para subir el comprobante. Mientras tanto te guardamos los productos; si no lo subís a tiempo, la reserva se libera.`,
      ) +
      button(orderLink(order), "Subir comprobante") +
      itemsTable(order, items) +
      pickupInfo();
  } else {
    body =
      greeting +
      p(
        `<b>Importante:</b> para reservar los productos, escribinos por WhatsApp. Hasta que te confirmemos, el pedido <b>no está reservado</b> y los productos se pueden vender en el local.`,
      ) +
      button(whatsappUrl(`¡Hola! Quiero confirmar mi pedido #${order.number}.`), "Confirmar por WhatsApp") +
      p(`Pagás en efectivo cuando retirás. Podés ver tu pedido <a href="${orderLink(order)}" style="color:${VIOLET}">acá</a>.`) +
      itemsTable(order, items) +
      pickupInfo();
  }

  return sendEmail({
    to: order.customerEmail,
    subject: `Recibimos tu pedido #${order.number}`,
    html: layout(`Pedido #${order.number}`, body),
  });
}

export async function sendTransferReminderEmail(order: Order) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Te queda poco tiempo para tu pedido #${order.number}`,
    html: layout(
      "¿Ya hiciste la transferencia?",
      p(`Todavía no recibimos el comprobante de tu pedido <b>#${order.number}</b>.`) +
        p(`Tenés hasta las <b>${formatDateTime(order.expiresAt!)}</b>; después la reserva se libera.`) +
        bankBox(order) +
        button(orderLink(order), "Subir comprobante"),
    ),
  });
}

export async function sendOrderCancelledEmail(order: Order) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Tu pedido #${order.number} fue cancelado`,
    html: layout(
      `Pedido #${order.number} cancelado`,
      p(order.cancelReason ? escapeHtml(order.cancelReason) : "Tu pedido fue cancelado.") +
        p(
          `Si querés, podés hacer un pedido nuevo en la web o escribirnos por <a href="${whatsappUrl()}" style="color:${VIOLET}">WhatsApp</a>.`,
        ),
    ),
  });
}

export async function sendPaymentConfirmedEmail(order: Order) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Recibimos el pago de tu pedido #${order.number}`,
    html: layout(
      "¡Pago confirmado!",
      p(`Ya confirmamos el pago de tu pedido <b>#${order.number}</b>. Te avisamos cuando esté listo para retirar.`) +
        button(orderLink(order), "Ver mi pedido"),
    ),
  });
}

// Mercado Pago: pago acreditado al instante. Reemplaza al email de "recibimos tu pedido".
export async function sendMpPaidEmail(order: Order, items: Items) {
  return sendEmail({
    to: order.customerEmail,
    subject: `¡Gracias por tu compra! Pedido #${order.number}`,
    html: layout(
      "¡Pago confirmado!",
      p(`¡Hola ${escapeHtml(order.customerName)}! Recibimos el pago de tu pedido <b>#${order.number}</b> por Mercado Pago.`) +
        p("Te avisamos por email cuando esté listo para retirar.") +
        itemsTable(order, items) +
        pickupInfo() +
        button(orderLink(order), "Ver mi pedido"),
    ),
  });
}

// Mercado Pago: el pago llegó con la reserva ya vencida y sin stock; se devolvió.
export async function sendMpRefundedEmail(order: Order) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Te devolvimos el pago del pedido #${order.number}`,
    html: layout(
      "Te devolvimos el pago",
      p(
        `Tu pago del pedido <b>#${order.number}</b> llegó después de que venciera la reserva, y mientras tanto los productos se vendieron. Ya pedimos la devolución de ${formatPrice(order.total)} a Mercado Pago; según el medio de pago puede tardar unos días en verse.`,
      ) +
        p(`Disculpá las molestias. Escribinos por <a href="${whatsappUrl()}" style="color:${VIOLET}">WhatsApp</a> y vemos alternativas.`),
    ),
  });
}

export async function sendCashConfirmedEmail(order: Order) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Tu pedido #${order.number} está reservado`,
    html: layout(
      "¡Pedido reservado!",
      p(`Te reservamos los productos del pedido <b>#${order.number}</b>. Pagás ${formatPrice(order.total)} en efectivo al retirar.`) +
        pickupInfo() +
        button(orderLink(order), "Ver mi pedido"),
    ),
  });
}

export async function sendReadyForPickupEmail(order: Order) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Tu pedido #${order.number} está listo para retirar`,
    html: layout(
      "¡Tu pedido está listo!",
      p(`Ya podés pasar a retirar tu pedido <b>#${order.number}</b>.`) +
        (order.status === "confirmado" || order.paymentMethod === "efectivo"
          ? p(`Recordá traer ${formatPrice(order.total)} en efectivo.`)
          : "") +
        pickupInfo(),
    ),
  });
}

// ---------- Al admin ----------

export async function sendAdminNewOrderEmail(order: Order, items: Items) {
  return sendEmail({
    to: SITE.notifyEmail,
    subject: `Pedido nuevo #${order.number} — ${PAYMENT_LABELS[order.paymentMethod]}`,
    html: layout(
      `Pedido nuevo #${order.number}`,
      p(
        `${escapeHtml(order.customerName)} · ${escapeHtml(order.customerEmail)} · ${escapeHtml(order.customerPhone)}<br>Pago: ${PAYMENT_LABELS[order.paymentMethod]}`,
      ) +
        itemsTable(order, items) +
        button(`${siteUrl()}/admin/pedidos/${order.id}`, "Ver en el panel"),
    ),
  });
}

export async function sendAdminRefundFailedEmail(order: Order, paymentId: string) {
  return sendEmail({
    to: SITE.notifyEmail,
    subject: `URGENTE: devolver pago del pedido #${order.number}`,
    html: layout(
      `Devolución pendiente — pedido #${order.number}`,
      p(
        `${escapeHtml(order.customerName)} pagó ${formatPrice(order.total)} por Mercado Pago después de que venciera la reserva, y ya no hay stock. La devolución automática falló: hacela a mano desde Mercado Pago (pago <b>${escapeHtml(paymentId)}</b>).`,
      ) + button(`${siteUrl()}/admin/pedidos/${order.id}`, "Ver en el panel"),
    ),
  });
}

type LowStockItem = { name: string; stock: number };

export async function sendAdminLowStockEmail(newItems: LowStockItem[], otherItems: LowStockItem[]) {
  const list = (items: LowStockItem[]) =>
    `<ul style="margin:0 0 16px;padding-left:20px;line-height:1.6">${items
      .map((i) => `<li>${escapeHtml(i.name)} — ${i.stock === 0 ? "<b>agotado</b>" : `queda ${i.stock}`}</li>`)
      .join("")}</ul>`;
  return sendEmail({
    to: SITE.notifyEmail,
    subject: `Stock bajo: ${newItems.length} ${newItems.length === 1 ? "producto nuevo" : "productos nuevos"}`,
    html: layout(
      "Productos con stock bajo",
      p("Desde el último aviso, estos productos se agotaron o les queda 1 unidad:") +
        list(newItems) +
        (otherItems.length ? p("Siguen así desde antes:") + list(otherItems) : "") +
        button(`${siteUrl()}/admin/productos?stock=bajo`, "Ver en el panel"),
    ),
  });
}

export async function sendAdminReceiptEmail(order: Order) {
  return sendEmail({
    to: SITE.notifyEmail,
    subject: `Comprobante recibido — pedido #${order.number}`,
    html: layout(
      `Comprobante del pedido #${order.number}`,
      p(`${escapeHtml(order.customerName)} subió el comprobante de ${formatPrice(order.total)}. Revisalo y confirmá el pago.`) +
        button(`${siteUrl()}/admin/pedidos/${order.id}`, "Revisar en el panel"),
    ),
  });
}

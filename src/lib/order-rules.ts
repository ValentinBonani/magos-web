import type { OrderStatus, PaymentMethod } from "@/db/schema";

// Reglas de negocio de los pedidos (ver docs/requerimientos.md).

// Máximo de unidades por carrito (sumando todos los productos).
export const MAX_CART_UNITS = 6;

// Transferencia: el stock queda reservado 2 hs esperando el comprobante.
export const TRANSFER_RESERVATION_MS = 2 * 60 * 60 * 1000;
// Recordatorio de comprobante a la hora.
export const TRANSFER_REMINDER_AFTER_MS = 60 * 60 * 1000;
// Efectivo: si el cliente no escribe por WhatsApp, se cancela a las 48 hs.
export const CASH_CONFIRMATION_MS = 48 * 60 * 60 * 1000;
// Mercado Pago: stock reservado (y link de pago válido) mientras el cliente paga.
export const MP_RESERVATION_MS = 30 * 60 * 1000;

// Pedidos sin pagar que puede tener abiertos una misma persona (por email o teléfono)
// y una misma conexión (IP). La IP admite más porque en los celulares muchas personas
// comparten la misma.
export const PENDING_STATUSES: OrderStatus[] = ["pendiente_pago", "pendiente_confirmacion", "pendiente_mp"];
export const MAX_PENDING_PER_CONTACT = 1;
export const MAX_PENDING_PER_IP = 3;

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  transferencia: "Transferencia bancaria",
  efectivo: "Efectivo (al retirar)",
  mercadopago: "Mercado Pago",
  tarjeta: "Tarjeta (posnet)",
};

// En el mostrador "efectivo" no es "al retirar".
export const COUNTER_PAYMENT_LABELS: Record<PaymentMethod, string> = {
  ...PAYMENT_LABELS,
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente_pago: "Esperando comprobante",
  comprobante_recibido: "Comprobante recibido",
  pendiente_confirmacion: "Esperando confirmación por WhatsApp",
  pendiente_mp: "Esperando pago en Mercado Pago",
  confirmado: "Confirmado (paga al retirar)",
  pagado: "Pagado",
  listo_para_retirar: "Listo para retirar",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Estados en los que el admin tiene que hacer algo.
export const NEEDS_ATTENTION: OrderStatus[] = [
  "comprobante_recibido",
  "pendiente_confirmacion",
  "confirmado",
  "pagado",
];

export function computeTotals(subtotal: number, discountPercent: number, shippingCost = 0) {
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  return { subtotal, discountPercent, discountAmount, shippingCost, total: subtotal - discountAmount + shippingCost };
}

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// "17/10, 15:30" en horario de Argentina.
export function formatDateTime(date: Date) {
  return dateTimeFormatter.format(date);
}

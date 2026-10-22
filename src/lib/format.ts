const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// 15000 -> "$ 15.000"
export function formatPrice(pesos: number) {
  return priceFormatter.format(pesos);
}

const TIME_ZONE = "America/Argentina/Buenos_Aires";

const longDateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// "sábado, 25 de octubre, 18:00" en horario de Argentina.
export function formatLongDateTime(date: Date) {
  return longDateFormatter.format(date);
}

// Para <input type="datetime-local">: "2026-10-25T18:00" en horario de Argentina.
export function toArgentinaInputValue(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// "2026-10-25T18:00" (hora de Argentina, UTC-3 todo el año) -> Date. Inválido -> null.
export function fromArgentinaInputValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-03:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const priceFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// 15000 -> "$ 15.000"
export function formatPrice(pesos: number) {
  return priceFormatter.format(pesos);
}

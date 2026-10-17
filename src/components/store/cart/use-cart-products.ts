"use client";

import { useEffect, useState } from "react";
import { getCartProducts, type CartProduct } from "@/app/(tienda)/cart-actions";
import type { CartLine } from "./cart-context";

export type CartRow = CartLine & { product: CartProduct };

// Trae del servidor los datos de los productos del carrito y los cruza con las
// cantidades. `missing` = productos que ya no están disponibles.
export function useCartProducts(lines: CartLine[], ready: boolean) {
  const [products, setProducts] = useState<Map<string, CartProduct> | null>(null);
  const idsKey = lines.map((l) => l.productId).sort().join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    getCartProducts(idsKey ? idsKey.split(",") : []).then((rows) => {
      if (!cancelled) setProducts(new Map(rows.map((r) => [r.id, r])));
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey, ready]);

  const loading = !ready || products === null;
  const rows: CartRow[] = [];
  const missing: string[] = [];
  if (products) {
    for (const line of lines) {
      const product = products.get(line.productId);
      if (product) rows.push({ ...line, product });
      else missing.push(line.productId);
    }
  }
  const subtotal = rows.reduce((sum, r) => sum + r.product.price * r.quantity, 0);
  // Hay algún producto con menos stock que lo pedido.
  const stockProblem = rows.some((r) => r.quantity > r.product.stock);

  return { loading, rows, missing, subtotal, stockProblem };
}

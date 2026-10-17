"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { MAX_CART_UNITS } from "@/lib/order-rules";
import { useCart } from "./cart-context";

export function AddToCart({ productId, stock }: { productId: string; stock: number }) {
  const { lines, totalUnits, add, ready } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  // Lo máximo que se puede sumar: lo que queda de stock y del límite del carrito.
  const maxAddable = Math.max(0, Math.min(stock - inCart, MAX_CART_UNITS - totalUnits));
  const qty = Math.min(quantity, Math.max(1, maxAddable));

  function handleAdd() {
    if (add(productId, qty)) {
      setAdded(true);
      setQuantity(1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            className="size-10 text-lg disabled:opacity-40"
            aria-label="Restar"
          >
            −
          </button>
          <span className="w-8 text-center tabular-nums" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(maxAddable, qty + 1))}
            disabled={qty >= maxAddable}
            className="size-10 text-lg disabled:opacity-40"
            aria-label="Sumar"
          >
            +
          </button>
        </div>
        <Button size="lg" className="h-10 flex-1 sm:flex-none" onClick={handleAdd} disabled={!ready || maxAddable === 0}>
          Agregar al carrito
        </Button>
      </div>

      {ready && maxAddable === 0 && (
        <p className="text-sm text-muted-foreground">
          {inCart >= stock
            ? "Ya tenés en el carrito todo el stock disponible."
            : `Llegaste al máximo de ${MAX_CART_UNITS} unidades por pedido.`}
        </p>
      )}
      {added && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-green-700">✓ Agregado al carrito.</span>
          <Link href="/carrito" className={buttonVariants({ variant: "link", className: "h-auto px-0" })}>
            Ver carrito
          </Link>
        </p>
      )}
    </div>
  );
}

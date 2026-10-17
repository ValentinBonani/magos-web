"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/store/cart/cart-context";
import { useCartProducts } from "@/components/store/cart/use-cart-products";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { MAX_CART_UNITS } from "@/lib/order-rules";
import { productImageUrl } from "@/lib/storage";

export function CartView() {
  const { lines, ready, totalUnits, setQuantity, remove } = useCart();
  const { loading, rows, missing, subtotal, stockProblem } = useCartProducts(lines, ready);

  if (loading) return <p className="text-muted-foreground">Cargando…</p>;

  if (rows.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">Tu carrito está vacío.</p>
        <Link href="/juegos-de-mesa" className={buttonVariants()}>
          Ver juegos de mesa
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          Algunos productos ya no están disponibles y no se van a incluir.
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => missing.forEach(remove)}
          >
            Quitarlos
          </button>
        </div>
      )}

      <ul className="divide-y rounded-xl border">
        {rows.map(({ productId, quantity, product }) => {
          const overStock = quantity > product.stock;
          return (
            <li key={productId} className="flex gap-3 p-3 sm:gap-4">
              <Link
                href={`/producto/${product.slug}`}
                className="relative size-20 shrink-0 overflow-hidden rounded-lg border bg-white"
              >
                {product.image && (
                  <Image
                    src={productImageUrl(product.image)}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain p-1"
                  />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <Link href={`/producto/${product.slug}`} className="font-medium hover:underline">
                    {product.name}
                  </Link>
                  <span className="shrink-0 font-semibold">{formatPrice(product.price * quantity)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className="flex items-center rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setQuantity(productId, quantity - 1)}
                      disabled={quantity <= 1}
                      className="size-8 disabled:opacity-40"
                      aria-label="Restar"
                    >
                      −
                    </button>
                    <span className="w-7 text-center tabular-nums">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(productId, quantity + 1)}
                      disabled={quantity >= product.stock || totalUnits >= MAX_CART_UNITS}
                      className="size-8 disabled:opacity-40"
                      aria-label="Sumar"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-muted-foreground">{formatPrice(product.price)} c/u</span>
                  <button
                    type="button"
                    onClick={() => remove(productId)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    Quitar
                  </button>
                </div>
                {overStock && (
                  <p className="text-sm text-destructive">
                    {product.stock === 0
                      ? "Se agotó. Quitalo para continuar."
                      : `Solo quedan ${product.stock}. Bajá la cantidad para continuar.`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex justify-between text-lg font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Pagando con transferencia o en efectivo tenés descuento (lo ves en el próximo paso).
          Máximo {MAX_CART_UNITS} unidades por pedido.
        </p>
        {stockProblem ? (
          <span className={buttonVariants({ size: "lg", className: "pointer-events-none w-full opacity-50" })}>
            Continuar
          </span>
        ) : (
          <Link href="/checkout" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Continuar
          </Link>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCart } from "./cart-context";

export function CartButton() {
  const { totalUnits } = useCart();

  return (
    <Link
      href="/carrito"
      aria-label={totalUnits ? `Carrito (${totalUnits} productos)` : "Carrito"}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.76L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9.5" cy="20" r="1.3" />
        <circle cx="17.5" cy="20" r="1.3" />
      </svg>
      {totalUnits > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {totalUnits}
        </span>
      )}
    </Link>
  );
}

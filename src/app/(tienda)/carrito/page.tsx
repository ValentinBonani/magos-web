import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Carrito — Magos del Sur" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Carrito</h1>
      <CartView />
    </div>
  );
}

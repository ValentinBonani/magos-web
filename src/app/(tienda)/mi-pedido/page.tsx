import type { Metadata } from "next";
import { FindOrderForm } from "./find-order-form";

export const metadata: Metadata = { title: "Mi pedido — Magos del Sur" };

export default function MyOrderPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">Mi pedido</h1>
        <p className="text-muted-foreground">
          Ingresá el número de pedido (está en el email que te mandamos) y tu email.
        </p>
      </div>
      <FindOrderForm />
    </div>
  );
}

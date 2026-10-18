import type { Metadata } from "next";
import { mercadoPagoEnabled } from "@/lib/mercadopago";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Finalizar compra — Magos del Sur" };

export default async function CheckoutPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold">Finalizar compra</h1>
      <CheckoutForm
        transferDiscount={settings.transferDiscountPercent}
        cashDiscount={settings.cashDiscountPercent}
        mercadoPagoEnabled={mercadoPagoEnabled()}
        pickup={{ address: `${SITE.address}, ${SITE.city}`, hours: SITE.hours }}
      />
    </div>
  );
}

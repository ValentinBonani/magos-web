"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useCart } from "@/components/store/cart/cart-context";
import { useCartProducts } from "@/components/store/cart/use-cart-products";
import { Turnstile } from "@/components/store/turnstile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/format";
import { computeTotals } from "@/lib/order-rules";
import { cn } from "@/lib/utils";
import { placeOrder, type CheckoutState } from "./actions";

type Props = {
  transferDiscount: number;
  cashDiscount: number;
  mercadoPagoEnabled: boolean;
  turnstileSiteKey: string | null;
  pickup: { address: string; hours: string[] };
};

type Method = "transferencia" | "efectivo" | "mercadopago";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

export function CheckoutForm({ transferDiscount, cashDiscount, mercadoPagoEnabled, turnstileSiteKey, pickup }: Props) {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const { loading, rows, subtotal, stockProblem } = useCartProducts(lines, ready);
  const [method, setMethod] = useState<Method | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const waitingCaptcha = turnstileSiteKey !== null && captchaToken === null;
  const errors = state.fieldErrors ?? {};

  // Pedido creado: vaciar el carrito e ir a pagar a Mercado Pago o a la página del pedido.
  useEffect(() => {
    if (!state.token) return;
    clear();
    if (state.paymentUrl) window.location.assign(state.paymentUrl);
    else router.replace(`/pedido/${state.token}`);
  }, [state.token, state.paymentUrl, clear, router]);

  if (state.token) {
    return (
      <p className="text-muted-foreground">
        {state.paymentUrl ? "Te llevamos a Mercado Pago para pagar…" : "Listo, te llevamos a tu pedido…"}
      </p>
    );
  }
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
  if (stockProblem) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p>Algún producto del carrito ya no tiene stock suficiente.</p>
        <Link href="/carrito" className={buttonVariants()}>
          Revisar carrito
        </Link>
      </div>
    );
  }

  // Mercado Pago no tiene descuento.
  const percent = method === "transferencia" ? transferDiscount : method === "efectivo" ? cashDiscount : 0;
  const totals = computeTotals(subtotal, percent);

  // onSubmit (y no action=) para que React no vacíe el formulario si hay errores.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("lines", JSON.stringify(rows.map((r) => ({ productId: r.productId, quantity: r.quantity }))));
    if (captchaToken) formData.set("turnstileToken", captchaToken);
    startTransition(() => formAction(formData));
  }

  const methods: { value: Method; title: string; percent: number; description: string }[] = [
    ...(mercadoPagoEnabled
      ? [
          {
            value: "mercadopago" as const,
            title: "Mercado Pago",
            percent: 0,
            description:
              "Tarjeta de crédito, débito o dinero en cuenta. Pagás ahora y el pedido queda confirmado al instante.",
          },
        ]
      : []),
    {
      value: "transferencia",
      title: "Transferencia bancaria",
      percent: transferDiscount,
      description:
        "Te reservamos los productos por 2 horas. Transferís y subís el comprobante desde el link que te mandamos por email.",
    },
    {
      value: "efectivo",
      title: "Efectivo al retirar",
      percent: cashDiscount,
      description:
        "Para reservar tenés que escribirnos por WhatsApp. Hasta que te confirmemos, los productos se pueden vender en el local.",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[1fr_18rem]">
      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border p-4">
          <h2 className="font-semibold">Tus datos</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre y apellido</Label>
            <Input id="name" name="name" autoComplete="name" required />
            <FieldError message={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
              <FieldError message={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="11 1234-5678" required />
              <FieldError message={errors.phone} />
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-xl border p-4">
          <h2 className="font-semibold">Entrega</h2>
          <p className="text-sm">
            <b>Retiro en el local:</b> {pickup.address}
          </p>
          <p className="text-sm text-muted-foreground">{pickup.hours.join(" · ")}</p>
          <p className="text-sm text-muted-foreground">Los envíos a domicilio llegan pronto.</p>
        </section>

        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="px-1 font-semibold">¿Cómo vas a pagar?</legend>
          {methods.map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                method === m.value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={m.value}
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
                className="mt-1 accent-primary"
                required
              />
              <span className="space-y-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {m.title}
                  {m.percent > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {m.percent}% de descuento
                    </span>
                  )}
                </span>
                <span className="block text-sm text-muted-foreground">{m.description}</span>
              </span>
            </label>
          ))}
          <FieldError message={errors.paymentMethod} />
        </fieldset>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border p-4 md:sticky md:top-24">
        <h2 className="font-semibold">Resumen</h2>
        <ul className="space-y-1 text-sm">
          {rows.map((r) => (
            <li key={r.productId} className="flex justify-between gap-2">
              <span>
                {r.quantity} × {r.product.name}
              </span>
              <span className="shrink-0">{formatPrice(r.product.price * r.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatPrice(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Descuento {totals.discountPercent}%</span>
              <span>− {formatPrice(totals.discountAmount)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between border-t pt-3 text-lg font-semibold">
          <span>Total</span>
          <span>{formatPrice(totals.total)}</span>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        {/* Cada respuesta del servidor usa el token: se pide uno nuevo. */}
        {turnstileSiteKey && <Turnstile siteKey={turnstileSiteKey} onToken={setCaptchaToken} resetKey={state} />}
        <Button type="submit" size="lg" className="w-full" disabled={pending || waitingCaptcha}>
          {pending
            ? "Enviando pedido…"
            : waitingCaptcha
              ? "Verificando…"
              : method === "mercadopago"
                ? "Ir a pagar"
                : "Confirmar pedido"}
        </Button>
        <Link href="/carrito" className="block text-center text-sm text-muted-foreground hover:underline">
          Volver al carrito
        </Link>
      </aside>
    </form>
  );
}

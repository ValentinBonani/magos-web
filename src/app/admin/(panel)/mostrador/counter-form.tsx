"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTER_PAYMENT_METHODS, type CounterPaymentMethod } from "@/db/schema";
import { formatPrice } from "@/lib/format";
import { computeTotals, COUNTER_PAYMENT_LABELS } from "@/lib/order-rules";
import { cn } from "@/lib/utils";
import { registerSale, type SaleResult } from "./actions";

type Product = { id: string; name: string; price: number; stock: number; active: boolean };

// Sin acentos ni mayúsculas, para buscar "catan" y encontrar "Catán".
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const MAX_RESULTS = 8;

export function CounterForm({
  products,
  transferDiscount,
  cashDiscount,
}: {
  products: Product[];
  transferDiscount: number;
  cashDiscount: number;
}) {
  const [query, setQuery] = useState("");
  const [ticket, setTicket] = useState<{ productId: string; quantity: number }[]>([]);
  const [method, setMethod] = useState<CounterPaymentMethod | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [result, setResult] = useState<SaleResult>({});
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  const byId = new Map(products.map((p) => [p.id, p]));
  const inTicket = (id: string) => ticket.find((l) => l.productId === id)?.quantity ?? 0;

  const words = normalize(query).split(/\s+/).filter(Boolean);
  const matches =
    words.length === 0
      ? []
      : products.filter((p) => words.every((w) => normalize(p.name).includes(w))).slice(0, MAX_RESULTS);

  function add(product: Product) {
    if (inTicket(product.id) >= product.stock) return;
    setResult({});
    setTicket((current) =>
      current.some((l) => l.productId === product.id)
        ? current.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...current, { productId: product.id, quantity: 1 }],
    );
    setQuery("");
    searchRef.current?.focus();
  }

  function setQuantity(productId: string, quantity: number) {
    setTicket((current) =>
      quantity <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    );
  }

  const subtotal = ticket.reduce((sum, l) => sum + (byId.get(l.productId)?.price ?? 0) * l.quantity, 0);
  const percent = method === "efectivo" ? cashDiscount : method === "transferencia" ? transferDiscount : 0;
  const totals = computeTotals(subtotal, percent);

  function submit() {
    if (!method || ticket.length === 0) return;
    startTransition(async () => {
      const r = await registerSale({ lines: ticket, paymentMethod: method, customerName });
      setResult(r);
      if (r.sale) {
        setTicket([]);
        setMethod(null);
        setCustomerName("");
        searchRef.current?.focus();
      }
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="relative">
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter agrega el primer resultado con stock.
              if (e.key === "Enter") {
                e.preventDefault();
                const first = matches.find((p) => inTicket(p.id) < p.stock);
                if (first) add(first);
              }
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Buscar producto por nombre…"
            autoFocus
            className="h-11 text-base"
          />
          {words.length > 0 && (
            <ul className="absolute inset-x-0 top-full z-10 mt-1 divide-y rounded-lg border bg-background shadow-lg">
              {matches.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</li>}
              {matches.map((p) => {
                const left = p.stock - inTicket(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => add(p)}
                      disabled={left <= 0}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex-1">
                        {p.name}
                        {!p.active && <span className="ml-2 text-xs text-muted-foreground">(oculto en la web)</span>}
                      </span>
                      <span className="text-muted-foreground">{left <= 0 ? "sin stock" : `stock ${left}`}</span>
                      <span className="w-24 text-right font-medium">{formatPrice(p.price)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {ticket.length === 0 ? (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            Buscá los productos y tocá Enter (o hacé clic) para agregarlos.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {ticket.map((line) => {
              const product = byId.get(line.productId)!;
              return (
                <li key={line.productId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1">{product.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon-sm" onClick={() => setQuantity(line.productId, line.quantity - 1)} aria-label="Restar">
                      −
                    </Button>
                    <span className="w-6 text-center">{line.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      disabled={line.quantity >= product.stock}
                      aria-label="Sumar"
                    >
                      +
                    </Button>
                  </div>
                  <span className="w-24 text-right">{formatPrice(product.price * line.quantity)}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(line.productId, 0)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="h-fit space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Medio de pago</p>
          <div className="grid grid-cols-3 gap-2">
            {COUNTER_PAYMENT_METHODS.map((m) => {
              const off = m === "efectivo" ? cashDiscount : m === "transferencia" ? transferDiscount : 0;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm transition-colors",
                    method === m ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50",
                  )}
                >
                  {COUNTER_PAYMENT_LABELS[m]}
                  {off > 0 && <span className="block text-xs text-muted-foreground">−{off}%</span>}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Cliente (opcional)"
          maxLength={100}
        />

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
          <div className="flex justify-between pt-1 text-lg font-semibold">
            <span>A cobrar</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
        </div>

        <Button size="lg" className="w-full" disabled={pending || !method || ticket.length === 0} onClick={submit}>
          {pending ? "Registrando…" : !method && ticket.length > 0 ? "Elegí el medio de pago" : "Registrar venta"}
        </Button>

        {result.error && <p className="text-sm text-destructive">{result.error}</p>}
        {result.sale && (
          <p className="text-sm text-green-700">
            Venta{" "}
            <Link href={`/admin/pedidos/${result.sale.id}`} className="underline">
              #{result.sale.number}
            </Link>{" "}
            registrada: {formatPrice(result.sale.total)}.
          </p>
        )}
      </aside>
    </div>
  );
}

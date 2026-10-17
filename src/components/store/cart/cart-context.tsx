"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { MAX_CART_UNITS } from "@/lib/order-rules";

// Carrito guardado en el navegador (localStorage). Solo guarda ids y cantidades;
// precios, nombres y stock se consultan siempre al servidor.

export type CartLine = { productId: string; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  totalUnits: number;
  // false durante el render del servidor / antes de leer el navegador.
  ready: boolean;
  // Devuelve false si se pasaría del máximo de unidades.
  add: (productId: string, quantity?: number) => boolean;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

// ---------- Store sobre localStorage ----------

const STORAGE_KEY = "magos-cart";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
// Respaldo si localStorage no está disponible (navegación privada, bloqueado).
let memoryRaw = "[]";
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY;

function readRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return memoryRaw;
  }
}

function parse(raw: string): CartLine[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (l): l is CartLine =>
        typeof l?.productId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0,
    );
  } catch {
    return EMPTY;
  }
}

// Devuelve siempre el mismo array mientras no cambie el contenido guardado.
function getSnapshot() {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parse(raw);
  }
  return cachedLines;
}

function write(lines: CartLine[]) {
  const raw = JSON.stringify(lines.filter((l) => l.quantity > 0));
  memoryRaw = raw;
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Cambios hechos en otras pestañas.
  const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

// ---------- Contexto ----------

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const value = useMemo<CartContextValue>(() => {
    const totalUnits = lines.reduce((sum, l) => sum + l.quantity, 0);
    return {
      lines,
      totalUnits,
      ready,
      add: (productId, quantity = 1) => {
        const current = getSnapshot();
        if (current.reduce((s, l) => s + l.quantity, 0) + quantity > MAX_CART_UNITS) return false;
        const existing = current.find((l) => l.productId === productId);
        write(
          existing
            ? current.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l))
            : [...current, { productId, quantity }],
        );
        return true;
      },
      setQuantity: (productId, quantity) => {
        const current = getSnapshot();
        const others = current.filter((l) => l.productId !== productId).reduce((s, l) => s + l.quantity, 0);
        const capped = Math.max(0, Math.min(quantity, MAX_CART_UNITS - others));
        write(current.map((l) => (l.productId === productId ? { ...l, quantity: capped } : l)));
      },
      remove: (productId) => write(getSnapshot().filter((l) => l.productId !== productId)),
      clear: () => write([]),
    };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart tiene que usarse dentro de <CartProvider>");
  return ctx;
}

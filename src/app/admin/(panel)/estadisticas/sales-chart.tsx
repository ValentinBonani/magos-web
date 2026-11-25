"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { ChartBar } from "@/lib/stats";

// Colores validados para daltonismo (web = azul, mostrador = naranja).
const SERIES = [
  { key: "web", label: "Web", color: "#2a78d6" },
  { key: "mostrador", label: "Mostrador", color: "#eb6834" },
] as const;

const HEIGHT = 220;
const MAX_X_LABELS = 8;

// Escala "linda" para el eje: 3 líneas en múltiplos de 1, 2 o 5.
function niceMax(value: number) {
  if (value <= 0) return 1000;
  const step = value / 3;
  const magnitude = 10 ** Math.floor(Math.log10(step));
  const nice = [1, 2, 5, 10].find((m) => m * magnitude >= step)! * magnitude;
  return nice * 3;
}

const compact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

export function SalesChart({ bars, unit }: { bars: ChartBar[]; unit: "dia" | "mes" }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...bars.map((b) => b.web + b.mostrador)));
  const ticks = [max / 3, (2 * max) / 3, max];
  const labelEvery = Math.ceil(bars.length / MAX_X_LABELS);
  const current = active === null ? null : bars[active];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Ventas por {unit === "mes" ? "mes" : "día"}</h2>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {/* Eje Y */}
        <div className="relative w-12 shrink-0 text-right text-xs text-muted-foreground" style={{ height: HEIGHT }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%` }}>
              $ {compact.format(t)}
            </span>
          ))}
          <span className="absolute right-0 bottom-0 translate-y-1/2">$ 0</span>
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="relative" style={{ height: HEIGHT }} onMouseLeave={() => setActive(null)}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-border/60" style={{ bottom: `${(t / max) * 100}%` }} />
            ))}
            <div className="absolute inset-x-0 bottom-0 border-t border-border" />

            <div className="absolute inset-0 flex items-end gap-px sm:gap-0.5">
              {bars.map((b, i) => (
                <div
                  key={b.key}
                  className="flex h-full min-w-0 flex-1 cursor-default flex-col justify-end gap-0.5"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                  style={{ opacity: active === null || active === i ? 1 : 0.55 }}
                >
                  {b.mostrador > 0 && (
                    <div
                      className="rounded-t-[4px]"
                      style={{ height: `${(b.mostrador / max) * 100}%`, background: SERIES[1].color }}
                    />
                  )}
                  {b.web > 0 && (
                    <div
                      className={b.mostrador > 0 ? "" : "rounded-t-[4px]"}
                      style={{ height: `${(b.web / max) * 100}%`, background: SERIES[0].color }}
                    />
                  )}
                </div>
              ))}
            </div>

            {current && active !== null && (
              <div
                className="pointer-events-none absolute top-0 z-10 w-44 rounded-lg border bg-popover p-2 text-xs shadow-md"
                style={
                  active < bars.length / 2
                    ? { left: `calc(${((active + 1) / bars.length) * 100}% + 4px)` }
                    : { right: `calc(${((bars.length - active) / bars.length) * 100}% + 4px)` }
                }
              >
                <p className="mb-1 font-medium">{current.label}</p>
                {SERIES.map((s) => (
                  <p key={s.key} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2 rounded-sm" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span>{formatPrice(current[s.key])}</span>
                  </p>
                ))}
                <p className="mt-1 flex justify-between border-t pt-1 font-medium">
                  <span>Total</span>
                  <span>{formatPrice(current.web + current.mostrador)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Eje X: algunas fechas */}
          <div className="relative mt-1 h-4 text-xs text-muted-foreground">
            {bars.map((b, i) =>
              i % labelEvery === 0 ? (
                <span
                  key={b.key}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${((i + 0.5) / bars.length) * 100}%` }}
                >
                  {b.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Ver como tabla</summary>
        <table className="mt-2 w-full max-w-md text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1 font-medium">{unit === "mes" ? "Mes" : "Día"}</th>
              <th className="py-1 text-right font-medium">Web</th>
              <th className="py-1 text-right font-medium">Mostrador</th>
              <th className="py-1 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((b) => (
              <tr key={b.key} className="border-b last:border-0">
                <td className="py-1">{b.label}</td>
                <td className="py-1 text-right">{formatPrice(b.web)}</td>
                <td className="py-1 text-right">{formatPrice(b.mostrador)}</td>
                <td className="py-1 text-right font-medium">{formatPrice(b.web + b.mostrador)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

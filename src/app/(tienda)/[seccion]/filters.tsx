"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  basePath: string;
  categories: { slug: string; name: string }[];
  publishers: string[];
  showGameFilters: boolean;
  current: { categoria?: string; editorial?: string; jugadores?: string; edad?: string };
};

const PLAYER_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);
const AGE_OPTIONS = [3, 6, 8, 10, 12, 14, 16, 18];

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Filtros como formulario GET: cada cambio actualiza la URL (se puede compartir el link).
// Sin JavaScript funciona igual con el botón "Filtrar".
export function Filters({ basePath, categories, publishers, showGameFilters, current }: Props) {
  const router = useRouter();
  const hasFilters = Object.values(current).some(Boolean);

  function apply(form: HTMLFormElement) {
    const sp = new URLSearchParams();
    for (const [key, value] of new FormData(form)) if (value) sp.set(key, String(value));
    const qs = sp.toString();
    router.push(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  return (
    <form
      action={basePath}
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <label className="space-y-1 text-sm">
        <span className="font-medium">Categoría</span>
        <select name="categoria" defaultValue={current.categoria ?? ""} className={selectClass}>
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {showGameFilters && (
        <>
          <label className="space-y-1 text-sm">
            <span className="font-medium">¿Para cuántos jugadores?</span>
            <select name="jugadores" defaultValue={current.jugadores ?? ""} className={selectClass}>
              <option value="">Cualquiera</option>
              {PLAYER_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "jugador" : "jugadores"}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Edad</span>
            <select name="edad" defaultValue={current.edad ?? ""} className={selectClass}>
              <option value="">Cualquiera</option>
              {AGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Para {n} años o más
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">Editorial</span>
            <select name="editorial" defaultValue={current.editorial ?? ""} className={selectClass}>
              <option value="">Todas</option>
              {publishers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <noscript>
        <button type="submit" className="h-9 rounded-lg border px-3 text-sm">
          Filtrar
        </button>
      </noscript>

      {hasFilters && (
        <Link href={basePath} className="col-span-full text-sm text-primary hover:underline">
          Limpiar filtros
        </Link>
      )}
    </form>
  );
}

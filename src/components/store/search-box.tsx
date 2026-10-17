"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type Suggestion = {
  slug: string;
  name: string;
  price: number;
  inStock: boolean;
  image: string | null;
};

const MIN_CHARS = 3;

export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const term = query.trim();

  // Busca 250 ms después de que se deja de escribir.
  useEffect(() => {
    if (term.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        setResults(await res.json());
        setActive(-1);
        setOpen(true);
      } catch {
        // Búsqueda cancelada o sin conexión: no mostrar nada.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // Cerrar al hacer clic afuera.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const showList = open && term.length >= MIN_CHARS;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(`/producto/${results[active].slug}`);
    }
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        action="/buscar"
        onSubmit={(e) => {
          e.preventDefault();
          if (term) go(`/buscar?q=${encodeURIComponent(term)}`);
        }}
      >
        <input
          type="search"
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar juegos…"
          aria-label="Buscar productos"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          autoComplete="off"
          className="h-9 w-full rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </form>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-popover shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No encontramos productos con &quot;{term}&quot;.
            </li>
          ) : (
            <>
              {results.map((r, i) => (
                <li key={r.slug} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(`/producto/${r.slug}`)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
                      i === active && "bg-muted",
                    )}
                  >
                    <span className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                      {r.image && (
                        <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </span>
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className={cn("shrink-0", !r.inStock && "text-muted-foreground")}>
                      {r.inStock ? formatPrice(r.price) : "Agotado"}
                    </span>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(`/buscar?q=${encodeURIComponent(term)}`)}
                  className="w-full border-t px-4 py-2 text-left text-sm text-primary hover:bg-muted"
                >
                  Ver todos los resultados
                </button>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}

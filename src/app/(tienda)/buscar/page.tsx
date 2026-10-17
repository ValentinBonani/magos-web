import type { Metadata } from "next";
import { Pagination } from "@/components/store/pagination";
import { ProductGrid } from "@/components/store/product-card";
import { listProducts } from "@/lib/catalog";

export const metadata: Metadata = { title: "Buscar — Magos del Sur" };

export default async function SearchPage({ searchParams }: PageProps<"/buscar">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const page = Number(sp.pagina) || 1;

  const result = q ? await listProducts({ q, page }) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        {q ? <>Resultados para &quot;{q}&quot;</> : "Buscar"}
      </h1>
      {!result ? (
        <p className="text-muted-foreground">Escribí el nombre de un juego en el buscador.</p>
      ) : result.items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No encontramos productos con &quot;{q}&quot;.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total === 1 ? "1 producto" : `${result.total} productos`}
          </p>
          <ProductGrid products={result.items} />
          <Pagination basePath="/buscar" params={{ q }} page={result.page} pageCount={result.pageCount} />
        </>
      )}
    </div>
  );
}

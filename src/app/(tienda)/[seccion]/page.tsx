import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/store/pagination";
import { ProductGrid } from "@/components/store/product-card";
import { SECTION_LABELS, SECTIONS, type Section } from "@/db/schema";
import { listProducts, sectionFilterOptions } from "@/lib/catalog";
import { Filters } from "./filters";

function parseSection(value: string): Section | null {
  return SECTIONS.includes(value as Section) ? (value as Section) : null;
}

const str = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
const posInt = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 1000 ? n : undefined;
};

export async function generateMetadata({ params }: PageProps<"/[seccion]">): Promise<Metadata> {
  const section = parseSection((await params).seccion);
  return section ? { title: `${SECTION_LABELS[section]} — Magos del Sur` } : {};
}

export default async function SectionPage({ params, searchParams }: PageProps<"/[seccion]">) {
  const section = parseSection((await params).seccion);
  if (!section) notFound();

  const sp = await searchParams;
  const current = {
    categoria: str(sp.categoria),
    editorial: str(sp.editorial),
    jugadores: str(sp.jugadores),
    edad: str(sp.edad),
  };
  // Jugadores, edad y editorial aplican a juegos de mesa (no a Magic ni Pokémon).
  const isBoardGames = section === "juegos-de-mesa";

  const [options, result] = await Promise.all([
    sectionFilterOptions(section),
    listProducts({
      section,
      category: current.categoria,
      publisher: isBoardGames ? current.editorial : undefined,
      players: isBoardGames ? posInt(current.jugadores) : undefined,
      age: isBoardGames ? posInt(current.edad) : undefined,
      page: posInt(str(sp.pagina)),
    }),
  ]);

  const basePath = `/${section}`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{SECTION_LABELS[section]}</h1>
      <Filters
        basePath={basePath}
        categories={options.categories}
        publishers={options.publishers}
        showGameFilters={isBoardGames}
        current={current}
      />
      <p className="text-sm text-muted-foreground">
        {result.total === 1 ? "1 producto" : `${result.total} productos`}
      </p>
      {result.items.length > 0 ? (
        <ProductGrid products={result.items} />
      ) : (
        <p className="py-16 text-center text-muted-foreground">
          No hay productos con estos filtros.
        </p>
      )}
      <Pagination
        basePath={basePath}
        params={isBoardGames ? current : { categoria: current.categoria }}
        page={result.page}
        pageCount={result.pageCount}
      />
    </div>
  );
}

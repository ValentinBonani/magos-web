import Image from "next/image";
import Link from "next/link";
import { ProductGrid } from "@/components/store/product-card";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_LABELS, SECTIONS } from "@/db/schema";
import { latestProducts } from "@/lib/catalog";
import { mapsUrl, SITE } from "@/lib/site";

const SECTION_BLURBS: Record<(typeof SECTIONS)[number], string> = {
  "juegos-de-mesa": "Estrategia, familiares, party y mucho más.",
  magic: "Sobres y mazos de Magic: The Gathering.",
  pokemon: "Sobres y mazos de Pokémon TCG.",
};

export default async function Home() {
  const latest = await latestProducts(8);

  return (
    <div className="space-y-12">
      <section className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-b from-primary/10 to-transparent px-4 py-10 text-center sm:py-14">
        <Image
          src="/logo.png"
          alt="Magos del Sur"
          width={1200}
          height={812}
          priority
          className="h-auto w-full max-w-xs sm:max-w-sm"
        />
        <p className="max-w-md text-lg text-muted-foreground">{SITE.tagline}.</p>
        <Link href="/juegos-de-mesa" className={buttonVariants({ size: "lg" })}>
          Ver juegos de mesa
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s}
            href={`/${s}`}
            className="group rounded-xl border bg-card p-5 transition-colors hover:border-primary"
          >
            <h2 className="text-lg font-semibold group-hover:text-primary">
              {SECTION_LABELS[s]} →
            </h2>
            <p className="text-sm text-muted-foreground">{SECTION_BLURBS[s]}</p>
          </Link>
        ))}
      </section>

      {latest.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Últimos ingresos</h2>
          <ProductGrid products={latest} />
        </section>
      )}

      <section className="grid gap-4 rounded-2xl border p-6 sm:grid-cols-2">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Visitanos en el local</h2>
          <p>
            <a href={mapsUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
              {SITE.address}, {SITE.city}
            </a>
          </p>
        </div>
        <div className="space-y-1 text-muted-foreground sm:text-right">
          {SITE.hours.map((h) => (
            <p key={h}>{h}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

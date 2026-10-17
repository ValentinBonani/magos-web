import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/store/cart/add-to-cart";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_LABELS } from "@/db/schema";
import { getProductBySlug } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/storage";
import { whatsappUrl } from "@/lib/site";
import { Gallery } from "./gallery";

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: `${product.name} — Magos del Sur`,
    description: product.description.slice(0, 160),
    openGraph: product.images[0] ? { images: [productImageUrl(product.images[0])] } : undefined,
  };
}

function playersText(min: number | null, max: number | null) {
  if (min && max) return min === max ? `${min}` : `${min} a ${max}`;
  if (min) return `${min} o más`;
  if (max) return `Hasta ${max}`;
  return null;
}

export default async function ProductPage({ params }: PageProps<"/producto/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const soldOut = product.stock === 0;
  const players = playersText(product.minPlayers, product.maxPlayers);
  const specs = [
    players && { label: "Jugadores", value: players },
    product.minAge && { label: "Edad", value: `${product.minAge}+ años` },
    product.publisher && { label: "Editorial", value: product.publisher },
  ].filter(Boolean) as { label: string; value: string }[];

  const sectionHref = `/${product.section}`;

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted-foreground" aria-label="Ubicación">
        <Link href={sectionHref} className="hover:text-foreground">
          {SECTION_LABELS[product.section]}
        </Link>
        {" / "}
        <Link href={`${sectionHref}?categoria=${product.categorySlug}`} className="hover:text-foreground">
          {product.categoryName}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={product.images} name={product.name} soldOut={soldOut} />

        <div className="space-y-5">
          <h1 className="text-2xl font-semibold sm:text-3xl">{product.name}</h1>
          <p className="text-3xl font-bold text-primary">{formatPrice(product.price)}</p>

          {soldOut ? (
            <p className="font-medium text-destructive">Agotado</p>
          ) : (
            <p className="font-medium text-green-700">
              {product.stock === 1 ? "¡Última unidad!" : "Disponible"}
            </p>
          )}

          {soldOut ? (
            <a
              href={whatsappUrl(`¡Hola! Quería saber si va a volver a entrar "${product.name}".`)}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
            >
              Consultar por WhatsApp si vuelve
            </a>
          ) : (
            <>
              <AddToCart productId={product.id} stock={product.stock} />
              <a
                href={whatsappUrl(`¡Hola! Tengo una consulta sobre "${product.name}".`)}
                target="_blank"
                rel="noopener"
                className="inline-block text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                ¿Dudas? Consultanos por WhatsApp
              </a>
            </>
          )}

          {specs.length > 0 && (
            <dl className="grid grid-cols-3 gap-3 rounded-xl border p-4 text-sm">
              {specs.map((s) => (
                <div key={s.label}>
                  <dt className="text-muted-foreground">{s.label}</dt>
                  <dd className="font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="space-y-2">
            <h2 className="font-semibold">Descripción</h2>
            <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

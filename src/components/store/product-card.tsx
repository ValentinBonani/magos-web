import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: ProductCardData }) {
  const soldOut = product.stock === 0;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    >
      {/* Cuadrado fijo; la foto entra entera (sin recortar la caja) sobre fondo blanco. */}
      <div className="relative aspect-square bg-white">
        {product.image && (
          <Image
            src={productImageUrl(product.image)}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className={cn(
              "object-contain p-3 transition-transform duration-300 group-hover:scale-105",
              soldOut && "opacity-60 grayscale-[40%]",
            )}
          />
        )}
        {soldOut && (
          <span className="absolute inset-x-0 top-3 bg-[var(--brand-black)]/85 py-1 text-center text-sm font-semibold tracking-wide text-white uppercase">
            Agotado
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t p-3">
        {/* Siempre 2 renglones de alto, para que los precios queden alineados. */}
        <h3 className="line-clamp-2 min-h-10 text-sm leading-5 font-medium">{product.name}</h3>
        <p className={cn("mt-auto font-semibold text-primary", soldOut && "text-muted-foreground")}>
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <li key={p.id} className="flex">
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

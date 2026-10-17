import { and, asc, count, desc, eq, gte, isNotNull, lte, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { categories, productImages, products, type Section } from "@/db/schema";

// Consultas de la tienda pública. Solo muestran productos visibles (active).

export const PAGE_SIZE = 24;

// Con stock primero, después agotados; dentro de cada grupo, lo último cargado primero.
const storeOrder = [desc(sql`${products.stock} > 0`), desc(products.createdAt)];

// Búsqueda por nombre sin distinguir mayúsculas ni acentos.
function nameMatches(q: string) {
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return sql`extensions.unaccent(${products.name}) ilike extensions.unaccent(${pattern})`;
}

const cardFields = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  price: products.price,
  stock: products.stock,
  image: productImages.path,
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
};

function cardQuery() {
  return db
    .select(cardFields)
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.position, 0)),
    );
}

export type ProductFilters = {
  section?: Section;
  category?: string; // slug
  publisher?: string;
  players?: number; // "¿para cuántos jugadores?"
  age?: number; // "para X años o más"
  q?: string;
  page?: number;
};

export async function listProducts(filters: ProductFilters) {
  const conditions: (SQL | undefined)[] = [
    eq(products.active, true),
    filters.section ? eq(categories.section, filters.section) : undefined,
    filters.category ? eq(categories.slug, filters.category) : undefined,
    filters.publisher ? eq(products.publisher, filters.publisher) : undefined,
    // Juegos donde entra esa cantidad de jugadores (los que no tienen el dato no aparecen).
    filters.players ? lte(products.minPlayers, filters.players) : undefined,
    filters.players ? gte(products.maxPlayers, filters.players) : undefined,
    filters.age ? lte(products.minAge, filters.age) : undefined,
    filters.q ? nameMatches(filters.q) : undefined,
  ];
  const where = and(...conditions);
  const page = Math.max(1, filters.page ?? 1);

  const [items, [{ total }]] = await Promise.all([
    cardQuery()
      .where(where)
      .orderBy(...storeOrder)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where),
  ]);

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function latestProducts(limit: number) {
  return cardQuery()
    .where(eq(products.active, true))
    .orderBy(...storeOrder)
    .limit(limit);
}

// Sugerencias del buscador (cabecera).
export async function searchSuggestions(q: string, limit = 6) {
  return cardQuery()
    .where(and(eq(products.active, true), nameMatches(q)))
    .orderBy(...storeOrder)
    .limit(limit);
}

// Opciones de los filtros de una sección.
export async function sectionFilterOptions(section: Section) {
  const [categoryRows, publisherRows] = await Promise.all([
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .where(eq(categories.section, section))
      .orderBy(asc(categories.name)),
    db
      .selectDistinct({ publisher: products.publisher })
      .from(products)
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(
        and(
          eq(categories.section, section),
          eq(products.active, true),
          isNotNull(products.publisher),
        ),
      )
      .orderBy(asc(products.publisher)),
  ]);

  return {
    categories: categoryRows,
    publishers: publisherRows.map((r) => r.publisher!),
  };
}

// cache(): la ficha y su metadata comparten la misma consulta por request.
export const getProductBySlug = cache(async (slug: string) => {
  const [product] = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      description: products.description,
      price: products.price,
      stock: products.stock,
      minPlayers: products.minPlayers,
      maxPlayers: products.maxPlayers,
      minAge: products.minAge,
      publisher: products.publisher,
      section: categories.section,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.active, true)))
    .limit(1);
  if (!product) return null;

  const images = await db
    .select({ path: productImages.path })
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.position));

  return { ...product, images: images.map((i) => i.path) };
});

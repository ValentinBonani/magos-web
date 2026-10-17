import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Todas las tablas tienen RLS activado y sin políticas: la API pública de Supabase
// (clave publishable) no puede leerlas ni escribirlas. La web accede por conexión
// directa a Postgres, que no pasa por RLS.

export const SECTIONS = ["juegos-de-mesa", "magic", "pokemon"] as const;
export type Section = (typeof SECTIONS)[number];

export const SECTION_LABELS: Record<Section, string> = {
  "juegos-de-mesa": "Juegos de mesa",
  magic: "Magic",
  pokemon: "Pokémon",
};

export const sectionEnum = pgEnum("section", SECTIONS);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    section: sectionEnum("section").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("categories_section_slug_idx").on(t.section, t.slug)],
).enableRLS();

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    // Precio en pesos argentinos, sin centavos.
    price: integer("price").notNull(),
    stock: integer("stock").notNull().default(0),
    minPlayers: integer("min_players"),
    maxPlayers: integer("max_players"),
    minAge: integer("min_age"),
    publisher: text("publisher"),
    // Oculto = no se muestra en la tienda (baja lógica).
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_created_at_idx").on(t.createdAt),
    check("products_price_positive", sql`${t.price} > 0`),
    check("products_stock_non_negative", sql`${t.stock} >= 0`),
    check(
      "products_players_range",
      sql`${t.minPlayers} is null or ${t.maxPlayers} is null or ${t.minPlayers} <= ${t.maxPlayers}`,
    ),
  ],
).enableRLS();

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Ruta dentro del bucket "product-images" de Supabase Storage.
    path: text("path").notNull(),
    // Orden de las fotos; la 0 es la principal.
    position: integer("position").notNull(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
).enableRLS();

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;

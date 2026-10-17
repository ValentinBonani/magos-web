"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { productImages, products } from "@/db/schema";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  image: string | null;
};

// Datos actuales de los productos del carrito (precio y stock pueden haber cambiado).
// Los que ya no existen o están ocultos no vuelven.
export async function getCartProducts(ids: string[]): Promise<CartProduct[]> {
  const parsed = z.array(z.uuid()).max(20).safeParse(ids);
  if (!parsed.success || parsed.data.length === 0) return [];

  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      price: products.price,
      stock: products.stock,
      image: productImages.path,
    })
    .from(products)
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.position, 0)),
    )
    .where(and(inArray(products.id, parsed.data), eq(products.active, true)));
}

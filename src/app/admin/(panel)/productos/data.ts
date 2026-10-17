import { asc, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

// Datos que necesita el formulario de producto.
export async function getProductFormData() {
  const [categoryRows, publisherRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, section: categories.section })
      .from(categories)
      .orderBy(asc(categories.name)),
    db
      .selectDistinct({ publisher: products.publisher })
      .from(products)
      .where(isNotNull(products.publisher))
      .orderBy(asc(products.publisher)),
  ]);

  return {
    categories: categoryRows,
    publishers: publisherRows.map((r) => r.publisher!),
  };
}

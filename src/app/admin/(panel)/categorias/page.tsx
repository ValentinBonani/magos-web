import { asc, count, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { categories, products, SECTION_LABELS, SECTIONS } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { CategoryRow, NewCategoryForm } from "./category-forms";

export default async function CategoriesPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: categories.id,
      section: categories.section,
      name: categories.name,
      productCount: count(products.id),
    })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Categorías</h1>
        <p className="text-sm text-muted-foreground">
          Cada sección de la tienda tiene sus propias categorías. Solo se puede
          borrar una categoría si no tiene productos.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle>{SECTION_LABELS[section]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2">
                {rows
                  .filter((c) => c.section === section)
                  .map((c) => (
                    <CategoryRow
                      key={c.id}
                      id={c.id}
                      name={c.name}
                      productCount={c.productCount}
                    />
                  ))}
              </ul>
              <NewCategoryForm section={section} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

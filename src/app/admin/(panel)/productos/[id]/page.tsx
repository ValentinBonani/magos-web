import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { updateProduct } from "../actions";
import { getProductFormData } from "../data";
import { ProductForm } from "../product-form";
import { DeleteProductButton } from "./delete-button";

export default async function EditProductPage({ params }: PageProps<"/admin/productos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [[product], images, { categories, publishers }] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)).limit(1),
    db
      .select({ path: productImages.path })
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    getProductFormData(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Editar producto</h1>
        <DeleteProductButton id={product.id} name={product.name} />
      </div>
      <ProductForm
        action={updateProduct.bind(null, product.id)}
        categories={categories}
        publishers={publishers}
        product={product}
        imagePaths={images.map((i) => i.path)}
      />
    </div>
  );
}

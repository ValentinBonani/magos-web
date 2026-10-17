import { requireAdmin } from "@/lib/auth";
import { createProduct } from "../actions";
import { getProductFormData } from "../data";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  await requireAdmin();
  const { categories, publishers } = await getProductFormData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <ProductForm action={createProduct} categories={categories} publishers={publishers} />
    </div>
  );
}

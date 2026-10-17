import { and, desc, eq, sql } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import {
  categories,
  productImages,
  products,
  SECTION_LABELS,
  SECTIONS,
  type Section,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { productImageUrl } from "@/lib/storage";

export default async function ProductsPage({ searchParams }: PageProps<"/admin/productos">) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const section = SECTIONS.includes(params.seccion as Section)
    ? (params.seccion as Section)
    : undefined;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stock: products.stock,
      active: products.active,
      section: categories.section,
      category: categories.name,
      image: productImages.path,
    })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.position, 0)),
    )
    .where(
      and(
        q
          ? sql`extensions.unaccent(${products.name}) ilike extensions.unaccent(${`%${q.replace(/[%_\\]/g, "\\$&")}%`})`
          : undefined,
        section ? eq(categories.section, section) : undefined,
      ),
    )
    .orderBy(desc(products.createdAt));

  const filterHref = (s?: Section) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (s) sp.set("seccion", s);
    const qs = sp.toString();
    return `/admin/productos${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Link href="/admin/productos/nuevo" className={buttonVariants()}>
          + Nuevo producto
        </Link>
      </div>

      {params.guardado && (
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm">Producto guardado.</p>
      )}
      {params.borrado && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">Producto borrado.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form className="flex gap-2">
          {section && <input type="hidden" name="seccion" value={section} />}
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre…" className="w-56" />
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Buscar
          </button>
        </form>
        <div className="flex flex-wrap gap-1">
          <Link
            href={filterHref()}
            className={buttonVariants({ variant: section ? "ghost" : "secondary", size: "sm" })}
          >
            Todas
          </Link>
          {SECTIONS.map((s) => (
            <Link
              key={s}
              href={filterHref(s)}
              className={buttonVariants({ variant: section === s ? "secondary" : "ghost", size: "sm" })}
            >
              {SECTION_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          {q || section ? "No hay productos con ese filtro." : "Todavía no cargaste productos."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="relative size-12 overflow-hidden rounded border bg-muted">
                      {p.image && (
                        <Image
                          src={productImageUrl(p.image)}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/admin/productos/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {SECTION_LABELS[p.section]} · {p.category}
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                  <TableCell className="text-right">
                    {p.stock === 0 ? (
                      <span className="text-destructive">Agotado</span>
                    ) : (
                      p.stock
                    )}
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Badge variant="secondary">Visible</Badge>
                    ) : (
                      <Badge variant="outline">Oculto</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

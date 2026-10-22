import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  await requireAdmin();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin/productos" className="text-sm text-muted-foreground hover:underline">
          ← Productos
        </Link>
        <h1 className="text-2xl font-semibold">Importar desde Excel</h1>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          <a href="/admin/productos-excel" download className={buttonVariants({ variant: "outline", size: "sm" })}>
            Descargar el catálogo en Excel
          </a>{" "}
          (si no hay productos, sale vacía y sirve de plantilla).
        </li>
        <li>
          Editala: cambiá precios, stock o datos, o agregá filas nuevas <b>dejando el ID vacío</b>.
          Sección, Categoría y Visible tienen desplegables; las categorías válidas están en la hoja
          &quot;Listas&quot;.
        </li>
        <li>Subila acá. Antes de aplicar te mostramos todos los cambios para que los revises.</li>
      </ol>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Los productos que no estén en la planilla no se tocan. Para borrar u ocultar, usá el panel.</li>
        <li>Los productos nuevos se crean ocultos: cargales las fotos desde el panel y marcalos visibles.</li>
        <li>
          Si no cambiás el stock de un producto, se respeta el de la web (aunque se haya vendido algo
          mientras editabas la planilla).
        </li>
      </ul>

      <ImportForm />
    </div>
  );
}

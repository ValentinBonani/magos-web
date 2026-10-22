import { requireAdmin } from "@/lib/auth";
import { buildCatalogWorkbook } from "@/lib/catalog-sheet";

// Descarga del catálogo en Excel (también sirve de plantilla para cargar productos).
export async function GET() {
  await requireAdmin();
  const file = await buildCatalogWorkbook();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="catalogo-magos-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

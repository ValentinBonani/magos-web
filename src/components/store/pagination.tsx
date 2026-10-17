import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// Links de página que conservan los filtros actuales.
export function Pagination({
  basePath,
  params,
  page,
  pageCount,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("pagina", String(p));
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Páginas">
      {page > 1 && (
        <Link href={href(page - 1)} className={buttonVariants({ variant: "outline" })}>
          ← Anterior
        </Link>
      )}
      <span className="px-2 text-sm text-muted-foreground">
        Página {page} de {pageCount}
      </span>
      {page < pageCount && (
        <Link href={href(page + 1)} className={buttonVariants({ variant: "outline" })}>
          Siguiente →
        </Link>
      )}
    </nav>
  );
}

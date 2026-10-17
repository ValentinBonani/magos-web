import { NextResponse, type NextRequest } from "next/server";
import { searchSuggestions } from "@/lib/catalog";
import { productImageUrl } from "@/lib/storage";

// Sugerencias para el buscador de la cabecera: /api/buscar?q=cat
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json([]);

  const rows = await searchSuggestions(q);
  return NextResponse.json(
    rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      price: r.price,
      inStock: r.stock > 0,
      image: r.image ? productImageUrl(r.image) : null,
    })),
  );
}

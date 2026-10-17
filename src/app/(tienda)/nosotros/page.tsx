import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Nosotros — Magos del Sur" };

// Texto provisorio hasta que el dueño pase el contenido real.
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold">Nosotros</h1>
      <p className="text-muted-foreground">
        {SITE.name} es una tienda de juegos de mesa, Magic y Pokémon en {SITE.city}. Muy pronto
        vas a encontrar acá nuestra historia.
      </p>
    </div>
  );
}

import type { Metadata } from "next";
import { instagramUrl, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Eventos — Magos del Sur" };

// La sección de eventos con carga desde el panel llega después del lanzamiento.
export default function EventsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-semibold">Eventos</h1>
      <p className="text-muted-foreground">
        Muy pronto vas a ver acá los torneos y noches de juego del local. Mientras tanto,
        seguinos en{" "}
        <a href={instagramUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
          Instagram (@{SITE.instagram})
        </a>{" "}
        para enterarte de todo.
      </p>
    </div>
  );
}

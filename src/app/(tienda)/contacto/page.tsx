import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { instagramUrl, mapsUrl, SITE, whatsappUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Contacto — Magos del Sur" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-semibold">Contacto</h1>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">Dirección</h2>
          <p>
            {SITE.address}
            <br />
            {SITE.city}
          </p>
          <a href={mapsUrl} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">
            Ver en Google Maps
          </a>
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Horarios</h2>
          {SITE.hours.map((h) => (
            <p key={h}>{h}</p>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Escribinos</h2>
        <p className="text-muted-foreground">
          WhatsApp: {SITE.whatsappDisplay} · Instagram: @{SITE.instagram}
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={whatsappUrl("¡Hola! Tengo una consulta.")} target="_blank" rel="noopener" className={buttonVariants()}>
            Escribir por WhatsApp
          </a>
          <a href={instagramUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline" })}>
            Ver Instagram
          </a>
        </div>
      </section>
    </div>
  );
}

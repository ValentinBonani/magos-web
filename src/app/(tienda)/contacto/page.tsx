import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { instagramUrl, mapsEmbedUrl, mapsUrl, SITE, whatsappUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Contacto — Magos del Sur" };

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-xl border p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold">Contacto</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="WhatsApp">
          <p>{SITE.whatsappDisplay}</p>
          <a href={whatsappUrl("¡Hola! Tengo una consulta.")} target="_blank" rel="noopener" className={buttonVariants({ size: "sm" })}>
            Escribir por WhatsApp
          </a>
        </Card>
        <Card title="Email">
          <p className="break-all">{SITE.email}</p>
          <a href={`mailto:${SITE.email}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Mandar un email
          </a>
        </Card>
        <Card title="Horarios">
          {SITE.hours.map((h) => (
            <p key={h}>{h}</p>
          ))}
        </Card>
        <Card title="Dirección">
          <p>
            {SITE.address}, {SITE.city}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={mapsUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
              Cómo llegar
            </a>
            <a href={instagramUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
              Instagram @{SITE.instagram}
            </a>
          </p>
        </Card>
      </div>

      <iframe
        src={mapsEmbedUrl}
        title={`Mapa: ${SITE.address}, ${SITE.city}`}
        className="aspect-[4/3] w-full rounded-xl border sm:aspect-[2/1]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

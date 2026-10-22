import { asc, desc, gte, lt } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import { connection } from "next/server";
import { db } from "@/db";
import { events, type Event } from "@/db/schema";
import { formatLongDateTime } from "@/lib/format";
import { instagramUrl, SITE, whatsappUrl } from "@/lib/site";
import { productImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Eventos — Magos del Sur" };

// Un evento sigue como "próximo" hasta 6 horas después de empezar (no tiene hora de fin).
const STILL_UPCOMING_MS = 6 * 60 * 60 * 1000;
const PAST_LIMIT = 12;

function EventCard({ event, past = false }: { event: Event; past?: boolean }) {
  return (
    <article className={cn("overflow-hidden rounded-xl border", past && "opacity-75")}>
      {event.imagePath && (
        <div className="relative aspect-[2/1] bg-muted">
          <Image
            src={productImageUrl(event.imagePath)}
            alt=""
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="space-y-2 p-4">
        <p className="text-sm font-medium text-primary first-letter:uppercase">{formatLongDateTime(event.startsAt)} hs</p>
        <h2 className="text-xl font-semibold">{event.title}</h2>
        <p className="whitespace-pre-line text-muted-foreground">{event.description}</p>
        {!past && (
          <a
            href={whatsappUrl(`¡Hola! Quería consultar por el evento "${event.title}".`)}
            target="_blank"
            rel="noopener"
            className="inline-block text-sm text-primary hover:underline"
          >
            Consultar por WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}

async function getEvents() {
  // Se arma en cada visita: qué es "próximo" depende de la hora.
  await connection();
  const cutoff = new Date(Date.now() - STILL_UPCOMING_MS);
  return Promise.all([
    db.select().from(events).where(gte(events.startsAt, cutoff)).orderBy(asc(events.startsAt)),
    db.select().from(events).where(lt(events.startsAt, cutoff)).orderBy(desc(events.startsAt)).limit(PAST_LIMIT),
  ]);
}

export default async function EventsPage() {
  const [upcoming, past] = await getEvents();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="text-3xl font-semibold">Eventos</h1>

      {upcoming.length === 0 ? (
        <p className="text-muted-foreground">
          Por ahora no hay eventos programados. Seguinos en{" "}
          <a href={instagramUrl} target="_blank" rel="noopener" className="text-primary hover:underline">
            Instagram (@{SITE.instagram})
          </a>{" "}
          para enterarte de los próximos.
        </p>
      ) : (
        <div className="space-y-6">
          {upcoming.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold">Eventos pasados</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((e) => (
              <EventCard key={e.id} event={e} past />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

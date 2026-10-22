import { desc } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { formatLongDateTime } from "@/lib/format";

export default async function AdminEventsPage({ searchParams }: PageProps<"/admin/eventos">) {
  await requireAdmin();
  const params = await searchParams;
  const rows = await db.select().from(events).orderBy(desc(events.startsAt));
  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Eventos</h1>
        <Link href="/admin/eventos/nuevo" className={buttonVariants()}>
          + Nuevo evento
        </Link>
      </div>
      {params.guardado && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm">Evento guardado.</p>}
      {params.borrado && <p className="rounded-lg bg-muted px-3 py-2 text-sm">Evento borrado.</p>}

      {rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Todavía no cargaste eventos. Aparecen en la sección Eventos de la tienda.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/eventos/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 hover:bg-muted/50">
                <span className="font-medium">{e.title}</span>
                <span className="text-sm text-muted-foreground first-letter:uppercase">{formatLongDateTime(e.startsAt)}</span>
                {e.startsAt < now && <span className="ml-auto text-xs text-muted-foreground">Pasado</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { events } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { toArgentinaInputValue } from "@/lib/format";
import { updateEvent } from "../actions";
import { EventForm } from "../event-form";
import { DeleteEventButton } from "./delete-button";

export default async function EditEventPage({ params }: PageProps<"/admin/eventos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Editar evento</h1>
        <DeleteEventButton id={event.id} title={event.title} />
      </div>
      <EventForm
        action={updateEvent.bind(null, event.id)}
        event={{ ...event, startsAt: toArgentinaInputValue(event.startsAt) }}
      />
    </div>
  );
}

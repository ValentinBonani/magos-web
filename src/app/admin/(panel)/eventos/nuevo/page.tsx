import { requireAdmin } from "@/lib/auth";
import { createEvent } from "../actions";
import { EventForm } from "../event-form";

export default async function NewEventPage() {
  await requireAdmin();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo evento</h1>
      <EventForm action={createEvent} />
    </div>
  );
}

import { desc } from "drizzle-orm";
import { db } from "@/db";
import { blockedContacts } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { BlockedList } from "./blocked-list";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const [settings, blocked] = await Promise.all([
    getSettings(),
    db.select().from(blockedContacts).orderBy(desc(blockedContacts.createdAt)),
  ]);

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Descuentos por medio de pago, en la web y en el mostrador. Se aplican sobre los
            productos (no sobre el envío) y valen para los pedidos nuevos.
          </p>
        </div>
        <SettingsForm
          transferDiscountPercent={settings.transferDiscountPercent}
          cashDiscountPercent={settings.cashDiscountPercent}
          whatsappButton={settings.whatsappButton}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Bloqueados</h2>
          <p className="text-sm text-muted-foreground">
            Emails y teléfonos que no pueden hacer pedidos en la web (por ejemplo, alguien que
            hace pedidos falsos). El teléfono se compara por los últimos 8 números, así que da
            igual cómo lo escriban.
          </p>
        </div>
        <BlockedList blocked={blocked.map((b) => ({ id: b.id, kind: b.kind, display: b.display, note: b.note }))} />
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Descuentos por medio de pago. Se aplican sobre los productos (no sobre el envío) y valen
          para los pedidos nuevos.
        </p>
      </div>
      <SettingsForm
        transferDiscountPercent={settings.transferDiscountPercent}
        cashDiscountPercent={settings.cashDiscountPercent}
      />
    </div>
  );
}

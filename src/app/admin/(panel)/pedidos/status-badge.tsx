import type { OrderStatus } from "@/db/schema";
import { STATUS_LABELS } from "@/lib/order-rules";
import { cn } from "@/lib/utils";

const TONES: Record<OrderStatus, string> = {
  pendiente_pago: "bg-amber-100 text-amber-900",
  comprobante_recibido: "bg-blue-100 text-blue-900",
  pendiente_confirmacion: "bg-amber-100 text-amber-900",
  pendiente_mp: "bg-amber-100 text-amber-900",
  confirmado: "bg-blue-100 text-blue-900",
  pagado: "bg-blue-100 text-blue-900",
  listo_para_retirar: "bg-violet-100 text-violet-900",
  entregado: "bg-green-100 text-green-900",
  cancelado: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

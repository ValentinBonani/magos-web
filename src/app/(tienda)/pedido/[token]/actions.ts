"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { sendAdminReceiptEmail } from "@/lib/order-emails";
import { attachReceipt, cancelByCustomer, OrderError } from "@/lib/orders";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 4 * 1024 * 1024;
const BUCKET = "receipts";

export type ReceiptState = { error?: string; ok?: boolean };

// El cliente sube el comprobante de transferencia. El token del link es la
// autorización: solo quien tiene el link puede subirlo.
export async function uploadReceipt(token: string, _prev: ReceiptState, formData: FormData): Promise<ReceiptState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí el archivo del comprobante." };
  if (file.size > MAX_BYTES) return { error: "El archivo es demasiado grande (máximo 4 MB)." };

  const bytes = Buffer.from(await file.arrayBuffer());
  let body: Buffer;
  let ext: "pdf" | "webp";

  if (bytes.subarray(0, 5).toString("latin1") === "%PDF-") {
    body = bytes;
    ext = "pdf";
  } else {
    try {
      // Imagen: se re-procesa (valida que sea imagen y le quita los metadatos).
      body = await sharp(bytes)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      ext = "webp";
    } catch {
      return { error: "No pudimos leer el archivo. Subí una foto (JPG o PNG) o un PDF." };
    }
  }

  const storage = createAdminClient().storage.from(BUCKET);
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await storage.upload(path, body, {
    contentType: ext === "pdf" ? "application/pdf" : "image/webp",
  });
  if (uploadError) return { error: "No pudimos guardar el comprobante. Probá de nuevo." };

  try {
    const { order, previousPath } = await attachReceipt(token, path);
    if (previousPath) await storage.remove([previousPath]);
    await sendAdminReceiptEmail(order);
  } catch (error) {
    await storage.remove([path]);
    if (error instanceof OrderError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/pedido/${token}`);
  return { ok: true };
}

export type CancelState = { error?: string };

export async function cancelMyOrder(token: string): Promise<CancelState> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return { error: "No encontramos el pedido." };
  const cancelled = await cancelByCustomer(token);
  if (!cancelled) return { error: "Este pedido ya no se puede cancelar desde acá. Escribinos por WhatsApp." };
  // Puede haber liberado stock.
  revalidatePath("/", "layout");
  return {};
}

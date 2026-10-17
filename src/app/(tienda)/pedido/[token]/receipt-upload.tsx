"use client";

import { startTransition, useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadReceipt, type ReceiptState } from "./actions";

const MAX_SIDE = 2000;

// Achica fotos grandes en el navegador antes de subirlas. Los PDF van tal cual.
async function prepare(file: File): Promise<Blob> {
  if (file.type === "application/pdf") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return (await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.9))) ?? file;
  } catch {
    return file;
  }
}

export function ReceiptUpload({ token, replacing }: { token: string; replacing: boolean }) {
  const [state, formAction, pending] = useActionState<ReceiptState, FormData>(
    uploadReceipt.bind(null, token),
    {},
  );
  const [preparing, setPreparing] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setPreparing(true);
    const formData = new FormData();
    formData.append("file", await prepare(file), file.name);
    setPreparing(false);
    startTransition(() => formAction(formData));
  }

  const busy = pending || preparing;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="file"
        name="file"
        accept="image/*,application/pdf"
        required
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary"
      />
      <Button type="submit" disabled={busy}>
        {busy ? "Subiendo…" : replacing ? "Reemplazar comprobante" : "Subir comprobante"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-700">¡Listo! Recibimos tu comprobante.</p>}
    </form>
  );
}

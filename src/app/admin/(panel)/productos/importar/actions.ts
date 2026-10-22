"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { applyImport, previewImport, type ImportPlan } from "@/lib/catalog-sheet";

const MAX_BYTES = 4 * 1024 * 1024;

export type ImportState =
  | { step: "idle" }
  | { step: "error"; error: string }
  | { step: "preview"; plan: ImportPlan }
  | { step: "done"; created: number; updated: number };

async function readFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Elegí la planilla." };
  if (file.size > MAX_BYTES) return { error: "La planilla es demasiado grande (máximo 4 MB)." };
  return { data: await file.arrayBuffer() };
}

// mode=preview muestra qué va a cambiar; mode=apply lo aplica (se vuelve a subir el
// mismo archivo, así no hay que guardar nada entre un paso y el otro).
export async function importCatalog(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = await readFile(formData);
  if ("error" in file) return { step: "error", error: file.error! };

  if (formData.get("mode") !== "apply") {
    const plan = await previewImport(file.data);
    return "error" in plan ? { step: "error", error: plan.error } : { step: "preview", plan };
  }

  const result = await applyImport(file.data);
  if ("error" in result) return { step: "error", error: result.error };
  revalidatePath("/", "layout");
  return { step: "done", ...result };
}

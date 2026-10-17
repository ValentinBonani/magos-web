"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { productImageUrl } from "@/lib/storage";
import { uploadProductImage } from "./actions";

const MAX_SIDE = 1600;
const MAX_IMAGES = 10;

// Achica la foto en el navegador antes de subirla (las del celular pesan varios MB).
// Si el navegador no puede leerla, se manda la original y decide el servidor.
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export function ImageUploader({
  initialPaths,
  error,
}: {
  initialPaths: string[];
  error?: string;
}) {
  const [paths, setPaths] = useState(initialPaths);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(undefined);
    const selected = Array.from(files).slice(0, MAX_IMAGES - paths.length);
    setUploading((n) => n + selected.length);

    // De a una, en orden, para no saturar la conexión.
    for (const file of selected) {
      const formData = new FormData();
      formData.append("file", await shrink(file), file.name);
      const result = await uploadProductImage(formData);
      if ("path" in result) setPaths((p) => [...p, result.path]);
      else setUploadError(result.error);
      setUploading((n) => n - 1);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, delta: number) {
    setPaths((p) => {
      const next = [...p];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="images" value={JSON.stringify(paths)} />
      {paths.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {paths.map((path, i) => (
            <li key={path} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                <Image
                  src={productImageUrl(path)}
                  alt={`Foto ${i + 1}`}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex justify-center gap-1">
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Mover a la izquierda"
                >
                  ←
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={i === paths.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Mover a la derecha"
                >
                  →
                </Button>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setPaths((p) => p.filter((x) => x !== path))}
                  aria-label="Quitar foto"
                >
                  ✕
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={uploading > 0 || paths.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          {uploading > 0 ? `Subiendo ${uploading}…` : "Agregar fotos"}
        </Button>
        <span className="text-sm text-muted-foreground">
          La primera es la principal. Máximo {MAX_IMAGES}.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {(uploadError ?? error) && (
        <p className="text-sm text-destructive">{uploadError ?? error}</p>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { productImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export function Gallery({ images, name, soldOut }: { images: string[]; name: string; soldOut: boolean }) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
        {current && (
          <Image
            src={productImageUrl(current)}
            alt={name}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className={cn("object-contain", soldOut && "opacity-60")}
          />
        )}
        {soldOut && (
          <span className="absolute inset-x-0 top-5 bg-[var(--brand-black)]/85 py-2 text-center text-lg font-semibold tracking-wide text-white uppercase">
            Agotado
          </span>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((path, i) => (
            <li key={path} className="shrink-0">
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === selected}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border-2 bg-muted sm:size-20",
                  i === selected ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={productImageUrl(path)} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { Camera, ImagePlus, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PhotoItem {
  key: string;
  url: string;
  /** Present for photos already saved; absent for new local ones. */
  imageId?: string;
  file?: File;
}

interface Props {
  photos: PhotoItem[];
  coverKey: string | null;
  onAdd: (files: File[]) => void;
  onRemove: (key: string) => void;
  onCover: (key: string) => void;
  disabled?: boolean;
  compressing?: boolean;
}

export function ImageUploader({ photos, coverKey, onAdd, onRemove, onCover, disabled, compressing }: Props) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    if (files.length) onAdd(files);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5">
          <Camera className="h-5 w-5" />Take photo
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} disabled={disabled} />
        </label>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5">
          <ImagePlus className="h-5 w-5" />Choose photos
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={pick} disabled={disabled} />
        </label>
      </div>
      {compressing && <p className="text-sm text-muted-foreground" role="status">Optimising photos…</p>}
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((p) => (
            <li key={p.key} className={cn("relative aspect-square overflow-hidden rounded-md border-2", p.key === coverKey ? "border-gold" : "border-transparent")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Jewellery preview" className="h-full w-full object-cover" />
              <button type="button" onClick={() => onCover(p.key)} aria-label="Make cover photo" aria-pressed={p.key === coverKey}
                className={cn("absolute left-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white", p.key === coverKey && "text-gold")}>
                <Star className="h-4 w-4" fill={p.key === coverKey ? "currentColor" : "none"} />
              </button>
              <button type="button" onClick={() => onRemove(p.key)} aria-label="Remove photo"
                className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length > 0 && <p className="text-xs text-muted-foreground">Tap the star to choose the cover photo.</p>}
    </div>
  );
}

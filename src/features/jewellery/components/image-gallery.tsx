"use client";

import { useState } from "react";
import { ImageOff, X } from "lucide-react";

export function ImageGallery({ images, name }: { images: { id: string; url: string | null; is_cover: boolean }[]; name: string }) {
  const shown = images.filter((i) => i.url);
  const first = Math.max(0, shown.findIndex((i) => i.is_cover));
  const [active, setActive] = useState(first);
  const [open, setOpen] = useState(false);

  if (!shown.length) {
    return <div className="grid aspect-square w-full place-items-center rounded-lg bg-muted text-muted-foreground"><ImageOff className="h-10 w-10" /></div>;
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setOpen(true)} className="block aspect-square w-full overflow-hidden rounded-lg bg-muted" aria-label="View full screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={shown[active].id} src={shown[active].url!} alt={name} className="h-full w-full animate-[fade-in_.25s_ease-out] object-cover" />
      </button>
      {shown.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {shown.map((i, idx) => (
            <li key={i.id}>
              <button type="button" onClick={() => setActive(idx)} aria-label={`Photo ${idx + 1}`}
                className={`aspect-square w-full overflow-hidden rounded-md border-2 ${idx === active ? "border-gold" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url!} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Full screen photo" className="fixed inset-0 z-50 grid animate-[fade-in_.2s_ease-out] place-items-center bg-black/90 p-4" onClick={() => setOpen(false)}>
          <button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="Close" onClick={() => setOpen(false)}><X className="h-6 w-6" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown[active].url!} alt={name} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

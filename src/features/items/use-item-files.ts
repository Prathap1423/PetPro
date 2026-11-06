"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MAX_PHOTOS } from "@/domain/items";
import { BILL_MAX_BYTES, compressImage, isAllowedBill, isAllowedImage } from "@/lib/image";
import type { PhotoItem } from "@/features/items/components/image-uploader";
import type { SaveInput } from "@/features/items/save";

type Existing = { images: { id: string; url: string | null; is_cover: boolean }[]; hasBill: boolean } | undefined;

/** Photo and bill state for an item form: adding, compressing, removing, choosing the cover, replacing the bill. */
export function useItemFiles(existing: Existing) {
  const [photos, setPhotos] = useState<PhotoItem[]>(
    (existing?.images ?? []).filter((i) => i.url).map((i) => ({ key: i.id, url: i.url!, imageId: i.id })),
  );
  const [coverKey, setCoverKey] = useState<string | null>(existing?.images.find((i) => i.is_cover)?.id ?? existing?.images[0]?.id ?? null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [bill, setBill] = useState<File | null>(null);
  const [removeBill, setRemoveBill] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const addPhotos = async (files: File[]) => {
    const valid = files.filter((x) => {
      if (!isAllowedImage(x)) { toast.error(`${x.name}: only JPG, PNG, WebP or HEIC photos`); return false; }
      return true;
    });
    const room = MAX_PHOTOS - photos.length;
    if (valid.length > room) toast.error(`You can add up to ${MAX_PHOTOS} photos`);
    setCompressing(true);
    try {
      const added: PhotoItem[] = [];
      for (const file of valid.slice(0, Math.max(room, 0))) {
        try {
          const small = await compressImage(file);
          added.push({ key: crypto.randomUUID(), url: URL.createObjectURL(small), file: small });
        } catch {
          toast.error(`Could not process ${file.name}`);
        }
      }
      setPhotos((p) => [...p, ...added]);
      setCoverKey((c) => c ?? added[0]?.key ?? null);
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = (key: string) => {
    const p = photos.find((x) => x.key === key);
    if (p?.imageId) setRemovedIds((r) => [...r, p.imageId!]);
    if (p?.file) URL.revokeObjectURL(p.url);
    const rest = photos.filter((x) => x.key !== key);
    setPhotos(rest);
    if (coverKey === key) setCoverKey(rest[0]?.key ?? null);
  };

  const pickBill = (file: File) => {
    if (!isAllowedBill(file)) return void toast.error("Bill must be a PDF or an image");
    if (file.size > BILL_MAX_BYTES) return void toast.error("Bill must be under 10 MB");
    setBill(file);
    setRemoveBill(false);
  };

  /** The file part of a save request; compresses an image bill on the way. */
  const toSaveInput = async (): Promise<Omit<SaveInput, "id" | "values">> => {
    const newPhotos = photos.filter((x) => x.file);
    const coverPhoto = photos.find((p) => p.key === coverKey);
    const cover = !coverPhoto ? null
      : coverPhoto.imageId ? { imageId: coverPhoto.imageId }
      : { newPhotoIndex: newPhotos.findIndex((x) => x.key === coverKey) };
    const billFile = bill && bill.type.startsWith("image/") ? await compressImage(bill) : bill;
    return { newPhotos: newPhotos.map((p) => p.file!), cover, removedImageIds: removedIds, bill: billFile, removeBill };
  };

  return {
    photos, coverKey, setCoverKey, addPhotos, removePhoto, compressing,
    bill, clearBill: () => setBill(null), pickBill,
    hasSavedBill: !!existing?.hasBill && !removeBill, removeSavedBill: () => setRemoveBill(true),
    toSaveInput,
  };
}

export type ItemFiles = ReturnType<typeof useItemFiles>;

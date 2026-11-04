import imageCompression from "browser-image-compression";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function isAllowedImage(f: File) {
  return IMAGE_TYPES.includes(f.type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name);
}

/** Resize to max 1600px and re-encode as JPEG (~<500 KB) before saving. */
export async function compressImage(file: File): Promise<File> {
  const out = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  });
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([out], name, { type: "image/jpeg" });
}

export const BILL_MAX_BYTES = 10 * 1024 * 1024;
export function isAllowedBill(f: File) {
  return f.type === "application/pdf" || IMAGE_TYPES.includes(f.type);
}

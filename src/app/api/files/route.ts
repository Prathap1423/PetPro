import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { diskPath, isBucket, isFilePath, removeFiles } from "@/lib/store";
import { BILL_MAX_BYTES } from "@/lib/upload";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Upload one file: multipart form with bucket, path and file. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const bucket = String(form.get("bucket") ?? "");
  const p = String(form.get("path") ?? "");
  const file = form.get("file");
  if (!isBucket(bucket) || !isFilePath(p) || !(file instanceof File))
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  // Photos are always re-encoded to JPEG in the browser; bills may also be PDFs.
  const isPdf = p.endsWith(".pdf");
  if (file.type !== (isPdf ? "application/pdf" : "image/jpeg") || (isPdf && bucket !== "jewellery-bills"))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  if (file.size > (bucket === "jewellery-images" ? IMAGE_MAX_BYTES : BILL_MAX_BYTES))
    return NextResponse.json({ error: "File is too large" }, { status: 413 });

  const dest = diskPath(bucket, p);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()), { flag: "wx" });
  } catch {
    return NextResponse.json({ error: "File already exists" }, { status: 409 });
  }
  return NextResponse.json({ path: p });
}

/** Remove files: JSON body { bucket, paths }. Used to roll back uploads when a save fails. */
export async function DELETE(request: NextRequest) {
  const { bucket, paths } = (await request.json().catch(() => ({}))) as { bucket?: string; paths?: unknown };
  if (!bucket || !isBucket(bucket) || !Array.isArray(paths))
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await removeFiles(bucket, paths.map(String));
  return NextResponse.json({ ok: true });
}

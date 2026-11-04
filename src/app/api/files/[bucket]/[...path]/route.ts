import { promises as fs } from "node:fs";
import { NextResponse, type NextRequest } from "next/server";
import { diskPath, isBucket, isFilePath } from "@/lib/store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ bucket: string; path: string[] }> }) {
  const { bucket, path } = await params;
  const p = path.join("/");
  if (!isBucket(bucket) || !isFilePath(p)) return new NextResponse("Not found", { status: 404 });
  try {
    const body = await fs.readFile(diskPath(bucket, p));
    return new NextResponse(body, {
      headers: {
        "Content-Type": p.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

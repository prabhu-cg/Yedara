import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DocImage } from "@/lib/research-planner/document";

const ALLOWED = /^\/personas\/avatars\/[0-9]{2}\.jpg$/;

/** Reads a cover image from /public for the PDF and Word exports. Only the bundled avatars are ever read. */
export async function loadDocImage(image: DocImage | undefined): Promise<Buffer | null> {
  if (!image || !ALLOWED.test(image.src)) return null;
  try {
    return await readFile(path.join(process.cwd(), "public", image.src));
  } catch {
    return null;
  }
}

// Removes hidden details from photos and videos before they are uploaded:
// GPS location, camera make/model, serial numbers, dates, editing software.
// Phone photos often carry the exact spot they were taken, which can reveal
// where a member lives. The server checks every file again after upload
// (scrub-media), so this is the first of two layers.
//
// The picture itself is not re-compressed: the metadata blocks are cut out of
// the file (a sideways photo keeps only its rotation). Formats the browser
// can't edit byte by byte (HEIC and the like) are redrawn as a JPEG.

import { blankXmpGps, boxHeader, cleanJpeg, scanBox, scrubMoov, sniff, stripPng, stripWebp } from "./strip-core.ts";

async function stripVideo(file: Blob): Promise<Blob> {
  const parts: BlobPart[] = [];
  let at = 0;
  let last = 0;
  while (at + 8 <= file.size) {
    const h = new Uint8Array(await file.slice(at, at + 16).arrayBuffer());
    const { type, size } = boxHeader(h, file.size - at);
    if (size < 8) break;
    if (scanBox(type) && size <= 64 * 1024 * 1024) {
      const box = new Uint8Array(await file.slice(at, at + size).arrayBuffer());
      if (scrubMoov(box)) {
        parts.push(file.slice(last, at), box as BlobPart);
        last = at + size;
      }
    }
    at += size;
  }
  if (parts.length === 0) return file;
  parts.push(file.slice(last));
  return new Blob(parts, { type: file.type });
}

/** Redraws a picture as a JPEG (the browser applies EXIF rotation while decoding). */
async function redraw(file: Blob): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0);
    bmp.close();
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  } catch {
    return null;
  }
}

/**
 * Returns the file with its location and other hidden details removed.
 * A picture the browser can't clean or redraw is refused rather than uploaded with its location.
 */
export async function stripMetadata(file: Blob): Promise<Blob> {
  const kind = sniff(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (kind === "video") return stripVideo(file);
  if (file.type.startsWith("video/")) return stripVideo(file);
  if (kind === "gif") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return blankXmpGps(bytes) ? new Blob([bytes as BlobPart], { type: "image/gif" }) : file;
  }
  if (kind === "other") {
    // HEIC, AVIF, TIFF…: redraw as a JPEG, which leaves every hidden detail behind
    const drawn = await redraw(file);
    if (!drawn) throw new Error("This photo format can't be uploaded. Save it as a JPEG or PNG and try again.");
    return drawn;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (kind === "png") return new Blob([stripPng(bytes) as BlobPart], { type: "image/png" });
  if (kind === "webp") return new Blob([stripWebp(bytes) as BlobPart], { type: "image/webp" });
  return new Blob([cleanJpeg(bytes) as BlobPart], { type: "image/jpeg" });
}

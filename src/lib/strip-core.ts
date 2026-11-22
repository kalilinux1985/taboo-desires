// Pure byte-level removal of hidden photo and video details (location,
// camera, dates). Used in the browser before upload and on the server after.
// The server function keeps a copy: supabase/functions/scrub-media/strip-core.ts
// (copy this file there after changing it).

const textDecoder = new TextDecoder("latin1");
export const ascii = (b: Uint8Array, at: number, len: number) => textDecoder.decode(b.subarray(at, at + len));

/** JPEG: drops EXIF/XMP (APP1), IPTC (APP13), other APPn and comments; keeps JFIF, ICC colors and Adobe. */
export function stripJpeg(b: Uint8Array): { out: Uint8Array; orientation: number } {
  let orientation = 1;
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return { out: b, orientation }; // not where a marker should be: leave the file alone
    const marker = b[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }
    if (marker === 0xda) {
      // Start of the image data: everything after is pixels
      parts.push(b.subarray(i));
      break;
    }
    const len = (b[i + 2] << 8) | b[i + 3];
    const seg = b.subarray(i, i + 2 + len);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    const keep =
      !isApp ? marker !== 0xfe /* comment */ : marker === 0xe0 /* JFIF */ || marker === 0xe2 /* ICC */ || marker === 0xee; /* Adobe */
    if (marker === 0xe1 && ascii(b, i + 4, 4) === "Exif") orientation = exifOrientation(b, i + 10, len - 8);
    if (keep) parts.push(seg);
    i += 2 + len;
  }
  return { out: concat(parts), orientation };
}

/** Reads the Orientation tag (1-8) from a TIFF/EXIF block. */
function exifOrientation(b: Uint8Array, start: number, len: number): number {
  if (len < 8) return 1;
  const little = ascii(b, start, 2) === "II";
  const u16 = (o: number) => (little ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
  const u32 = (o: number) => (little ? u16(o) + u16(o + 2) * 65536 : u16(o) * 65536 + u16(o + 2));
  const ifd = start + u32(start + 4);
  if (ifd + 2 > start + len) return 1;
  const count = u16(ifd);
  for (let n = 0; n < count; n++) {
    const e = ifd + 2 + n * 12;
    if (e + 12 > start + len) break;
    if (u16(e) === 0x0112) return u16(e + 8) || 1;
  }
  return 1;
}

/** PNG: drops eXIf and text chunks (tEXt, zTXt, iTXt) and time stamps. */
export function stripPng(b: Uint8Array): Uint8Array {
  const drop = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) return b;
    if (!drop.has(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return concat(parts);
}

/** WebP: drops the EXIF and XMP chunks and clears their flags. */
export function stripWebp(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = b[i + 4] | (b[i + 5] << 8) | (b[i + 6] << 16) | (b[i + 7] << 24);
    const end = i + 8 + len + (len & 1);
    if (end > b.length + 1) return b;
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = b.slice(i, Math.min(end, b.length));
      if (type === "VP8X") chunk[8] &= ~0x0c; // no EXIF, no XMP
      parts.push(chunk);
    }
    i = end;
  }
  const body = concat(parts);
  const head = b.slice(0, 12);
  const size = body.length + 4;
  head[4] = size & 0xff;
  head[5] = (size >> 8) & 0xff;
  head[6] = (size >> 16) & 0xff;
  head[7] = (size >> 24) & 0xff;
  return concat([head, body]);
}

const ISO6709 = /[+-]\d{1,3}\.\d+[+-]\d{1,3}\.\d+(?:[+-]\d+(?:\.\d+)?)?\/?/g;

/**
 * MP4 / MOV: blanks the recording location inside one top-level box (moov,
 * meta, uuid…), byte for byte, so nothing else in the file moves.
 * Returns true when something was removed.
 */
export function scrubMoov(moov: Uint8Array): boolean {
  let changed = false;
  // ©xyz (QuickTime) and loci (3GPP) location atoms: rename to "free" and blank their contents
  for (let i = 4; i + 4 <= moov.length; i++) {
    if ((moov[i] === 0xa9 && ascii(moov, i + 1, 3) === "xyz") || ascii(moov, i, 4) === "loci") {
      const len = ((moov[i - 4] << 24) >>> 0) + (moov[i - 3] << 16) + (moov[i - 2] << 8) + moov[i - 1];
      if (len >= 8 && i - 4 + len <= moov.length) {
        moov.set([0x66, 0x72, 0x65, 0x65], i);
        moov.fill(0, i + 4, i - 4 + len);
        changed = true;
      }
    }
  }
  // Location written as text (Apple's location.ISO6709 key, "location" tags): "+37.7858-122.4064+000.000/"
  const text = textDecoder.decode(moov);
  for (const m of text.matchAll(ISO6709)) {
    if (m.index === undefined) continue;
    for (let k = 0; k < m[0].length; k++) if (/[0-9]/.test(m[0][k])) moov[m.index + k] = 0x30;
    changed = true;
  }
  return blankXmpGps(moov, text) || changed;
}

/** XMP text anywhere in a file (e.g. a video's uuid box, a GIF's XMP block): blanks GPS values in place. */
export function blankXmpGps(moov: Uint8Array, text = textDecoder.decode(moov)): boolean {
  let changed = false;
  for (const m of text.matchAll(XMP_GPS)) {
    if (m.index === undefined) continue;
    const value = m[1] ?? m[2] ?? "";
    if (!value.trim()) continue;
    const valueStart = m.index + m[0].length - 1 - value.length;
    for (let k = 0; k < value.length; k++) moov[valueStart + k] = 0x20;
    changed = true;
  }
  return changed;
}

const XMP_GPS = /(?:exif|exifEX|photoshop|Iptc4xmpExt):GPS\w*(?:="([^"]*)"|>([^<]*)<)/g;

/** Reads an MP4 box header: its type and full size. */
export function boxHeader(h: Uint8Array, remaining: number): { type: string; size: number } {
  let size = ((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3];
  const type = ascii(h, 4, 4);
  if (size === 1) size = Number(new DataView(h.buffer, h.byteOffset).getBigUint64(8));
  else if (size === 0) size = remaining;
  return { type, size };
}

/** A tiny EXIF block holding only the rotation, so a sideways phone photo stays upright without its other details. */
export function orientationOnlyExif(orientation: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation & 0xff, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
}

/** A cleaned JPEG: hidden details removed, the rotation kept when the photo needs it. */
export function cleanJpeg(b: Uint8Array): Uint8Array {
  const { out, orientation } = stripJpeg(b);
  if (orientation === 1 || orientation < 1 || orientation > 8 || out === b) return out;
  return concat([out.subarray(0, 2), orientationOnlyExif(orientation), out.subarray(2)]);
}

export function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Kind of file by its first bytes (the name and type a browser reports can be wrong). */
export function sniff(b: Uint8Array): "jpeg" | "png" | "webp" | "gif" | "video" | "other" {
  if (b[0] === 0xff && b[1] === 0xd8) return "jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return "png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  if (ascii(b, 0, 3) === "GIF") return "gif";
  if (ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    return brand.startsWith("hei") || brand === "mif1" || brand === "msf1" || brand.startsWith("avi") ? "other" : "video";
  }
  return "other";
}


/** Top-level video boxes that can hold metadata (everything but the picture and sound data). */
export const scanBox = (type: string) => type !== "mdat" && type !== "free" && type !== "skip" && type !== "wide";

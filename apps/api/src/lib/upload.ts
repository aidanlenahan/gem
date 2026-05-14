import { createWriteStream, existsSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { pipeline } from "stream/promises";
import type { Readable } from "stream";

// ============================================================================
// Constants
// ============================================================================

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "/var/www/gem/uploads";
export const MEDIA_GLOBAL_MAX_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB hard cap
export const AVATAR_MAX_FILE_BYTES = 2 * 1024 * 1024;           // 2 MB for profile photos
export const MEDIA_MAX_FILE_BYTES = 5 * 1024 * 1024;            // 5 MB per event photo
export const MEDIA_GROUP_DEFAULT_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MB default per group
export const MEDIA_GROUP_MAX_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB max per group

// ============================================================================
// Allowed MIME types: PNG, JPEG, WebP only
// ============================================================================

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

// ============================================================================
// File signature (magic byte) validation
// Checks actual binary content — not the claimed MIME type or extension.
// This prevents malware disguised as images from being stored.
// ============================================================================

export function detectMimeFromSignature(buf: Buffer): string | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
    buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
  ) return "image/png";

  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "image/webp";

  return null;
}

// ============================================================================
// Save a stream to disk, validate signature, enforce size limit.
// Returns { path, mimeType, sizeBytes } or throws on validation failure.
// ============================================================================

export type SavedFile = {
  path: string;    // absolute path on disk
  urlPath: string; // path portion of the public URL (e.g. /uploads/media/...)
  mimeType: string;
  sizeBytes: number;
};

export async function saveUploadedFile(
  stream: Readable,
  subdir: string,  // relative to UPLOAD_DIR, e.g. "media/eventId" or "avatars"
  maxBytes: number = MEDIA_MAX_FILE_BYTES,
): Promise<SavedFile> {
  const tempId = randomUUID();
  const dir = join(UPLOAD_DIR, subdir);
  mkdirSync(dir, { recursive: true });
  const tempPath = join(dir, `${tempId}.tmp`);

  let sizeBytes = 0;
  const chunks: Buffer[] = [];

  const writeStream = createWriteStream(tempPath);

  // Collect bytes while writing to disk; track size and capture header
  let headerCollected = false;
  let headerBuf = Buffer.alloc(0);

  await pipeline(
    stream,
    async function* (source) {
      for await (const chunk of source) {
        const c = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        sizeBytes += c.length;
        if (sizeBytes > maxBytes) {
          writeStream.destroy();
          if (existsSync(tempPath)) unlinkSync(tempPath);
          throw Object.assign(new Error("FILE_TOO_LARGE"), { code: "FILE_TOO_LARGE" });
        }
        if (!headerCollected) {
          headerBuf = Buffer.concat([headerBuf, c]);
          if (headerBuf.length >= 12) headerCollected = true;
        }
        yield c;
      }
    },
    writeStream,
  );

  // Validate file signature
  const detectedMime = detectMimeFromSignature(headerBuf.length >= 12 ? headerBuf : Buffer.concat(chunks));
  if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    throw Object.assign(new Error("INVALID_IMAGE"), { code: "INVALID_IMAGE" });
  }

  // Rename to final path with correct extension
  const ext = MIME_TO_EXT[detectedMime] ?? "bin";
  const finalName = `${tempId}.${ext}`;
  const finalPath = join(dir, finalName);
  const { renameSync } = await import("fs");
  renameSync(tempPath, finalPath);

  const urlPath = `/uploads/${subdir}/${finalName}`;

  return { path: finalPath, urlPath, mimeType: detectedMime, sizeBytes };
}

// ============================================================================
// Delete a file from disk (best-effort, no throw on missing file)
// ============================================================================

export function deleteUploadedFile(urlPath: string): void {
  try {
    const relative = urlPath.replace(/^\/uploads\//, "");
    const absPath = join(UPLOAD_DIR, relative);
    if (existsSync(absPath)) unlinkSync(absPath);
  } catch {
    // best-effort
  }
}

// ============================================================================
// Format helpers
// ============================================================================

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

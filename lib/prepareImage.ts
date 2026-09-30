// Gets a photo into a shape the model reads and the upload limit allows, in the
// browser, before anything is sent. Client-only.
//
// A modern iPhone photo is 3 to 6 MB, or a HEIC the model refuses outright, so
// the plain 3 MB check rejected the most natural thing a student does: photograph
// their timetable. The provider scales every image to fit 2048px and then its
// short side to 768px before reading it, so sending 2400px on the long side
// loses nothing it would have used.
//
// A file that is already a supported type and under the limit is passed through
// untouched, so a clean PNG screenshot is never re-encoded.

import { MAX_UPLOAD_BYTES, isSupportedImage } from "@/lib/fileTypes";

/** The largest photo taken before shrinking. Beyond this it is not a photo. */
export const MAX_PICK_BYTES = 30 * 1024 * 1024;

const LONG_SIDE = 2400;
const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6];

export function isHeic(file: { name?: string; type?: string }): boolean {
  const type = (file.type ?? "").toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.(heic|heif)$/i.test(file.name ?? "");
}

/** An image this can handle: one the model reads, or a HEIC it may be able to convert. */
export function isPhoto(file: { name?: string; type?: string }): boolean {
  return isSupportedImage(file.type ?? "") || isHeic(file);
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * The file to upload, or a sentence saying why it cannot be. Non-images and
 * images that need no work come back as they were.
 */
export async function prepareImage(file: File): Promise<{ file?: File; error?: string }> {
  const heic = isHeic(file);
  if (!heic && file.size <= MAX_UPLOAD_BYTES) return { file };
  if (file.size > MAX_PICK_BYTES) {
    return { error: "That photo is too large. Please choose one under 30 MB." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return {
      error: heic
        ? "This browser cannot open HEIC photos. Take a screenshot of the photo, or choose a JPG or PNG."
        : "That image could not be opened. Try another copy of it.",
    };
  }

  try {
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { error: "That image could not be opened. Try another copy of it." };
    // JPEG has no transparency, so a transparent PNG would otherwise go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const name = file.name.replace(/\.[a-z0-9]{1,8}$/i, "") + ".jpg";
        return { file: new File([blob], name, { type: "image/jpeg" }) };
      }
    }
    return { error: "That photo is too detailed to shrink. Please choose a smaller one." };
  } finally {
    bitmap.close();
  }
}

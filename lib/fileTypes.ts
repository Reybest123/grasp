// Which files Grasp can read, shared by the upload forms and the routes that
// read them. Client-safe.
//
// The list is set by what the model accepts, not by what a browser calls an
// image: the provider reads PNG, JPEG, WEBP and GIF and refuses anything else.
// The forms used to accept any `image/*`, so an iPhone's HEIC photo got past
// them and failed at the provider, where the student only saw "Grasp could not
// reach the AI". Now it is named and refused before anything is sent.

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
export const PDF_TYPE = "application/pdf";
const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv"];
const TEXT_EXTENSIONS = ["txt", "md", "csv"];

/** The largest upload either form takes: the request body limit, since base64 adds a third. */
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

// There is deliberately no `accept` list for the file inputs. With one, the
// system picker greys out or hides every other file, and a student looking
// for their HEIC photo or Word document could not tell why it was missing.
// The picker shows everything, and a file Grasp cannot read is refused by
// name the moment it is picked (unsupportedFileMessage).

const RESOURCE_LIST = "a PNG, JPG, WEBP or GIF image, a PDF, or a TXT, MD or CSV text file";
const TIMETABLE_LIST = "a PNG, JPG, WEBP or GIF image, or a PDF";

type FileLike = { name?: string; type?: string };

function extensionOf(name: string): string {
  const match = /\.([a-z0-9]{1,8})$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

export const isSupportedImage = (type: string) => IMAGE_TYPES.includes(type.toLowerCase());

export function isTextFile(file: FileLike): boolean {
  return TEXT_EXTENSIONS.includes(extensionOf(file.name ?? "")) || TEXT_TYPES.includes(file.type ?? "");
}

export function resourceFileSupported(file: FileLike): boolean {
  const type = file.type ?? "";
  return isSupportedImage(type) || type === PDF_TYPE || isTextFile(file);
}

export function timetableFileSupported(file: FileLike): boolean {
  const type = file.type ?? "";
  return isSupportedImage(type) || type === PDF_TYPE;
}

/**
 * "HEIC files are not supported. Please upload …". Named by the file's
 * extension, or its media type when there is no name to go on (the routes only
 * see the data URL). A type too unwieldy to print, like a Word document's,
 * falls back to "This file type".
 */
export function unsupportedFileMessage(file: FileLike, kind: "resource" | "timetable"): string {
  const fromType = (file.type ?? "").split("/")[1]?.split("+")[0] ?? "";
  const label = extensionOf(file.name ?? "") || (/^[a-z0-9]{2,5}$/i.test(fromType) ? fromType : "");
  const subject = label ? `${label.toUpperCase()} files are` : "This file type is";
  return `${subject} not supported. Please upload ${kind === "resource" ? RESOURCE_LIST : TIMETABLE_LIST}.`;
}

/**
 * The file in a drop, or why there is none. Dragging an image straight off a
 * web page, or a run of selected text, drops a link or text rather than a
 * file (Firefox never hands over the image; other browsers sometimes do, and
 * then it is checked like any other file). Left unexplained, the drop just
 * did nothing.
 */
export function droppedFile(dt: DataTransfer): { file?: File; error?: string } {
  const file = dt.files?.[0];
  if (file) return { file };
  const types = Array.from(dt.types ?? []);
  if (types.includes("text/uri-list") || types.includes("text/html")) {
    return {
      error:
        "That came from a web page, not from a file on your device. Please save it to your device first, then drop or choose the saved file.",
    };
  }
  return { error: "Only files can be dropped here. Please drop a file from your device." };
}

export function tooLargeMessage(kind: "resource" | "timetable"): string {
  return kind === "resource"
    ? "This file is larger than 3 MB, which is the most the Resource Bank accepts. Please upload a smaller copy, or a screenshot of the part you need."
    : "This file is larger than 3 MB, which is the most Grasp accepts. Please upload a screenshot of your timetable instead.";
}

/** "image/heic" out of "data:image/heic;base64,…". */
export function dataUrlType(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl);
  return match ? match[1].toLowerCase() : "";
}

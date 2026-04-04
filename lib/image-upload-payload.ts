/** Max images per quiz when sourcing from pictures. */
export const MAX_IMAGE_UPLOAD_COUNT = 10;

export type ImageUploadItem = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
};

/**
 * Parses stored image request JSON. Supports legacy `{ fileName, mimeType, dataUrl }`
 * and multi-image `{ images: ImageUploadItem[] }`.
 */
export function parseImageUploadContent(content: string): ImageUploadItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) return [];

  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.images)) {
    return obj.images
      .filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" &&
          item !== null &&
          "dataUrl" in item &&
          typeof (item as { dataUrl: unknown }).dataUrl === "string",
      )
      .map((item) => ({
        fileName: typeof item.fileName === "string" ? item.fileName : "",
        mimeType: typeof item.mimeType === "string" ? item.mimeType : "",
        dataUrl: String(item.dataUrl),
      }));
  }

  if (typeof obj.dataUrl === "string") {
    return [
      {
        fileName: typeof obj.fileName === "string" ? obj.fileName : "",
        mimeType: typeof obj.mimeType === "string" ? obj.mimeType : "",
        dataUrl: obj.dataUrl,
      },
    ];
  }

  return [];
}

export function hasImageUploadData(items: ImageUploadItem[]): boolean {
  return items.some((item) => item.dataUrl.trim().length > 0);
}

export function serializeImageUploadPayload(images: ImageUploadItem[]): string {
  return JSON.stringify({ images });
}

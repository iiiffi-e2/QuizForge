/**
 * pdf.js reads `new DOMMatrix()` at module load time (before its own Node polyfill runs).
 * Next/Vercel bundling can prevent pdfjs from resolving `@napi-rs/canvas`, so we install
 * globals from the app root before importing `pdf-parse`.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const requireFromProject = createRequire(join(process.cwd(), "package.json"));

try {
  const canvas = requireFromProject("@napi-rs/canvas") as {
    DOMMatrix?: typeof DOMMatrix;
    ImageData?: typeof ImageData;
    Path2D?: typeof Path2D;
  };
  if (typeof globalThis.DOMMatrix === "undefined" && canvas.DOMMatrix) {
    globalThis.DOMMatrix = canvas.DOMMatrix;
  }
  if (typeof globalThis.ImageData === "undefined" && canvas.ImageData) {
    globalThis.ImageData = canvas.ImageData;
  }
  if (typeof globalThis.Path2D === "undefined" && canvas.Path2D) {
    globalThis.Path2D = canvas.Path2D;
  }
} catch {
  /* Native canvas may be unavailable in some environments; PDF routes will fail clearly. */
}

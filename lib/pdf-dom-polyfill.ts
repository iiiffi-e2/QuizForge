/**
 * pdf.js calls `new DOMMatrix()` at module load time, before its own Node polyfill runs.
 * Turbopack can load the external `pdf-parse` chunk before other route imports, so callers
 * must invoke `installPdfPolyfills()` synchronously, then `await import("pdf-parse")`.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

let installed = false;

export function installPdfPolyfills(): void {
  if (installed) return;

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
    /* Native canvas may be missing; fall back below for DOMMatrix. */
  }

  if (typeof globalThis.DOMMatrix === "undefined") {
    const Ctor = requireFromProject("dommatrix") as new (
      ...args: unknown[]
    ) => unknown;
    globalThis.DOMMatrix = Ctor as typeof globalThis.DOMMatrix;
  }

  if (typeof globalThis.DOMMatrix === "undefined") {
    throw new Error(
      "DOMMatrix is not available: PDF parsing requires @napi-rs/canvas or the dommatrix package.",
    );
  }

  installed = true;
}

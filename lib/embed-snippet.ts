/**
 * Build HTML snippet for declarative embed (see `public/embed/v1.js`).
 * Embeds require a short share id (`/quiz?sid=…`); long `?q=` URLs are not supported.
 */
export function buildEmbedSnippet(origin: string, sid: string): string {
  const base = origin.replace(/\/$/, "");
  const safe = sid
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  return `<div class="quizforge-embed" data-sid="${safe}"></div>
<script src="${base}/embed/v1.js" async defer></script>`;
}

/** Extract `sid` from a short share URL, or null if not a short link. */
export function extractShareSidFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const sid = u.searchParams.get("sid");
    return sid && sid.length > 0 ? sid : null;
  } catch {
    return null;
  }
}

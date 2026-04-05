/**
 * Absolute origin for canonical URLs, Open Graph, and embeds.
 * Prefer explicit site URL; fall back to Vercel preview/production URL.
 */
export function getSiteUrl(): URL {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.AUTH_URL?.trim();
  if (explicit) {
    return new URL(explicit.endsWith("/") ? explicit.slice(0, -1) : explicit);
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.startsWith("http") ? vercel : `https://${vercel}`;
    return new URL(host.endsWith("/") ? host.slice(0, -1) : host);
  }
  return new URL("http://localhost:3000");
}

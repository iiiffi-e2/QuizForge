# Reach & sharing (SEO, embeds, social previews) — design spec

**Status:** Approved — pending written spec review before implementation planning  
**Date:** 2026-04-04  
**Depends on:** Existing **short share links** (`/quiz?sid=…`, Upstash Redis, `app/api/share`), **`QuizSession`** shape (`lib/types.ts`)

## 1. Summary

Improve **distribution** and **discoverability** in two tracks: **(A)** rich **Open Graph / Twitter** metadata and **dynamic preview images** for shared quiz URLs, plus a **declarative script embed** that mounts a quiz on third-party pages; **(B)** **site-wide SEO** for indexable marketing routes (sitemap, robots, canonical URLs, default OG/Twitter, JSON-LD). Shared quiz URLs remain **not indexed** in search via **HTML `robots` metadata**, without blocking crawlers that must fetch the page to read OG tags.

## 2. Goals

### 2.1 Sharing & previews (A)

1. **Social previews:** For **`/quiz?sid=…`** (and equivalent share entry), HTML includes accurate **`title`**, **`description`**, **`og:image`** (dynamic per quiz), and **Twitter** card fields so Slack, Discord, iMessage, X, etc. render a useful card.
2. **Search indexing of shares:** Shared quiz URLs are **excluded from search index** using **`robots` meta** (e.g. `noindex`); **do not** rely on **`robots.txt` Disallow** for `/quiz`, or link preview crawlers may fail to retrieve OG tags (see §5).
3. **Embeds:** Third parties can embed a quiz using **declarative HTML only**: a **container** (e.g. `class="quizforge-embed"` + `data-sid`) and a **versioned script** URL (e.g. `/embed/v1.js`). The script **auto-discovers** containers and mounts the widget. No host-side JS API in v1.

### 2.2 Site SEO (B)

1. **`robots.ts`:** Allow crawling of routes that must remain fetchable for previews and normal site discovery; rules documented and consistent with §5.
2. **`sitemap.ts`:** Lists **indexable marketing URLs only**. The default set includes at least **`/`** and **`/create`**; add other routes only if they are public and intentionally indexable. Shared quiz URLs are **not** required in the sitemap.
3. **Marketing pages:** **Canonical URLs**, default **Open Graph** and **Twitter** metadata, and aligned **`metadataBase`** where applicable.
4. **Structured data:** JSON-LD on the primary landing page (e.g. **`WebSite`** + **`SoftwareApplication`**) with accurate name, description, and site URL.

## 3. Non-goals (v1)

- **Deep product analytics** (funnels, dashboards, third-party analytics suites) — not part of this spec.
- **Public profile URLs** or **indexable user pages** — remains out of scope relative to existing profile/account specs.
- **oEmbed** provider protocol — optional follow-up; not required for declarative embeds.
- **Host-side embed API** (e.g. `QuizForge.mount(...)`) — deferred; **S1** is declarative-only for v1.
- **Iframe-only embed** as the primary mechanism — script widget (**E3**) is the chosen v1 embed shape.

## 4. Product decisions (brainstorm lock-in)

| Decision | Choice |
|----------|--------|
| Priority pillars | **A** (share/embeds/previews) + **B** (site SEO) |
| Shared quiz URLs vs search | **Noindex** for indexing; previews must still work |
| Embed mechanism | **E3 — Script widget** |
| Host integration | **S1 — Declarative** (`div` + `data-sid` + script) |
| OG image | **I2 — Dynamic image per quiz** |
| Site SEO depth | **B3 — Canonical + site OG/Twitter + JSON-LD** (plus sitemap/robots) |

## 5. Critical rule: `robots.txt` vs meta `robots`

- **Do not** add a **`Disallow`** rule in **`robots.txt`** that prevents crawlers from fetching **`/quiz`** (or share URLs) if those URLs must support **Open Graph** link previews. Many preview fetchers respect **`robots.txt`**; blocking the HTML prevents reading **`og:*`** tags.
- **Indexing** suppression for shared quizzes is achieved with **`robots` meta** (or equivalent HTTP header) on the quiz response — e.g. **`noindex`**, with **`follow`** policy explicitly chosen in implementation (default: **`noindex, follow`** unless product dictates otherwise).

## 6. Architecture

| Concern | Choice |
|--------|--------|
| Quiz page structure | **Server** entry (Server Component) owns **`generateMetadata`**; existing quiz UI ships as **client** child (refactor from all-client **`/quiz`** as needed) |
| Metadata source for `sid` | Server resolves **`sid`** via the same **Upstash** (or share API) path used today; **timeouts and failure** → generic title/description and OG **fallback** image |
| Dynamic OG image | **`ImageResponse`** (`next/og`) and/or **`GET`** route (e.g. **`/api/og/quiz`**) returning a **cache-friendly** image; **branded fallback** when session missing or error |
| Embeds | **Same-origin** versioned script (e.g. **`/embed/v1.js`**) built or emitted as a **focused bundle** that mounts into **`.quizforge-embed`** nodes; reuses existing **fetch** semantics for **`sid`** |
| Site map / robots | Next.js **`sitemap.ts`**, **`robots.ts`** (`app` directory conventions) |

## 7. Quiz route — metadata and `noindex`

- **`generateMetadata`** (or equivalent) uses **`searchParams`** (e.g. **`sid`**) when present.
- Populate **`title`** and **`description`** from quiz/session fields (truncated/sanitized for HTML meta; no secrets or full raw uploads in description).
- Set **`openGraph`** and **`twitter`** including **`og:image`** URL pointing at the **dynamic** image endpoint for **I2**.
- Set **`robots`** so shared quiz URLs are **not indexed**; **invalid/expired `sid`:** still return safe generic metadata and **noindex** behavior consistent with “not a landing page we want in the index.”

## 8. Dynamic OG image (I2)

- One **template** (title + QuizForge branding) applied per resolved quiz.
- **Caching:** HTTP **`Cache-Control`** appropriate for immutable-ish **`sid`** content (implementation picks TTL; document trade-off between freshness and Redis load).
- **Failure:** Static or simplified **fallback** image (still valid **`og:image`**) when Redis or rendering fails.

## 9. Embeds (E3 + S1)

- **Documented snippet** (exact class names and **`data-*`** attributes fixed in implementation):
  - Container: e.g. **`<div class="quizforge-embed" data-sid="…"></div>`** (optional **`data-theme`** or similar only if implemented).
  - Script: **`async`** / **`defer`** load from versioned URL **`/embed/v1.js`** (path may be adjusted; **versioning** is mandatory for cache busting).
- **Behavior:** On load, script selects **all** matching containers and **mounts** one quiz instance per container.
- **Security:** Treat **`sid`** as an opaque id; **no** injection of unsanitized API strings into **`innerHTML`**; align with existing share fetch and CSP expectations; document required **CSP** directives for integrators (**`script-src`** your app origin).

## 10. Site-wide SEO (B3)

- **`sitemap.ts`:** Include only **public, indexable** routes (marketing surfaces). Exclude authenticated-only or non-indexable areas.
- **`robots.ts`:** Consistent with §5; **sitemap** reference included.
- **Per-page metadata** for **`/`** and **`/create`** (and other indexable pages): **canonical**, **Open Graph**, **Twitter**, matching **titles** and **descriptions**.
- **JSON-LD** on landing: **`WebSite`** and **`SoftwareApplication`** (or equivalent) with stable **`url`** and honest **`name`** / **`description`**.

## 11. User-facing surfaces (conceptual)

- **Share / results / create:** Copy **embed snippet** alongside **copy link** where product fits (exact placement in implementation plan).
- **Developers:** Short **docs** page or README section listing **snippet**, **CSP** notes, and **script URL**.

## 12. Testing (focus)

- **Integration or HTTP assertions:** Response HTML for **`/quiz?sid=…`** includes expected **OG/Twitter** tags and **`noindex`** (or equivalent) **robots** directive.
- **`robots.txt`** (from **`robots.ts`**) does **not** disallow paths required for **OG** fetchers to read shared quiz pages.
- **OG image** URL returns **200** for valid **`sid`**; **fallback** for invalid **`sid`**.
- **Sitemap** contains only **marketing** URLs.
- **Embed:** Minimal **HTML fixture** loads script and shows **mounted** widget (manual QA acceptable for v1 if automated test is costly).

## 13. Out of scope for this document

Exact **Prisma** or **Redis** key internals beyond current share behavior, **file-by-file** refactor steps, **embed** bundle toolchain details, and **migration** filenames — covered in the implementation plan after this spec is reviewed and approved.

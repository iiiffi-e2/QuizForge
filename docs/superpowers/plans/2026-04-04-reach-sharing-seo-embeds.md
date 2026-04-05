# Reach & sharing (SEO, embeds, social previews) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship server-rendered **metadata** and **dynamic OG images** for shared quiz URLs (`/quiz?sid=…`), **noindex** via meta robots (not `robots.txt` blocking), **site SEO** (`robots.ts`, `sitemap.ts`, canonical + OG/Twitter + JSON-LD on marketing routes), and a **declarative embed** (`/embed/v1.js` + `.quizforge-embed` + `data-sid`) per [spec](../specs/2026-04-04-reach-sharing-seo-embeds-design.md).

**Architecture:** Extract **server-side Redis resolution** of share ids into a shared module used by **`generateMetadata`**, **`GET /api/og/quiz`**, and the existing **`GET /api/share/[id]`** handler. Split **`/quiz`** into a **Server Component** page (metadata) + **client** child. **Embed v1:** a **small same-origin script** in **`public/embed/v1.js`** that injects a **same-origin iframe** to **`/quiz?sid=…&embed=1`** (script-as-integration satisfies “script widget”; avoids shipping a second full React bundle). **`embed=1`** trims chrome (no navbar, no redirect-to-home on empty session in embed).

**Tech Stack:** Next.js App Router (`generateMetadata`, `Metadata`, `ImageResponse` from `next/og`), Upstash Redis (`getRedis`), Vitest, existing `QuizSession` / share API.

---

## File map (create / modify)

| File | Responsibility |
|------|----------------|
| `lib/site-url.ts` | Resolve absolute site origin for `metadataBase`, OG URLs, embed iframe `src` (env fallbacks). |
| `lib/share-resolve.ts` | `SHARE_ID_PATTERN`, `getSharedQuizSessionById(id)` — Redis `share:${id}` + parse/validate (shared with API route). |
| `lib/quiz-share-meta.ts` | Pure helpers: title/description strings for meta + OG from `QuizSession` (truncate, strip unsafe). |
| `app/api/share/[id]/route.ts` | Call `getSharedQuizSessionById`; keep JSON response shape. |
| `app/api/og/quiz/route.ts` | `GET` — `ImageResponse` for `?sid=`; fallback image when missing/invalid. |
| `app/quiz/page.tsx` | Server: `generateMetadata`, default export → `QuizPageClient`. |
| `app/quiz/quiz-page-client.tsx` | Current quiz UI (from old `page.tsx`); props for `embed` mode via `useSearchParams`. |
| `app/layout.tsx` | `metadataBase`, broaden default `metadata` (og/twitter templates). |
| `app/robots.ts` | Allow crawlers; **no** `Disallow: /quiz`; point to sitemap. |
| `app/sitemap.ts` | `/`, `/create` only (until more indexable routes exist). |
| `app/page.tsx` | Import JSON-LD component or inline script for `WebSite` + `SoftwareApplication`. |
| `components/SiteJsonLd.tsx` | Server component emitting `<script type="application/ld+json">`. |
| `app/create/layout.tsx` | `metadata` + canonical for `/create`. |
| `public/embed/v1.js` | Declarative embed loader (iframe to `/quiz?…&embed=1`). |
| `.env.example` | `NEXT_PUBLIC_SITE_URL` (optional, for local OG absolutes). |
| `README.md` | Short “Embed” section (snippet + CSP). |
| `components/…` + `app/results/page.tsx` (and optionally `LibraryClient`) | “Copy embed code” next to share where UX fits. |
| `lib/quiz-share-meta.test.ts` | Tests for title/description helpers. |

---

### Task 1: Site URL helper

**Files:**
- Create: `lib/site-url.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add `getSiteUrl()`**

Create `lib/site-url.ts`:

```ts
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
```

- [ ] **Step 2: Document env in `.env.example`**

Add line (with comment):

```env
# Optional: canonical site URL for OG/sitemap/embeds (e.g. https://quizforge.example)
# NEXT_PUBLIC_SITE_URL=
```

- [ ] **Step 3: Commit**

```bash
git add lib/site-url.ts .env.example
git commit -m "feat(seo): add getSiteUrl helper for absolute URLs"
```

---

### Task 2: Shared Redis resolver for share ids

**Files:**
- Create: `lib/share-resolve.ts`
- Modify: `app/api/share/[id]/route.ts`

- [ ] **Step 1: Implement resolver**

Create `lib/share-resolve.ts` — move **`ID_PATTERN`** from the route as **`SHARE_ID_PATTERN`**, export **`getSharedQuizSessionById(id: string): Promise<QuizSession | null>`** that:

1. Returns **`null`** if Redis missing, id fails pattern, key missing, or payload invalid (same rules as current route).
2. Parses string vs object from Redis like the existing GET handler.
3. Validates `session.quiz.questions.length` before returning.

Import `getRedis` from `@/lib/upstash`, `QuizSession` from `@/lib/types`.

- [ ] **Step 2: Refactor `app/api/share/[id]/route.ts`**

Replace inline Redis logic with:

```ts
import { getSharedQuizSessionById } from "@/lib/share-resolve";

// inside GET:
const session = await getSharedQuizSessionById(id);
if (!session) {
  return NextResponse.json(
    { error: "This link has expired or is invalid." },
    { status: 404 },
  );
}
return NextResponse.json({ session });
```

Map **`null`** from resolver to the same HTTP statuses as today where appropriate (400 for bad id pattern — resolver can return **`null`** for invalid id vs missing — **implementation detail:** either return discriminated union or throw; **simplest:** check pattern in route before calling resolver, keep 400 for bad pattern, resolver only for valid pattern).

Preserve **`503`** when Redis is not configured: if `getRedis()` is null, return 503 before calling resolver.

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/share-resolve.ts app/api/share/[id]/route.ts
git commit -m "refactor(share): centralize Redis share payload resolution"
```

---

### Task 3: Pure metadata strings + tests

**Files:**
- Create: `lib/quiz-share-meta.ts`
- Create: `lib/quiz-share-meta.test.ts`

- [ ] **Step 1: Helpers**

Create `lib/quiz-share-meta.ts`:

```ts
import type { QuizSession } from "@/lib/types";

const MAX_TITLE = 70;
const MAX_DESC = 160;

function truncate(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + "…";
}

/** User-visible title for browser tab + OG (no raw file dumps). */
export function shareQuizMetaTitle(session: QuizSession): string {
  const topic = session.request.content?.trim();
  if (topic && topic.length <= 200 && !topic.startsWith("data:")) {
    return truncate(topic, MAX_TITLE);
  }
  return "Quiz on QuizForge";
}

export function shareQuizMetaDescription(session: QuizSession): string {
  const n = session.quiz.questions.length;
  const base = `Answer ${n} question${n === 1 ? "" : "s"} on QuizForge.`;
  return truncate(base, MAX_DESC);
}
```

Adjust **`topic`** heuristics if `input_type` is `file`/`image` — prefer a generic label when content is not human-readable (align with product: if `content` looks like base64 or too long, use `"Quiz on QuizForge"` for title).

- [ ] **Step 2: Vitest**

Create `lib/quiz-share-meta.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { shareQuizMetaDescription, shareQuizMetaTitle } from "@/lib/quiz-share-meta";
import type { QuizSession } from "@/lib/types";

const minimalSession = (content: string): QuizSession => ({
  request: {
    input_type: "topic",
    content,
    settings: {
      question_count: 5,
      difficulty: "medium",
      level: "general",
      mode: "test",
      source_behavior: "material_only",
      time_limit_seconds: null,
    },
  },
  quiz: {
    questions: [
      {
        question: "Q1",
        choices: ["a", "b", "c", "d"],
        correct_index: 0,
        explanation: "",
        source_snippet: "",
      },
    ],
  },
  created_at: new Date().toISOString(),
});

describe("shareQuizMetaTitle", () => {
  it("uses topic content when short", () => {
    expect(shareQuizMetaTitle(minimalSession("Photosynthesis"))).toContain("Photosynthesis");
  });
});

describe("shareQuizMetaDescription", () => {
  it("includes question count", () => {
    expect(shareQuizMetaDescription(minimalSession("x"))).toMatch(/1 question/);
  });
});
```

- [ ] **Step 3: Run**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/quiz-share-meta.ts lib/quiz-share-meta.test.ts
git commit -m "feat(seo): add quiz share title/description helpers for metadata"
```

---

### Task 4: Split `/quiz` + `generateMetadata`

**Files:**
- Create: `app/quiz/quiz-page-client.tsx` (move from `app/quiz/page.tsx`)
- Modify: `app/quiz/page.tsx` (new server wrapper)

- [ ] **Step 1: Move client implementation**

Rename/move the entire current **`"use client"`** contents of `app/quiz/page.tsx` to **`app/quiz/quiz-page-client.tsx`**, exporting **`export function QuizPageClient()`** (keep **`Suspense`** wrapper in server page — see Step 2).

- [ ] **Step 2: Server `page.tsx`**

New **`app/quiz/page.tsx`** (no `"use client"`):

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { getSharedQuizSessionById } from "@/lib/share-resolve";
import { shareQuizMetaDescription, shareQuizMetaTitle } from "@/lib/quiz-share-meta";
import { getSiteUrl } from "@/lib/site-url";
import { QuizPageClient } from "./quiz-page-client";

type PageProps = {
  searchParams: Promise<{ sid?: string | string[]; q?: string; embed?: string }>;
};

export async function generateMetadata(
  { searchParams }: PageProps,
): Promise<Metadata> {
  const sp = await searchParams;
  const raw = sp.sid;
  const sid = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  const site = getSiteUrl();
  const base: Metadata = {
    robots: { index: true, follow: true },
  };

  if (!sid) {
    return {
      ...base,
      title: "Take a quiz",
      description: "Take a quiz on QuizForge.",
    };
  }

  const session = await getSharedQuizSessionById(sid);
  const ogUrl = new URL("/api/og/quiz", site);
  ogUrl.searchParams.set("sid", sid);

  if (!session) {
    return {
      title: "Quiz | QuizForge",
      description: "This shared quiz is missing or expired.",
      robots: { index: false, follow: true },
      openGraph: {
        title: "Quiz | QuizForge",
        description: "This shared quiz is missing or expired.",
        url: new URL(`/quiz?sid=${encodeURIComponent(sid)}`, site).toString(),
        siteName: "QuizForge",
        images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: "QuizForge" }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Quiz | QuizForge",
        description: "This shared quiz is missing or expired.",
        images: [ogUrl.toString()],
      },
    };
  }

  const title = shareQuizMetaTitle(session);
  const description = shareQuizMetaDescription(session);
  const pageUrl = new URL(`/quiz?sid=${encodeURIComponent(sid)}`, site).toString();

  return {
    title: `${title} | QuizForge`,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "QuizForge",
      images: [{ url: ogUrl.toString(), width: 1200, height: 630, alt: title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl.toString()],
    },
  };
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <LoadingState
              primaryText="Loading quiz..."
              secondaryText="Preparing your questions."
            />
          </main>
        </div>
      }
    >
      <QuizPageClient />
    </Suspense>
  );
}
```

**Note:** When **`sid`** is absent but **`q`** is present, metadata can stay generic (“Take a quiz”) — no Redis fetch.

- [ ] **Step 3: `QuizPageClient` embed mode**

In **`quiz-page-client.tsx`**, read **`embed`** from **`useSearchParams()`**:

- If **`embed=1`** (or `true`): **do not render `Navbar`**; use a compact wrapper; on load error show a short message **inside** the embed container **without** `router.replace("/")` for missing session (show “Quiz unavailable” instead).

- [ ] **Step 4: Build**

```bash
npm run build
```

Fix any type errors (`PageProps` must match Next’s **`searchParams: Promise<...>`**).

- [ ] **Step 5: Commit**

```bash
git add app/quiz/page.tsx app/quiz/quiz-page-client.tsx
git commit -m "feat(quiz): add generateMetadata for shared quiz URLs"
```

---

### Task 5: Dynamic OG image route

**Files:**
- Create: `app/api/og/quiz/route.tsx`

- [ ] **Step 1: Implement `GET`**

Use **`ImageResponse`** from **`next/og`**. Read **`sid`** from **`request.url`**. Load session via **`getSharedQuizSessionById`**. Render a **1200×630** image: QuizForge label + **`shareQuizMetaTitle`** (or “Quiz unavailable”).

Set headers:

```ts
headers: {
  "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
},
```

Use **`export const runtime = "edge"`** only if compatible with Upstash in edge (Upstash REST works on Edge — verify env availability on Vercel Edge). If Edge blocks Redis, use **Node runtime** (omit edge export).

- [ ] **Step 2: Manual check**

```bash
npm run dev
```

Open `/api/og/quiz?sid=<valid>` — browser shows PNG.

- [ ] **Step 3: Commit**

```bash
git add app/api/og/quiz/route.tsx
git commit -m "feat(seo): add dynamic OG image for shared quizzes"
```

---

### Task 6: Root layout metadata + JSON-LD + create layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/SiteJsonLd.tsx`
- Modify: `app/page.tsx`
- Create: `app/create/layout.tsx`

- [ ] **Step 1: Root `metadataBase` and defaults**

In **`app/layout.tsx`**, import **`getSiteUrl`** (note: **`getSiteUrl` uses `process.env`** — works in server layout). Set:

```ts
import { getSiteUrl } from "@/lib/site-url";

const site = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: site,
  title: {
    default: "QuizForge",
    template: "%s | QuizForge",
  },
  description: "Turn anything into a quiz",
  openGraph: {
    type: "website",
    siteName: "QuizForge",
    locale: "en_US",
    url: site,
  },
  twitter: {
    card: "summary_large_image",
  },
};
```

Omit **`twitter.site`** / **`creator`** unless you have a real X handle (avoid placeholder values).

- [ ] **Step 2: `SiteJsonLd`**

`components/SiteJsonLd.tsx` — server component, **`getSiteUrl()`**, emit single **`<script type="application/ld+json">`** with **`@context`**, **`@graph`** array with **`WebSite`** and **`SoftwareApplication`** (`name`, `description`, `url`).

- [ ] **Step 3: `app/create/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: "Create a quiz",
  description:
    "Generate a quiz from a topic, text, file, image, or link — tune difficulty and length.",
  alternates: { canonical: new URL("/create", site).toString() },
  openGraph: {
    title: "Create a quiz | QuizForge",
    description:
      "Generate a quiz from a topic, text, file, image, or link — tune difficulty and length.",
    url: new URL("/create", site).toString(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a quiz | QuizForge",
    description:
      "Generate a quiz from a topic, text, file, image, or link — tune difficulty and length.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 4: Home canonical + OG URL + JSON-LD**

At the top of **`app/page.tsx`** (server component, no `"use client"`), add:

```ts
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const site = getSiteUrl();

export const metadata: Metadata = {
  alternates: { canonical: site.toString() },
  openGraph: {
    title: "QuizForge",
    description: "Turn anything into a quiz",
    url: site.toString(),
  },
  twitter: {
    card: "summary_large_image",
    title: "QuizForge",
    description: "Turn anything into a quiz",
  },
};
```

Render **`<SiteJsonLd />`** as the first child inside the outer **`div`** of **`LandingPage`**.

- [ ] **Step 5: Build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx app/page.tsx components/SiteJsonLd.tsx app/create/layout.tsx
git commit -m "feat(seo): metadataBase, marketing metadata, and JSON-LD"
```

---

### Task 7: `robots.ts` and `sitemap.ts`

**Files:**
- Create: `app/robots.ts`
- Create: `app/sitemap.ts`

- [ ] **Step 1: `app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().origin;
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/create`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];
}
```

- [ ] **Step 2: `app/robots.ts`**

```ts
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl().origin;
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
```

**Do not** add **`Disallow: /quiz`**.

- [ ] **Step 3: `npm run build`**

- [ ] **Step 4: Commit**

```bash
git add app/robots.ts app/sitemap.ts
git commit -m "feat(seo): add robots.txt and sitemap"
```

---

### Task 8: Embed script + `public/embed/v1.js`

**Files:**
- Create: `public/embed/v1.js`
- Modify: `app/quiz/quiz-page-client.tsx` (embed mode — completed in Task 4 if not)

- [ ] **Step 1: Script**

Implement **`public/embed/v1.js`** as an IIFE that:

1. Determines **`origin`** from **`document.currentScript.src`** (fallback: `location.origin` if same-origin test page).
2. Selects **`document.querySelectorAll(".quizforge-embed")`**.
3. For each element with **`data-sid`**, clears **optional** loading state, appends **iframe** with  
   **`src="${origin}/quiz?sid=${encodeURIComponent(sid)}&embed=1"`**  
   **`title="QuizForge quiz"`**, **`loading="lazy"`**, **`style`**: width **100%**, minHeight **520px**, border **0**.

4. Idempotent: skip if already processed (**`data-qf-mounted`**).

- [ ] **Step 2: README**

Add **“Embed”** subsection: snippet, **`frame-src` + `script-src`**, script URL **`/embed/v1.js`**.

- [ ] **Step 3: Commit**

```bash
git add public/embed/v1.js README.md
git commit -m "feat(embed): add v1 declarative embed script"
```

---

### Task 9: Copy embed snippet in UI

**Files:**
- Modify: `app/results/page.tsx` (and optionally `components/LibraryClient.tsx`)

- [ ] **Step 1: Helper**

Add **`buildEmbedSnippet(origin: string, sid: string): string`** in **`lib/embed-snippet.ts`** (or inline in component) returning multiline string with **`div.quizforge-embed`** + **script src** absolute URL.

Extract **`sid`** from short URL returned by **`createShortShareUrl`** — parse **`new URL(url).searchParams.get("sid")`** when path is **`/quiz`**.

- [ ] **Step 2: Results UI**

After successful short link creation, show secondary button **“Copy embed code”** that copies snippet to clipboard (reuse toast patterns).

- [ ] **Step 3: Optional library**

Repeat for **`LibraryClient`** share success path.

- [ ] **Step 4: Commit**

```bash
git add app/results/page.tsx lib/embed-snippet.ts components/LibraryClient.tsx
git commit -m "feat(embed): copy embed snippet from results and library"
```

---

### Task 10: Verification

- [ ] **Step 1: Automated**

```bash
npm run test
npm run build
npm run lint
```

- [ ] **Step 2: Manual checklist**

1. View source on **`/quiz?sid=VALID`** — contains **`og:title`**, **`og:image`**, **`robots`** content **`noindex`** (or **`max-image-preview`** — verify actual meta tag output).
2. **`/robots.txt`** — allows **`/`**, references sitemap; **no** disallow for **`/quiz`**.
3. **`/sitemap.xml`** — only **`/`** and **`/create`**.
4. Embed fixture: HTML file with **`div`** + script **`src="/embed/v1.js"`** — iframe loads quiz.

- [ ] **Step 3: Final commit** (if any doc/test fixes)

---

## Spec coverage check

| Spec section | Plan tasks |
|--------------|------------|
| §2.1 Social previews + noindex | Tasks 4–5, 6 (metadataBase), 7 |
| §2.1 Embeds declarative | Tasks 8–9 |
| §2.2 Site SEO B3 | Tasks 1, 6, 7 |
| §5 robots.txt vs meta | Task 7 explicit |
| §8 Dynamic OG I2 | Task 5 |
| §9 Embeds security/CSP | Task 8 README |
| §12 Testing | Task 3, 10 |

## Plan self-review

- No **TBD** tasks; **Twitter `@`** placeholder must be removed or replaced with real handle during implementation.
- **`generateMetadata`** and **`getSharedQuizSessionById`** may duplicate Redis reads with the client **`fetch`** — acceptable; optionally add **`React.cache`** around resolver in a follow-up.

---

**Plan complete** — saved to `docs/superpowers/plans/2026-04-04-reach-sharing-seo-embeds.md`.

**Execution options:**

1. **Subagent-driven (recommended)** — Fresh subagent per task, review between tasks. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

2. **Inline execution** — Run tasks in this session with checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

Which approach do you want?

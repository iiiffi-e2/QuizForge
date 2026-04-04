# Accounts & persistence (solo v1) — design spec

**Status:** Approved for implementation planning  
**Date:** 2026-04-04  
**Stack decision:** Auth.js + Prisma + Neon PostgreSQL + transactional email (e.g. Resend) for magic links

## 1. Summary

Add **email magic-link sign-in**, **per-user saved quizzes** stored in **PostgreSQL**, and a **library** UI to list, open, and delete saves. Anonymous generate → take → share flows remain; **Upstash Redis** continues to power **short share links** only, not the library.

## 2. Goals

1. **Authentication:** Users sign in with **email (magic link)** and remain signed in across visits (standard session behavior for the chosen Auth.js configuration).
2. **Save:** Authenticated users can **persist** a quiz as a **`QuizSession` snapshot** (same shape as today: `request`, `quiz`, `created_at` per `lib/types.ts`).
3. **Library:** Authenticated users can **list** saved quizzes, **open** one (hydrate the app with that session), and **delete** their own saves.
4. **Compatibility:** **Unauthenticated** users keep current behavior: generation, local drafts (`lib/quiz-storage` patterns), and share links **without** requiring an account.

## 3. Non-goals (v1)

- Teams, organizations, roles, invitations, or billing.
- Using Redis as the source of truth for saved quizzes (library is **Postgres**).
- Replacing or changing the **semantic contract** of `QuizSession` / share APIs beyond adding **user-scoped** persistence.

## 4. Architecture

| Concern | Choice |
|--------|--------|
| Auth | Auth.js (v5) with Email provider (magic link) |
| ORM / migrations | Prisma |
| Database | PostgreSQL on Neon (serverless-friendly; `DATABASE_URL` on Vercel) |
| Magic-link delivery | Transactional email API (e.g. Resend); Auth.js sends the link using provider config |
| Ephemeral shares | Existing Upstash flow (`/api/share`, TTL, slim payload) unchanged in purpose |

**Saved quiz storage:** A dedicated table (e.g. `SavedQuiz`) keyed by **user id** (from Auth.js user model), holding a **JSONB** column with the full `QuizSession` document.

**Payload limit:** Reject saves whose serialized `QuizSession` exceeds a **maximum size** aligned with existing share constraints (order of magnitude: **~900 KB** UTF-8, consistent with `MAX_PAYLOAD_BYTES` in `app/api/share/route.ts`). Return a clear client-facing error if exceeded.

## 5. Data model (application)

- **`SavedQuiz` (conceptual):**
  - `id` — opaque primary key (cuid/uuid).
  - `userId` — foreign key to Auth.js `User` (or equivalent).
  - `title` — string; default derived from request (e.g. topic line or truncated source) when the user does not provide one.
  - `session` — JSONB storing a valid `QuizSession` object.
  - `createdAt`, `updatedAt` — ISO timestamps for list ordering and display.

Exact Prisma models MUST include whatever **Auth.js Prisma adapter** requires (`User`, `Account`, `Session`, `VerificationToken`, etc.) plus `SavedQuiz` as above.

## 6. User flows

### 6.1 Sign in / sign out

- **Entry:** Navbar and/or landing: **Sign in** / **Sign out**; when signed in, link to **Library** (route name e.g. `/library`).
- **Magic link:** User enters email → receives link → completes sign-in → redirected back to the app (callback URL consistent with `AUTH_URL` in production).

### 6.2 Save

- **Primary placement:** After a successful run, especially **Results** (and optionally post-generation on **Create**): control **“Save to library”**.
- If **not signed in:** prompt to sign in (or disable with explanation), not a silent failure.
- **Idempotency:** v1 may treat each save as a **new row** unless the product later adds “update existing”; spec does not require deduplication in v1.

### 6.3 Library

- **List:** Newest first; show title, date; actions **Open** and **Delete** (delete uses a confirmation step).
- **Open:** Load `QuizSession` into the same client/server paths used today so **take** and **results** behave like an in-session quiz (no new question semantics).

### 6.4 Sharing (unchanged in role)

- Short/long share links remain **anonymous share artifacts**; a saved quiz MAY offer “share” by reusing existing share UX on the loaded session, without requiring library data in Redis beyond current behavior.

## 7. API / security

- **Routes** that create, list, read, or delete `SavedQuiz` records MUST:
  - Require an authenticated session.
  - Scope every query by **current user id** (no cross-user reads or writes).
- **Environment:** `DATABASE_URL`, `AUTH_SECRET`, deployment **`AUTH_URL`** (or equivalent) for correct magic-link targets, plus email provider credentials.
- Existing **moderation** and **generation** behavior stays on server routes as implemented today.

## 8. Errors (user-visible)

- Not signed in when performing a protected action.
- Save rejected: payload too large; invalid session shape; server/database unavailable (short, honest message).
- Magic link invalid or expired (standard Auth.js messaging).

## 9. Testing (focus)

- **Authorization:** Cannot access another user’s saved quiz by id (API and UI).
- **CRUD:** Create/list/delete for the owning user; open returns the stored `QuizSession` shape.
- **Regression:** Anonymous flows still work without `DATABASE_URL` / auth configured in dev (document any required flags or env for local auth testing).

## 10. Out of scope for this document

Implementation steps, file-by-file changes, and Prisma migration filenames — covered in a separate implementation plan after this spec is reviewed.

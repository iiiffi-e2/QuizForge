# Profile dashboard & quiz attempts — design spec

**Status:** Draft — pending product review  
**Date:** 2026-04-04  
**Depends on:** [Accounts & persistence (solo v1)](2026-04-04-accounts-persistence-design.md) — Auth.js `User`, `SavedQuiz`, `/library`

## 1. Summary

Add a **private** **`/profile`** page with a **dashboard layout** aligned to the QuizForge home mock (gradient hero, main column + sidebar). **Progress statistics** are **real**: backed by a new **`QuizAttempt`** table and a **server-validated** API that records completed quizzes for **signed-in** users only. **Library** (`SavedQuiz`) remains the source of truth for **saved** quizzes; **attempts** represent **finished runs** used for stats and recent activity.

## 2. Goals

1. **Profile page:** Authenticated users can open **`/profile`** and see identity (display-oriented), **aggregate stats** from attempts, **recent activity** from attempts, and clear paths to **Create** and **Library**.
2. **Attempt persistence:** When a signed-in user completes a quiz and reaches **Results**, persist a **QuizAttempt** row with **server-computed** score (from `QuizSession` + `answers`, validated like save/share flows).
3. **Navigation:** Signed-in users can reach **Profile** from the **navbar** alongside existing links.
4. **Public-ready UX:** Hero uses **name / avatar / safe fallback**; **email** is not the headline. No public profile URLs in this spec.

## 3. Non-goals (v1)

- **Public** profile pages, handles, or follower models.
- **Merging** anonymous or pre-sign-in history into attempts (signed-in-only recording).
- **Presets**, **Categories**, **History** as full standalone features, or **Adjust defaults** unless wired to real settings later.
- **Linking** `QuizAttempt` to `SavedQuiz` (optional follow-up).

## 4. Product decisions (brainstorm lock-in)

| Decision | Choice |
|----------|--------|
| Profile layout | **A — Dashboard** (gradient hero, two-column main + sidebar) |
| Stats | **C — Real persistence** (no fake averages) |
| Attempt scope | **A — Signed-in only** (record only when authenticated at completion) |
| Visibility | **B — Private v1, public-ready** (identity presentation separated from email) |

## 5. Architecture

| Concern | Choice |
|--------|--------|
| Attempt storage | PostgreSQL via Prisma (`QuizAttempt` model) |
| Score authority | **Server** recomputes from submitted `QuizSession` + `answers[]` after validation |
| Completion trigger | User reaches **`/results`** after a finished quiz (including timer expiry), same as today |
| Idempotency | Duplicate submissions must not create duplicate rows or inflate aggregates (dedupe key or equivalent) |

## 6. Data model

**`QuizAttempt` (conceptual):**

- `id` — opaque primary key (cuid).
- `userId` — FK to `User`, indexed for list/aggregate queries.
- `completedAt` — timestamp when the attempt was recorded (server).
- `score` — number correct (integer).
- `questionCount` — total questions (integer).
- `title` or short **display label** (optional, derived from `QuizGenerationRequest` / topic for list UI).

**Aggregates for profile:**

- **Quizzes taken:** `COUNT(*)` of attempts for `userId`.
- **Average score:** Single consistent definition — e.g. mean of `(score / questionCount)` across attempts, or mean of percentage; implementation must pick one and use it everywhere.

**Relationship to `SavedQuiz`:**

- **Attempts** = completed runs (stats + recent activity).
- **Saved quizzes** = explicit saves; **list/detail** remains **`/library`**. No requirement to deduplicate or join in v1.

## 7. API & security

- **`POST /api/quiz-attempts`** (name may be adjusted in implementation if routing conventions differ): accepts **authenticated** requests only; body contains **`QuizSession` + `answers`** (or equivalent validated shape); size limits aligned with existing **`QuizSession`** persistence (~order of magnitude: existing save/share caps).
- **Scope:** Inserts always use **`session.user.id`**; no client-supplied `userId`.
- **Read paths** for profile: server components or route handlers query **only** the current user’s attempts.

## 8. UI — `/profile`

- **Access:** `auth()` required; unauthenticated users **redirect** to sign-in with `callbackUrl=/profile` (same pattern as `/library`).
- **Hero:** Greeting using **`User.name`** with **fallback** (e.g. email local-part) when name absent; **avatar** from `User.image` or initials; **primary CTAs:** Create, Library. Omit **Adjust defaults** unless a defaults feature exists.
- **Main column:** **Recent activity** from recent **`QuizAttempt`** rows (newest first); secondary **library** teaser linking to **`/library`** (not a full duplicate of library).
- **Sidebar:** **Your progress** — quizzes taken + average score from DB; **empty state** when zero attempts; **Pro tip** — static copy, optional.
- **Account:** **Email** (and similar) in a clearly **account** subsection, not in the hero.

## 9. Results page integration

- On **Results**, if **authenticated**, **POST** the attempt after validation. **Failure** is **non-blocking**: user still sees results; show a small **non-blocking** error if persistence fails.
- **Unauthenticated:** no POST; behavior unchanged from today.

## 10. Errors (user-visible)

- Invalid payload / oversized body: short message; no row created.
- Not authenticated: protected routes redirect; attempt POST not called from client.
- Idempotent replay: success without duplicate logical attempts.

## 11. Testing (focus)

- **Authorization:** Cannot read or create attempts for another user.
- **Score correctness:** Server score matches expected values for fixture `QuizSession` + `answers`.
- **Idempotency:** Repeated POST does not increase attempt count or distort averages.
- **Regression:** Anonymous generate → quiz → results still works without DB writes.

## 12. Out of scope for this document

Implementation file list, route naming beyond concepts, Prisma migration filenames, and detailed **Retake** behavior — covered in the implementation plan after this spec is approved.

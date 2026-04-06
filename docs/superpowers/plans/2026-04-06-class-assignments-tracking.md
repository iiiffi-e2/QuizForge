# Class assignments & tracked sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship teacher-owned **assignments** with frozen **quiz snapshots**, **assignment URLs** (`?aid=`) plus **join-code** fallback, **guest or signed-in** submissions, **server-scored** `AssignmentSubmission` rows, **teacher list + submission rollup**, and **profile-consistent** `QuizAttempt` for authenticated finishers—per [2026-04-06-class-assignments-tracking-design.md](../specs/2026-04-06-class-assignments-tracking-design.md).

**Architecture:** Prisma models **`Assignment`** and **`AssignmentSubmission`**; teachers create from **`SavedQuiz`** (copy `session` JSON into `quizSnapshot`). Students load play payload via **`GET /api/assignments/public/[publicId]`**; submit via **`POST /api/assignment-submissions`** (server loads snapshot, validates answers with shared helper extracted from **`lib/quiz-attempt.ts`**). **Join-code resolve** and **submit** use **Upstash Redis** sliding counters when configured (`getRedis()`), otherwise allow-all in dev. **`/quiz`** gains **`aid`** handling; **`/results`** posts assignment submission when assignment context is present, then existing **`QuizAttempt`** flow for signed-in users.

**Tech Stack:** Next.js App Router (16.x), TypeScript, Auth.js v5, Prisma 7, PostgreSQL, `@upstash/redis`, `nanoid`, Vitest.

---

## File structure (create / modify)

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | `Assignment`, `AssignmentSubmission`, `AssignmentStatus` enum; relations on `User`, `SavedQuiz` |
| `prisma/migrations/*` | Generated migration |
| `lib/quiz-attempt.ts` | Extract **`parseAnswersForSession(session, answers)`**; keep **`parseQuizAttemptPayload`** calling it |
| `lib/quiz-attempt.test.ts` | Extend tests for extracted helper (if not already covered indirectly) |
| `lib/assignment-submission.ts` | **`parseAssignmentSubmitBody`**, **`normalizeJoinCode`**, **`assertDisplayNameForGuest`** |
| `lib/assignment-submission.test.ts` | Vitest for body parsing + guest name rules |
| `lib/assignment-join-code.ts` | **`generateJoinCode()`** — 8 chars, unambiguous alphabet; collision-safe create loop |
| `lib/rate-limit-redis.ts` | **`allowRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>`** using `getRedis()` |
| `lib/rate-limit-ip.ts` | **`getClientIp(request: Request): string`** — `x-forwarded-for` first hop or `unknown` |
| `app/api/assignments/route.ts` | **`GET`** list (auth), **`POST`** create from `savedQuizId` |
| `app/api/assignments/[id]/route.ts` | **`PATCH`** `status` → `CLOSED` (auth + owner) |
| `app/api/assignments/[id]/submissions/route.ts` | **`GET`** submissions (auth + owner) |
| `app/api/assignments/public/[publicId]/route.ts` | **`GET`** public play payload (active only) |
| `app/api/assignments/resolve-code/route.ts` | **`GET`** `?code=` → `{ publicId }` or 404 |
| `app/api/assignment-submissions/route.ts` | **`POST`** create submission (optional auth) |
| `app/assignments/page.tsx` | Server: auth gate; list assignments + link to detail |
| `app/assignments/[publicId]/page.tsx` | Server + client: submissions table for owner (validate `publicId` ownership via Prisma) |
| `components/AssignmentsListClient.tsx` | Client table, copy link/code, close assignment |
| `components/AssignmentSubmissionsClient.tsx` | Read-only submissions list |
| `components/LibraryClient.tsx` | **Create assignment** action per row (calls `POST /api/assignments`, shows toast + link) |
| `components/Navbar.tsx` | Nav link **Assignments** when signed in |
| `app/quiz/quiz-page-client.tsx` | `aid` search param; fetch public assignment; guest name gate; `joinCode` query resolve path |
| `app/results/page.tsx` | If assignment context: **`POST /api/assignment-submissions`** then keep **`QuizAttempt`** for authed users |
| `lib/quiz-storage.ts` (optional) | Keys for `assignmentPublicId` / guest display name — or use `sessionStorage` only in components |

---

### Task 1: Prisma schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_assignment_models/migration.sql` (via CLI)

- [ ] **Step 1: Extend `User` and `SavedQuiz`**

On `User`, add:

```prisma
  ownedAssignments       Assignment[]
  assignmentSubmissions  AssignmentSubmission[]
```

On `SavedQuiz`, add:

```prisma
  assignments Assignment[]
```

- [ ] **Step 2: Add enum and models** (after `QuizAttempt`)

```prisma
enum AssignmentStatus {
  ACTIVE
  CLOSED
}

model Assignment {
  id                String                 @id @default(cuid())
  publicId          String                 @unique
  joinCode          String                 @unique @db.VarChar(16)
  ownerId           String
  owner             User                   @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title             String                 @db.VarChar(200)
  quizSnapshot      Json
  sourceSavedQuizId String?
  sourceSavedQuiz   SavedQuiz?             @relation(fields: [sourceSavedQuizId], references: [id], onDelete: SetNull)
  status            AssignmentStatus       @default(ACTIVE)
  createdAt         DateTime               @default(now())
  closedAt          DateTime?
  submissions       AssignmentSubmission[]

  @@index([ownerId, createdAt])
}

model AssignmentSubmission {
  id             String     @id @default(cuid())
  assignmentId   String
  assignment     Assignment @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  userId         String?
  user           User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  displayName    String?    @db.VarChar(80)
  score          Int
  questionCount  Int
  completedAt    DateTime   @default(now())
  idempotencyKey String     @db.VarChar(128)

  @@unique([assignmentId, idempotencyKey])
  @@unique([assignmentId, userId])
  @@index([assignmentId, completedAt])
}
```

- [ ] **Step 3: Migrate**

Run:

```bash
cd c:\Projects\QuizForge
npx prisma migrate dev --name add_assignment_models
```

Expected: migration applies; `prisma generate` succeeds.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add Assignment and AssignmentSubmission"
```

---

### Task 2: Extract `parseAnswersForSession` in `lib/quiz-attempt.ts`

**Files:**
- Modify: `lib/quiz-attempt.ts`
- Modify: `lib/quiz-attempt.test.ts`

- [ ] **Step 1: Add exported helper and refactor**

In `lib/quiz-attempt.ts`, add:

```typescript
export function parseAnswersForSession(
  session: QuizSession,
  answers: unknown,
): number[] {
  if (!Array.isArray(answers)) {
    throw new Error("answers must be an array.");
  }
  const n = session.quiz.questions.length;
  if (answers.length !== n) {
    throw new Error("answers length must match number of questions.");
  }
  for (const a of answers) {
    if (!isValidChoiceIndex(a)) {
      throw new Error("Each answer must be an integer from -1 to 3.");
    }
  }
  return answers as number[];
}
```

Replace the duplicated block inside `parseQuizAttemptPayload` with:

```typescript
  const answers = parseAnswersForSession(session, rawAnswers);
```

Keep `getScore(session.quiz.questions, answers)` unchanged after that.

- [ ] **Step 2: Add Vitest for helper**

In `lib/quiz-attempt.test.ts`, add a test that `parseAnswersForSession` throws on length mismatch and returns the array on success (reuse `minimalSession` from existing tests if present).

Run:

```bash
npm run test -- lib/quiz-attempt.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add lib/quiz-attempt.ts lib/quiz-attempt.test.ts
git commit -m "refactor: extract parseAnswersForSession for reuse"
```

---

### Task 3: Join code generator

**Files:**
- Create: `lib/assignment-join-code.ts`
- Create: `lib/assignment-join-code.test.ts`

- [ ] **Step 1: Write failing test**

`lib/assignment-join-code.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { generateJoinCode } from "./assignment-join-code";

describe("generateJoinCode", () => {
  it("returns 8 uppercase alphanumeric chars from unambiguous set", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });
});
```

Run:

```bash
npm run test -- lib/assignment-join-code.test.ts
```

Expected: FAIL (module missing).

- [ ] **Step 2: Implement**

`lib/assignment-join-code.ts`:

```typescript
import { customAlphabet } from "nanoid";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const nanoid8 = customAlphabet(alphabet, 8);

export function generateJoinCode(): string {
  return nanoid8();
}
```

Run tests again — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/assignment-join-code.ts lib/assignment-join-code.test.ts
git commit -m "feat: add assignment join code generator"
```

---

### Task 4: Assignment submission parsing helpers + tests

**Files:**
- Create: `lib/assignment-submission.ts`
- Create: `lib/assignment-submission.test.ts`

- [ ] **Step 1: Tests first**

`lib/assignment-submission.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  assertDisplayNameForGuest,
  normalizeJoinCode,
  parseAssignmentIdempotencyKey,
} from "./assignment-submission";

describe("normalizeJoinCode", () => {
  it("strips non-alphanumerics and uppercases", () => {
    expect(normalizeJoinCode("  ab-cd-12  ")).toBe("ABCD12");
  });
});

describe("assertDisplayNameForGuest", () => {
  it("throws when empty", () => {
    expect(() => assertDisplayNameForGuest("   ")).toThrow(/name/i);
  });
  it("returns trimmed string", () => {
    expect(assertDisplayNameForGuest("  Ada  ")).toBe("Ada");
  });
});

describe("parseAssignmentIdempotencyKey", () => {
  it("throws when missing", () => {
    expect(() => parseAssignmentIdempotencyKey("")).toThrow();
  });
});
```

Run — Expected: FAIL.

- [ ] **Step 2: Implement**

`lib/assignment-submission.ts`:

```typescript
const MAX_IDEMPOTENCY_KEY_LEN = 128;
const MAX_DISPLAY_NAME_LEN = 80;

export function normalizeJoinCode(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function assertDisplayNameForGuest(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("Display name is required.");
  }
  const t = raw.trim();
  if (!t.length) {
    throw new Error("Display name is required.");
  }
  if (t.length > MAX_DISPLAY_NAME_LEN) {
    throw new Error("Display name is too long.");
  }
  return t;
}

export function parseAssignmentIdempotencyKey(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("idempotencyKey is required.");
  }
  const key = raw.trim();
  if (key.length > MAX_IDEMPOTENCY_KEY_LEN) {
    throw new Error("idempotencyKey is too long.");
  }
  return key;
}
```

Run:

```bash
npm run test -- lib/assignment-submission.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/assignment-submission.ts lib/assignment-submission.test.ts
git commit -m "feat: add assignment submission parse helpers"
```

---

### Task 5: Redis rate limit helper + client IP

**Files:**
- Create: `lib/rate-limit-redis.ts`
- Create: `lib/rate-limit-ip.ts`

- [ ] **Step 1: Implement `getClientIp`**

`lib/rate-limit-ip.ts`:

```typescript
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
```

- [ ] **Step 2: Implement rate limit**

`lib/rate-limit-redis.ts`:

```typescript
import { getRedis } from "@/lib/upstash";

/**
 * Returns true if under limit, false if exceeded.
 * If Redis is not configured, always returns true (dev / no Upstash).
 */
export async function allowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, windowSeconds);
  }
  return n <= limit;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit-redis.ts lib/rate-limit-ip.ts
git commit -m "feat: add Redis sliding rate limit helper and client IP"
```

---

### Task 6: `POST /api/assignments` and `GET /api/assignments`

**Files:**
- Create: `app/api/assignments/route.ts`

- [ ] **Step 1: Implement POST (create)**

Use `auth()` from `@/lib/auth`, `prisma` from `@/lib/prisma`, `customAlphabet` or `nanoid` for `publicId` (e.g. length 12), `generateJoinCode()`, retry up to **5** times on `P2002` for `joinCode`/`publicId` collision.

Load `SavedQuiz` where `userId` = session user and `id` = body `savedQuizId`. Copy `savedQuiz.session` into variable, run `assertValidQuizSessionForSave(session)` from `@/lib/saved-quiz`, derive title via `deriveDefaultTitle(session.request)`.

Create `Assignment` with `quizSnapshot: session as object` (Prisma Json).

Response `201`:

```json
{
  "id": "<cuid>",
  "publicId": "<nanoid>",
  "joinCode": "<code>",
  "title": "<string>",
  "assignmentUrl": "https://<origin>/quiz?aid=<publicId>"
}
```

- [ ] **Step 2: Implement GET (list)**

`auth()` required. `prisma.assignment.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" }, include: { _count: { select: { submissions: true } } } })`.

Map to JSON without `quizSnapshot`.

- [ ] **Step 3: Manual smoke**

With dev server and logged-in session, `POST` with valid `savedQuizId`, then `GET`. Expected: row in DB.

- [ ] **Step 4: Commit**

```bash
git add app/api/assignments/route.ts
git commit -m "feat(api): add assignments list and create"
```

---

### Task 7: `PATCH /api/assignments/[id]` and `GET` submissions

**Files:**
- Create: `app/api/assignments/[id]/route.ts`
- Create: `app/api/assignments/[id]/submissions/route.ts`

- [ ] **Step 1: PATCH close**

Resolve `params.id` as **internal** `Assignment.id` (cuid). `auth()` required. `updateMany` where `id` and `ownerId` — set `status: CLOSED`, `closedAt: new Date()`. Return `404` if count 0.

- [ ] **Step 2: GET submissions**

Same ownership check. `findMany` on `assignmentSubmission` where `assignmentId`, order by `completedAt` desc. Return:

```typescript
{
  submissions: Array<{
    id: string;
    score: number;
    questionCount: number;
    completedAt: string;
    displayName: string | null;
    userId: string | null;
  }>;
}
```

For signed-in rows, set `displayLabel` in API as `user.name ?? email local part` (join `user` select `name`, `email`) — spec: roster label from account.

- [ ] **Step 3: Commit**

```bash
git add "app/api/assignments/[id]/route.ts" "app/api/assignments/[id]/submissions/route.ts"
git commit -m "feat(api): close assignment and list submissions"
```

---

### Task 8: Public play + resolve code

**Files:**
- Create: `app/api/assignments/public/[publicId]/route.ts`
- Create: `app/api/assignments/resolve-code/route.ts`

- [ ] **Step 1: GET public by publicId**

No auth. `findUnique` where `publicId`. If missing or `status !== ACTIVE`, return **`404`** JSON `{ "error": "Assignment not found." }` (same message for both — no leak).

If active, `assertValidQuizSessionForSave(quizSnapshot)` before respond (treat corrupt snapshot as 404). Return:

```json
{
  "publicId": "...",
  "title": "...",
  "session": { ... QuizSession ... }
}
```

- [ ] **Step 2: GET resolve-code**

Rate limit key: `rl:assign-resolve:${ip}` with **`allowRateLimit(key, 30, 60)`** (30 req/min/IP). If false, **`429`**.

Query param `code` — `normalizeJoinCode`. Find `Assignment` where `joinCode` equals normalized. If none, **`404`** same generic error as public.

- [ ] **Step 3: Commit**

```bash
git add app/api/assignments/public app/api/assignments/resolve-code
git commit -m "feat(api): public assignment play and join code resolve"
```

---

### Task 9: `POST /api/assignment-submissions`

**Files:**
- Create: `app/api/assignment-submissions/route.ts`

- [ ] **Step 1: Rate limit**

`rl:assign-submit:${ip}` — e.g. **60 / 60s**.

- [ ] **Step 2: Parse body**

JSON: `publicId?: string`, `joinCode?: string`, `answers`, `idempotencyKey`, `displayName?: string`. Exactly one of `publicId` or `joinCode` required; resolve assignment; reject if not `ACTIVE`.

- [ ] **Step 3: Auth branch**

`const session = await auth()`. If `session?.user?.id`: `userId = session.user.id`, `displayName = null`. Else: `userId = null`, `displayName = assertDisplayNameForGuest(body.displayName)`.

- [ ] **Step 4: Score server-side**

Load `quizSnapshot` from row; `assertValidQuizSessionForSave`; `parseAnswersForSession(session, answers)`; `getScore(session.quiz.questions, answers)`; `questionCount = session.quiz.questions.length`.

- [ ] **Step 5: Idempotency**

`idempotencyKey = parseAssignmentIdempotencyKey(...)`. `findUnique` on `assignmentId_idempotencyKey`. If exists, return **`200`** `{ id, duplicate: true }`.

- [ ] **Step 6: Signed-in uniqueness**

If `userId`, `findFirst` where `assignmentId` + `userId`. If exists, return **`200`** `{ id: existing.id, duplicate: true }` (or **`409`** with clear message — pick one and use consistently; spec prefers no duplicate rows).

- [ ] **Step 7: Create**

`prisma.assignmentSubmission.create`. Return **`201`** `{ id, duplicate: false }`. On `P2002`, re-fetch like `quiz-attempts` route.

- [ ] **Step 8: Commit**

```bash
git add app/api/assignment-submissions/route.ts
git commit -m "feat(api): post assignment submissions with server scoring"
```

---

### Task 10: Quiz page — `aid` and optional `code` query

**Files:**
- Modify: `app/quiz/quiz-page-client.tsx`

- [ ] **Step 1: Read `aid` and `code`**

`const aid = searchParams.get("aid");`  
`const codeParam = searchParams.get("code");`  
Priority: if `aid`, fetch `/api/assignments/public/${encodeURIComponent(aid)}`. Else if `codeParam`, `fetch('/api/assignments/resolve-code?code=' + encodeURIComponent(codeParam))` then chain public fetch.

- [ ] **Step 2: Guest name gate**

If load succeeded and **no** `useSession().user`, show a small modal or inline form: display name + Continue → store in `sessionStorage` key `quizforge-assignment-guest-${publicId}` before applying session.

- [ ] **Step 3: Persist assignment context for results**

`sessionStorage.setItem("quizforge-assignment-public-id", publicId)` when entering assignment play (clear when leaving non-assignment quiz if needed).

- [ ] **Step 4: Commit**

```bash
git add app/quiz/quiz-page-client.tsx
git commit -m "feat(quiz): load assignment by aid or code with guest name gate"
```

---

### Task 11: Results page — assignment submission + `QuizAttempt`

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Detect assignment context**

Read `sessionStorage.getItem("quizforge-assignment-public-id")` in `useEffect` (client only). If present, build **separate** idempotency storage keys: `quizforge-assignment-idem-${publicId}`.

- [ ] **Step 2: POST assignment submission**

After quiz complete (same mount as today), **first** `POST /api/assignment-submissions` with `{ publicId, answers, idempotencyKey, displayName }` — `displayName` from `sessionStorage` guest key if guest; omit if signed in.

On success set `quizforge-assignment-done-${publicId}` in sessionStorage.

- [ ] **Step 3: Keep `QuizAttempt` for authed users**

Existing `useEffect` for `/api/quiz-attempts` remains; it still sends `session` + `answers` from local storage (snapshot matches assignment). If both posts run, order: **assignment submission first**, then **quiz attempt** (both non-blocking errors).

- [ ] **Step 4: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat(results): persist assignment submissions and keep quiz attempts"
```

---

### Task 12: Library — create assignment

**Files:**
- Modify: `components/LibraryClient.tsx`

- [ ] **Step 1: Add button per row**

`POST /api/assignments` with `{ savedQuizId: id }`. On success, `showToast` + optional `window.prompt` or modal showing URL and code (better: small inline modal with copy buttons).

- [ ] **Step 2: Commit**

```bash
git add components/LibraryClient.tsx
git commit -m "feat(library): create class assignment from saved quiz"
```

---

### Task 13: Assignments teacher UI + navbar

**Files:**
- Create: `app/assignments/page.tsx`
- Create: `components/AssignmentsListClient.tsx`
- Create: `app/assignments/[publicId]/page.tsx`
- Create: `components/AssignmentSubmissionsClient.tsx`
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: `/assignments` page**

Server: `auth()`; redirect unauthenticated to sign-in with `callbackUrl=/assignments`. Pass initial data from `prisma.assignment.findMany` **or** let client fetch `GET /api/assignments` — pick one pattern (profile uses server Prisma; for parity use server component + pass props).

- [ ] **Step 2: List client**

Table: title, created, status, submission count, copy link, copy code, **View**, **Close** (PATCH).

- [ ] **Step 3: Detail page**

`/assignments/[publicId]`: server verifies owner via `findFirst({ where: { publicId, ownerId } })`; not found → `notFound()`. Client fetches `GET /api/assignments/[internalId]/submissions` — pass **internal `id`** from server as prop to avoid extra lookup, e.g. `<AssignmentSubmissionsClient assignmentId={assignment.id} />`.

- [ ] **Step 4: Navbar**

Add **Assignments** link next to Library when session exists (match existing Navbar patterns).

- [ ] **Step 5: Commit**

```bash
git add app/assignments components/AssignmentsListClient.tsx components/AssignmentSubmissionsClient.tsx components/Navbar.tsx
git commit -m "feat(assignments): teacher list, submissions view, nav link"
```

---

### Task 14: Vitest API-level tests (optional but recommended)

**Files:**
- Create: `lib/assignment-api-fixtures.ts` — build minimal `QuizSession` for DB tests **or** keep tests unit-only

If the repo has no API integration test runner, add **unit tests** only:

- `parseAnswersForSession` + submission helpers (done).
- Add **`gradeAssignmentAnswers(snapshotJson, answers)`** pure function in `lib/assignment-grade.ts` that throws on invalid and returns `{ score, questionCount }`, tested in Vitest — then call from route to keep route thin.

Minimal **`lib/assignment-grade.ts`**:

```typescript
import { assertValidQuizSessionForSave } from "@/lib/saved-quiz";
import type { QuizSession } from "@/lib/types";
import { parseAnswersForSession } from "@/lib/quiz-attempt";
import { getScore } from "@/lib/utils";

export function gradeQuizSession(snapshot: unknown, answers: unknown) {
  assertValidQuizSessionForSave(snapshot);
  const session = snapshot as QuizSession;
  const parsed = parseAnswersForSession(session, answers);
  return {
    score: getScore(session.quiz.questions, parsed),
    questionCount: session.quiz.questions.length,
  };
}
```

Tests in `lib/assignment-grade.test.ts` with tiny valid session.

- [ ] **Step 1: Add lib + tests**

- [ ] **Step 2: Use in `POST` handler** instead of inline scoring.

- [ ] **Step 3: Commit**

```bash
git add lib/assignment-grade.ts lib/assignment-grade.test.ts app/api/assignment-submissions/route.ts
git commit -m "test: grade assignment answers helper"
```

---

### Task 15: Spec status + final verification

**Files:**
- Modify: `docs/superpowers/specs/2026-04-06-class-assignments-tracking-design.md` (set **Status** to *Implementation in progress* or *Done* when shipped)

- [ ] **Step 1: Run full test suite**

```bash
npm run test
npm run lint
npm run build
```

Expected: no errors.

- [ ] **Step 2: Manual acceptance (from spec §11)**

- Create assignment from saved quiz → edit saved quiz JSON in DB or UI → reopen assignment public GET → snapshot unchanged.  
- Guest + authed submit; refresh results → idempotent.  
- Close assignment → submit rejected.  
- Second signed-in submit → duplicate / no second row.  
- Resolve code matches `publicId` path.  
- Second teacher cannot read first teacher’s submissions.

- [ ] **Step 3: Commit doc status**

```bash
git add docs/superpowers/specs/2026-04-06-class-assignments-tracking-design.md
git commit -m "docs: update assignment spec status"
```

---

## Plan vs spec checklist (self-review)

| Spec section | Plan coverage |
|--------------|----------------|
| Goals 1–5 | Tasks 6–13, 9–11 |
| Non-goals | Not implemented (no LMS, no per-question analytics) |
| §4 lock-in hybrid + link + code | Tasks 8, 10 |
| Snapshot frozen | Task 6 POST copies `SavedQuiz.session` |
| Server authority | Tasks 8–9, 14 `gradeQuizSession` |
| `QuizAttempt` preserved | Task 11 |
| Unique signed-in submission | Task 9 step 6 + Prisma `@@unique([assignmentId, userId])` |
| Rate limits | Tasks 5, 8, 9 |
| Teacher-only lists | Tasks 6–7, 13 |
| Error messaging / closed | Tasks 8, 9 |
| Testing §11 | Task 15 + unit tasks 2–4, 14 |

**Placeholder scan:** None intentional; Redis missing degrades rate limit to allow (documented).

**Type consistency:** `publicId` is string everywhere; internal `id` used for PATCH and submissions API paths as in Task 13.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-06-class-assignments-tracking.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach do you want?**

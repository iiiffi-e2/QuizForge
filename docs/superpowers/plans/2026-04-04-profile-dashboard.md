# Profile dashboard & quiz attempts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `QuizAttempt` persistence (server-scored, idempotent POST from Results), a private `/profile` dashboard with real aggregates and recent activity, and Navbar entry—per [2026-04-04-profile-dashboard-design.md](../specs/2026-04-04-profile-dashboard-design.md).

**Architecture:** Prisma `QuizAttempt` rows keyed by `userId`; `POST /api/quiz-attempts` accepts `QuizSession` + `answers` + `idempotencyKey`, validates with existing `assertValidQuizSessionForSave`, recomputes score with `getScore` from `@/lib/utils`. Idempotency via `@@unique([userId, idempotencyKey])`. Results page uses `useSession`; on authenticated load, `fetch` POST once per idempotency key (sessionStorage). Profile is a server component: `auth()` + Prisma aggregates + recent list.

**Tech Stack:** Next.js App Router, TypeScript, Auth.js v5, Prisma, PostgreSQL, Vitest (unit tests for pure helpers).

---

## File structure (create / modify)

| Path | Responsibility |
|------|----------------|
| `prisma/schema.prisma` | `QuizAttempt` model; `User.quizAttempts` relation |
| `prisma/migrations/*` | Generated migration for `QuizAttempt` |
| `lib/quiz-attempt.ts` | Parse/validate POST body; normalize answers; tie to `getScore` |
| `lib/quiz-attempt.test.ts` | Vitest: validation + score parity with `getScore` |
| `app/api/quiz-attempts/route.ts` | `POST` only: auth, validate, idempotent upsert semantics |
| `app/profile/page.tsx` | Server: redirect if unauthenticated; load stats + recent attempts |
| `app/results/page.tsx` | Client: generate/store idempotency key; POST attempt when authenticated; non-blocking error UI |
| `components/Navbar.tsx` | Link to `/profile` when signed in |
| `docs/superpowers/specs/2026-04-04-profile-dashboard-design.md` | Set **Status** to Approved (optional doc polish) |

---

### Task 1: Prisma `QuizAttempt` model and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_quiz_attempt/migration.sql` (via CLI)

- [ ] **Step 1: Add model and relation**

In `prisma/schema.prisma`, on `User`, add:

```prisma
  quizAttempts QuizAttempt[]
```

Add new model (place after `SavedQuiz`):

```prisma
model QuizAttempt {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  completedAt    DateTime @default(now())
  score          Int
  questionCount  Int
  title          String   @db.VarChar(200)
  idempotencyKey String   @db.VarChar(128)

  @@unique([userId, idempotencyKey])
  @@index([userId, completedAt])
}
```

- [ ] **Step 2: Create migration**

Run (from repo root):

```bash
npx prisma migrate dev --name add_quiz_attempt
```

Expected: migration applies cleanly against local/dev `DATABASE_URL`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add QuizAttempt for profile stats"
```

---

### Task 2: Pure helpers `lib/quiz-attempt.ts` + Vitest

**Files:**
- Create: `lib/quiz-attempt.ts`
- Create: `lib/quiz-attempt.test.ts`

- [ ] **Step 1: Write tests first (failing)**

Create `lib/quiz-attempt.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseQuizAttemptPayload } from "./quiz-attempt";
import type { QuizSession } from "./types";
import { getScore } from "./utils";

function minimalSession(): QuizSession {
  return {
    request: {
      input_type: "topic",
      content: "Hello world",
      settings: {
        question_count: 5,
        difficulty: "easy",
        level: "general",
        mode: "study",
        source_behavior: "material_only",
        time_limit_seconds: null,
      },
    },
    quiz: {
      questions: [
        {
          question: "Q1?",
          choices: ["a", "b", "c", "d"],
          correct_index: 1,
          explanation: "e",
          source_snippet: "s",
        },
        {
          question: "Q2?",
          choices: ["a", "b", "c", "d"],
          correct_index: 2,
          explanation: "e",
          source_snippet: "s",
        },
      ],
    },
    created_at: new Date().toISOString(),
  };
}

describe("parseQuizAttemptPayload", () => {
  it("returns score matching getScore for valid payload", () => {
    const session = minimalSession();
    const answers = [1, 2];
    const parsed = parseQuizAttemptPayload({
      session,
      answers,
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.score).toBe(getScore(session.quiz.questions, answers));
    expect(parsed.questionCount).toBe(2);
  });

  it("throws when idempotency key missing", () => {
    expect(() =>
      parseQuizAttemptPayload({
        session: minimalSession(),
        answers: [0, 0],
        idempotencyKey: "",
      }),
    ).toThrow(/idempotency/i);
  });

  it("throws when answers length mismatches questions", () => {
    expect(() =>
      parseQuizAttemptPayload({
        session: minimalSession(),
        answers: [0],
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow(/answers/i);
  });
});
```

Run:

```bash
npm run test -- lib/quiz-attempt.test.ts
```

Expected: FAIL — `parseQuizAttemptPayload` not found.

- [ ] **Step 2: Implement `lib/quiz-attempt.ts`**

```typescript
import { assertValidQuizSessionForSave, deriveDefaultTitle } from "@/lib/saved-quiz";
import type { QuizSession } from "@/lib/types";
import { getScore } from "@/lib/utils";

const MAX_IDEMPOTENCY_KEY_LEN = 128;

export interface QuizAttemptPayloadInput {
  session: unknown;
  answers: unknown;
  idempotencyKey: unknown;
}

export interface ParsedQuizAttemptPayload {
  session: QuizSession;
  score: number;
  questionCount: number;
  title: string;
  idempotencyKey: string;
}

function isValidChoiceIndex(value: unknown): boolean {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  return value >= -1 && value <= 3;
}

export function parseQuizAttemptPayload(
  input: QuizAttemptPayloadInput,
): ParsedQuizAttemptPayload {
  const { session: rawSession, answers: rawAnswers, idempotencyKey: rawKey } = input;

  if (typeof rawKey !== "string" || !rawKey.trim()) {
    throw new Error("idempotencyKey is required.");
  }
  const idempotencyKey = rawKey.trim();
  if (idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LEN) {
    throw new Error("idempotencyKey is too long.");
  }

  assertValidQuizSessionForSave(rawSession);
  const session = rawSession;

  if (!Array.isArray(rawAnswers)) {
    throw new Error("answers must be an array.");
  }
  const n = session.quiz.questions.length;
  if (rawAnswers.length !== n) {
    throw new Error("answers length must match number of questions.");
  }
  for (const a of rawAnswers) {
    if (!isValidChoiceIndex(a)) {
      throw new Error("Each answer must be an integer from -1 to 3.");
    }
  }
  const answers = rawAnswers as number[];

  const score = getScore(session.quiz.questions, answers);
  const title = deriveDefaultTitle(session.request);

  return {
    session,
    score,
    questionCount: n,
    title: title.slice(0, 200),
    idempotencyKey,
  };
}
```

Run:

```bash
npm run test -- lib/quiz-attempt.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/quiz-attempt.ts lib/quiz-attempt.test.ts
git commit -m "feat: add quiz attempt payload validation and tests"
```

---

### Task 3: `POST /api/quiz-attempts`

**Files:**
- Create: `app/api/quiz-attempts/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/quiz-attempts/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseQuizAttemptPayload } from "@/lib/quiz-attempt";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  let parsed;
  try {
    parsed = parseQuizAttemptPayload({
      session: b.session,
      answers: b.answers,
      idempotencyKey: b.idempotencyKey,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid payload.";
    const status =
      msg.includes("too large") || msg.includes("large") ? 413 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  const existing = await prisma.quizAttempt.findUnique({
    where: {
      userId_idempotencyKey: {
        userId: session.user.id,
        idempotencyKey: parsed.idempotencyKey,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { id: existing.id, duplicate: true },
      { status: 200 },
    );
  }

  const row = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      score: parsed.score,
      questionCount: parsed.questionCount,
      title: parsed.title,
      idempotencyKey: parsed.idempotencyKey,
    },
  });

  return NextResponse.json({ id: row.id, duplicate: false }, { status: 201 });
}
```

Note: `parsed.session` is validated but not stored (YAGNI); only score metadata and title are persisted per spec.

- [ ] **Step 2: Run Typecheck / build**

```bash
npx prisma generate
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/quiz-attempts/route.ts
git commit -m "feat(api): add POST /api/quiz-attempts with idempotency"
```

---

### Task 4: Results page — persist attempt (client)

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Add idempotency + POST effect**

Conceptual requirements (implement with project’s existing hooks/style):

1. Import `useSession` (already imported) and ensure you read `session` data for gated POST.
2. Build a stable storage key, e.g.  
   `const storageKey = session ? \`quizforge-attempt-idem-\${session.created_at}\` : null`  
   (only when `session` is non-null).
3. On mount ( `useEffect` ), when `authStatus === "authenticated"` and `session` exists:
   - Read `idempotencyKey` from `sessionStorage.getItem(storageKey)` or create `crypto.randomUUID()`, then `sessionStorage.setItem`.
   - `fetch("/api/quiz-attempts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, answers, idempotencyKey }) })`.
   - On non-OK response: set local state `attemptPersistError` to a short string; do **not** block the rest of the results UI.
4. Dependency array must avoid infinite loops: run once per results visit for that `session.created_at` (e.g. track submitted ref).

- [ ] **Step 2: Non-blocking error UI**

Near the save-to-library area or top of main, if `attemptPersistError`:

```tsx
<p className="text-sm text-[var(--quiz-error)]" role="status">
  {attemptPersistError}
</p>
```

Use a neutral message like: `Could not sync your quiz to your profile. Your score is still saved locally.`

- [ ] **Step 3: Manual smoke test**

- Sign in, complete a quiz, land on Results → Network tab shows `201` to `/api/quiz-attempts`.
- Refresh Results → second request returns `200` with `duplicate: true` (no duplicate rows in DB — verify with Prisma Studio or SQL).

- [ ] **Step 4: Commit**

```bash
git add app/results/page.tsx
git commit -m "feat(results): POST quiz attempt when authenticated"
```

---

### Task 5: `/profile` page

**Files:**
- Create: `app/profile/page.tsx`

- [ ] **Step 1: Implement server page**

Create `app/profile/page.tsx`:

```typescript
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const userId = session.user.id;

  const [count, recent, sums] = await Promise.all([
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        score: true,
        questionCount: true,
        completedAt: true,
      },
    }),
    prisma.quizAttempt.aggregate({
      where: { userId },
      _sum: { score: true, questionCount: true },
    }),
  ]);

  const tq = sums._sum.questionCount ?? 0;
  const ts = sums._sum.score ?? 0;
  const avgPercent =
    count > 0 && tq > 0 ? Math.round((ts / tq) * 100) : null;

  const displayName =
    session.user?.name?.trim() ||
    session.user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="rounded-2xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] p-6 text-white shadow-[var(--quiz-glow)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {session.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt=""
                  className="h-14 w-14 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/30 bg-white/20 text-lg font-bold">
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Welcome back, {displayName}
                </h1>
                <p className="mt-1 text-sm text-white/90">
                  Your stats and recent quizzes in one place.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/create"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[var(--quiz-brand-600)] shadow-sm"
              >
                Create quiz
              </Link>
              <Link
                href="/library"
                className="rounded-xl border border-white/80 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm"
              >
                Library
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
                Recent activity
              </h2>
              {recent.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--quiz-text-secondary)]">
                  Finish a quiz while signed in to see it here.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recent.map((row) => (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--quiz-border)]/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-[var(--quiz-text-primary)]">
                          {row.title}
                        </p>
                        <p className="text-xs text-[var(--quiz-text-secondary)]">
                          {row.completedAt.toLocaleString()} · {row.score}/
                          {row.questionCount} correct
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
                Library
              </h2>
              <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
                Saved quizzes live in your library—open, delete, or share from there.
              </p>
              <Link
                href="/library"
                className="mt-4 inline-flex rounded-xl bg-[var(--quiz-primary)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                Go to library
              </Link>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
                Your progress
              </h2>
              {count === 0 ? (
                <p className="mt-3 text-sm text-[var(--quiz-text-secondary)]">
                  No completed quizzes yet. Take a quiz while signed in.
                </p>
              ) : (
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-[var(--quiz-muted)]">Quizzes taken</dt>
                    <dd className="text-2xl font-bold text-[var(--quiz-brand-600)]">
                      {count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--quiz-muted)]">Avg. score</dt>
                    <dd className="text-2xl font-bold text-[var(--quiz-success,#16a34a)]">
                      {avgPercent != null ? `${avgPercent}%` : "—"}
                    </dd>
                  </div>
                </dl>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--quiz-brand-600)]/25 bg-[var(--quiz-brand-600)]/5 p-5 text-sm text-[var(--quiz-text-secondary)]">
              <p className="font-medium text-[var(--quiz-text-primary)]">
                Pro tip
              </p>
              <p className="mt-2">
                Upload PDF notes on Create to generate quizzes aligned with your
                course material.
              </p>
            </section>

            <section className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
                Account
              </h2>
              {session.user?.email ? (
                <p className="mt-2 break-all text-sm text-[var(--quiz-text-secondary)]">
                  {session.user.email}
                </p>
              ) : null}
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
```

**Average score definition:** `round(100 * sum(score) / sum(questionCount))` across all attempts for the user (matches spec: one consistent definition).

- [ ] **Step 2: Commit**

```bash
git add app/profile/page.tsx
git commit -m "feat: add private profile dashboard page"
```

---

### Task 6: Navbar — Profile link

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Add links**

When `status === "authenticated"`, add a `Link` to `/profile` with label `Profile` (desktop + mobile patterns mirroring Library).

- [ ] **Step 2: Commit**

```bash
git add components/Navbar.tsx
git commit -m "feat(nav): add Profile link for signed-in users"
```

---

### Task 7: Spec status (optional)

**Files:**
- Modify: `docs/superpowers/specs/2026-04-04-profile-dashboard-design.md`

- [ ] **Step 1: Update header**

Set:

```markdown
**Status:** Approved — implementation in progress  
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-04-profile-dashboard-design.md
git commit -m "docs: mark profile dashboard spec approved"
```

---

## Self-review (plan vs spec)

| Spec section | Covered by |
|--------------|------------|
| QuizAttempt + aggregates | Tasks 1, 2, 5 |
| POST auth + validation | Tasks 2, 3 |
| Idempotency | Tasks 2, 3, 4 |
| Profile UI + account email placement | Task 5 |
| Results non-blocking error | Task 4 |
| Navbar | Task 6 |
| Testing focus (auth, score, idempotency, anonymous regression) | Tasks 2 (unit), 4 (smoke); add explicit note: full API integration tests optional YAGNI |

**Placeholder scan:** No TBD steps.

**Fix applied in plan:** Task 5 first draft included a redundant aggregate; Step 2 replaces with slimmer `count` + `_sum` for `score` and `questionCount` on `QuizAttempt` — Prisma allows `_sum` on multiple fields in one `aggregate` call.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-04-profile-dashboard.md`. Two execution options:

**1. Subagent-driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you want?

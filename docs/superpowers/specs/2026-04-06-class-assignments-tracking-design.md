# Class assignments & tracked sharing — design spec

**Status:** Implemented (MVP) — plan: [2026-04-06-class-assignments-tracking.md](../plans/2026-04-06-class-assignments-tracking.md)  
**Date:** 2026-04-06  
**Depends on:** [Profile dashboard & quiz attempts](2026-04-04-profile-dashboard-design.md) (`QuizAttempt`, `/profile`), [Accounts & persistence](2026-04-04-accounts-persistence-design.md) (`User`, `SavedQuiz`), existing share flows (Redis short links, `QuizSession` JSON)

## 1. Summary

Let **logged-in teachers (quiz authors)** create **assignments** from their content so a **class** can take the same frozen quiz while the teacher **sees per-participant scores**. **Students** may use **QuizForge accounts** or participate as **guests** with a **display name**. **Joining** works via a **primary assignment URL** and a **fallback join code** for students who only have the code or a generic quiz entry.

Implementation shape: **first-class `Assignment` + `AssignmentSubmission`** in PostgreSQL; **quiz content** for the assignment is a **server-stored snapshot** at creation time. Existing **`QuizAttempt`** remains the model for **personal** history; signed-in students **also** receive an **`AssignmentSubmission`** row for class reporting, and **should** still record a **`QuizAttempt`** so profile/dashboard behavior stays consistent with today’s results flow.

## 2. Goals

1. **Teacher:** From a **saved quiz** (or an agreed entry point), **create an assignment**, get a **shareable assignment link** and a **join code**, and **list submissions** (name or account, score, completion time).
2. **Student (assignment link):** Open `aid=<publicId>` (or equivalent route), receive **server-authoritative** quiz payload from the snapshot, complete the quiz, submit **without** needing an account (guest + display name) or **with** an account.
3. **Student (fallback):** From a **generic** quiz entry, enter **join code** (and display name if guest) to attach the run to the same assignment.
4. **Integrity:** **Scores are server-computed** from snapshot + answers, analogous to **`POST /api/quiz-attempts`** validation. **Idempotent** submission so refresh/double-post does not duplicate rows.
5. **Security:** Teachers **only** see their own assignments and submissions; public APIs **do not** expose rosters or PII beyond what is required to play.

## 3. Non-goals (v1)

- **Strong guest identity** (PINs, email verification, device binding beyond idempotency key).
- **LMS integration** (LTI, Google Classroom roster sync).
- **Per-question analytics** for teachers (optional JSON on submissions may be added later; not required for MVP rollup).
- **Public** assignment directories or discoverability by search.
- **Editing** a snapshot after creation (teachers **close** and **create a new** assignment if the quiz changes).

## 4. Product decisions (brainstorm lock-in)

| Decision | Choice |
|----------|--------|
| Student accounts | **Hybrid** — optional sign-in; guests use **display name** + assignment binding |
| How students join | **C** — **Assignment URL** primary; **join code** fallback on generic entry |
| Data model | **Assignment** + **AssignmentSubmission** (separate from `QuizAttempt`) |
| Quiz source for grading | **Frozen snapshot** on `Assignment` at create time |
| Retakes (signed-in) | **One submission per user per assignment** (`UNIQUE (assignmentId, userId)` where `userId` IS NOT NULL) |
| Retakes (guest) | **Idempotency key** only (weaker identity; teacher understands limitations) |
| Signed-in display in roster | Use **`User.name`** with **sensible fallback** (e.g. email local-part); **no** separate “class nickname” field in v1 unless trivial to add later |

## 5. Architecture

| Concern | Choice |
|--------|--------|
| Assignment storage | PostgreSQL via Prisma (`Assignment`, `AssignmentSubmission`) |
| Snapshot storage | **`Assignment.quizSnapshot`** — JSON **`QuizSession`** (or equivalent validated shape) copied from **`SavedQuiz.session`** at creation |
| Play payload | **Server-authoritative** — client loads quiz for assignment from **assignment public API**, not from tamperable URL blobs alone |
| Score authority | Server recomputes from **snapshot** + **`answers[]`** using the same validation rules as existing attempt persistence (`parseQuizAttemptPayload`-class validation) |
| Personal history | **`QuizAttempt`** still written for **authenticated** completers on the results/submit path (non-blocking failure acceptable, matching `/results` behavior) |
| Share stack | **Orthogonal** — existing Redis **`share:{id}`** links remain for generic sharing; **assignments** do not require Redis for the tracked play path (optional: future “duplicate as share” is out of scope) |

## 6. Data model (conceptual)

### `Assignment`

- `id` — internal primary key (cuid).
- `publicId` — **opaque** string for URLs (e.g. nanoid); **unique**.
- `joinCode` — **unique**, human-typeable (implementation picks length, typically 6–8 characters from an unambiguous alphabet).
- `ownerId` — FK → `User`, **indexed** `(ownerId, createdAt)` for teacher lists.
- `title` — display string for teacher UI (may mirror saved quiz title or override).
- `quizSnapshot` — JSON, **immutable** after create.
- `sourceSavedQuizId` — optional FK → `SavedQuiz` for traceability.
- `status` — `active` | `closed` (no new submissions when `closed`).
- `createdAt`, `closedAt` (optional).

### `AssignmentSubmission`

- `id` — primary key (cuid).
- `assignmentId` — FK → `Assignment`, **indexed** `(assignmentId, completedAt)`.
- `userId` — optional FK → `User` (null for guests).
- `displayName` — required when `userId` is null; **null** when `userId` is set (roster uses account-derived label).
- `score`, `questionCount`, `completedAt` — same semantics as `QuizAttempt`.
- `idempotencyKey` — client-provided string; **unique** `(assignmentId, idempotencyKey)`.
- **Unique** `(assignmentId, userId)` **where** `userId` is not null — **one row per signed-in student** per assignment.

Optional later: `answersDetail` JSON, `createdAt` for audit.

## 7. API & security (conceptual)

**Teacher (authenticated)**

- **Create assignment** — e.g. `POST /api/assignments`: body includes **`savedQuizId`** (or agreed alternate); server copies **`SavedQuiz.session`** into **`quizSnapshot`**; returns `publicId`, `joinCode`, assignment URL.
- **List assignments** — scoped to **`session.user.id`**.
- **List submissions** — scoped to assignments owned by **`session.user.id`**; returns submission rows only.

**Public / student**

- **Resolve assignment for play** — e.g. `GET /api/assignments/public/:publicId`: if `active`, returns **snapshot** (or a **play token** + follow-up if split for size); **no** owner email, **no** roster.
- **Resolve by code** — e.g. `GET /api/assignments/resolve-code?code=` (rate-limited): returns **publicId** or generic error (**do not** leak existence differentially if avoidable).
- **Submit submission** — e.g. `POST /api/assignment-submissions`: body includes **`publicId`** or **`joinCode`**, **`answers`**, **`idempotencyKey`**, **`displayName`** when session is anonymous; server loads **snapshot** by assignment, validates, computes score; rejects if **`closed`** or invalid.

**Rate limiting**

- **Join code resolve** and **submit** endpoints must be **rate-limited**; consider lockout after repeated failures.

## 8. UX flows

### Teacher

1. Library (or agreed surface) → **Create assignment** on a saved quiz.
2. Show **assignment link**, **join code**, **copy** actions; optional **Close assignment**.

### Student — link path

1. Open assignment URL (`aid` or dedicated path).
2. If **guest** — prompt **display name** once per browser/session for this assignment (store locally with assignment key); if **signed in** — use **account-derived** roster label per §4.
3. Play quiz from **server-provided** snapshot; complete → **submit** with idempotency.

### Student — code fallback

1. From generic quiz entry, **Enter class code** → resolve to assignment → same as link path from step 2 onward.

### Results integration

- Assignment play may use a **dedicated results step** or reuse **`/results`** with **assignment context** in query/state; implementation plan will choose. **Requirement:** submission **POST** uses **assignment snapshot**, not client-supplied arbitrary session for scoring.

## 9. Error handling & edge cases

- **Unknown / inactive assignment** — clear user messaging; **invalid code** — generic message where feasible.
- **Closed assignment** — reject new submissions; optional read-only “assignment ended” screen.
- **Oversized snapshot** — reject at create with same class of limits as save/share flows (exact caps in implementation).
- **Answer length mismatch** — reject submit (mirror existing attempt validation).
- **Idempotent replay** — return existing submission id / success without duplicate row.

## 10. Privacy & abuse

- **Guest display names** are **teacher-visible** and **not verified**; document impersonation risk for school buyers.
- **Retention / export** — not required in v1; note for future **FERPA-friendly** positioning (export/delete assignments).

## 11. Testing (acceptance-oriented)

- Create from **`SavedQuiz`** → edit library quiz → **assignment snapshot unchanged**.
- Guest submit + signed-in submit; **idempotency**; **closed** rejects; **second signed-in submit** rejected by unique constraint.
- Code resolve agrees with **publicId** path for same assignment.
- **Cross-teacher** access denied for assignment and submission lists.

## 12. Implementation follow-up

After this spec is reviewed in-repo, produce a detailed implementation plan via **`writing-plans`** (tasks, routes, Prisma migrations, UI surfaces, and ordering).

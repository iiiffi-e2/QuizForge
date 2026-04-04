import Link from "next/link";
import { LibraryClient } from "@/components/LibraryClient";
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

  const [count, recent, sums, savedItems] = await Promise.all([
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
    prisma.savedQuiz.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true },
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
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 sm:p-6">
              <LibraryClient
                initialItems={savedItems.map((i) => ({
                  id: i.id,
                  title: i.title,
                  createdAt: i.createdAt.toISOString(),
                }))}
              />
            </section>

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
                    <dd className="text-2xl font-bold text-[var(--quiz-success)]">
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

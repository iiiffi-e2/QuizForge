import { ClassCodeEntry } from "@/components/ClassCodeEntry";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { SiteJsonLd } from "@/components/SiteJsonLd";
import { getSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";
import Link from "next/link";

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

const useCases = [
  {
    title: "Students & self-study",
    description:
      "Turn lecture notes, textbook chapters, or articles into practice tests so you retain more before exams.",
    icon: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </>
    ),
  },
  {
    title: "Teachers & trainers",
    description:
      "Create aligned assessments from your own materials or links—adjust difficulty, length, and quiz mode in seconds.",
    icon: (
      <>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </>
    ),
  },
  {
    title: "Teams & onboarding",
    description:
      "Quiz people on internal docs, policies, or product pages to verify understanding after updates or training.",
    icon: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: "Creators & publishers",
    description:
      "Offer interactive follow-ups for blog posts, newsletters, or courses—paste a URL or text and ship a quiz the same day.",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
  },
] as const;

function UseCaseIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--quiz-ring)] text-[var(--quiz-brand-600)]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <SiteJsonLd />
      <Navbar />
      <main>
        <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--quiz-brand-600)]/25 bg-[var(--quiz-brand-600)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--quiz-brand-600)] sm:text-sm">
              AI-powered quiz generation
            </p>
            <h1 className="mt-6 text-balance text-4xl font-extrabold tracking-tight text-[var(--quiz-text-primary)] sm:text-6xl sm:leading-[1.08]">
              Forge quizzes from{" "}
              <span className="bg-gradient-to-r from-[var(--quiz-brand-600)] via-[var(--quiz-brand-500)] to-[var(--quiz-blue-600)] bg-clip-text text-transparent">
                anything
              </span>{" "}
              you already have
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg font-medium leading-relaxed text-[var(--quiz-text-secondary)] sm:text-xl">
              Point QuizForge at a topic, paste text, upload a file or image, or
              drop a link—then tune difficulty, length, and mode before you
              generate. Built for speed and clarity.
            </p>
            <div className="mt-10 flex justify-center">
              <Link
                href="/create"
                className="inline-flex w-full min-w-[200px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-8 py-4 text-base font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] active:scale-[0.99] sm:w-auto sm:py-4 sm:text-lg"
              >
                Start building a quiz
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="mx-auto mt-10 w-full max-w-md text-left">
              <ClassCodeEntry variant="prominent" />
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--quiz-border)]/60 bg-[var(--quiz-card)]/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-[var(--quiz-text-primary)] sm:text-4xl">
                Made for real workflows
              </h2>
              <p className="mt-4 text-lg text-[var(--quiz-text-secondary)]">
                Whether you are studying solo or shipping training at scale, the
                same flow applies: choose a source, dial in settings, generate.
              </p>
            </div>
            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:gap-8">
              {useCases.map((item) => (
                <li key={item.title}>
                  <article className="quiz-main-card flex h-full flex-col rounded-3xl border border-white/60 bg-[var(--quiz-card)] p-6 sm:p-8">
                    <UseCaseIcon>{item.icon}</UseCaseIcon>
                    <h3 className="mt-5 text-xl font-bold text-[var(--quiz-text-primary)]">
                      {item.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[var(--quiz-text-secondary)] leading-relaxed">
                      {item.description}
                    </p>
                    <Link
                      href="/create"
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--quiz-brand-600)] transition-colors hover:text-[var(--quiz-brand-700)]"
                    >
                      Create your quiz
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="quiz-main-card rounded-3xl border border-white/60 bg-gradient-to-br from-[var(--quiz-brand-600)]/12 via-[var(--quiz-card)] to-[var(--quiz-blue-600)]/10 p-8 sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-extrabold text-[var(--quiz-text-primary)] sm:text-3xl">
                Ready when you are
              </h2>
              <p className="mt-3 text-[var(--quiz-text-secondary)] sm:text-lg">
                Your draft is saved as you work—pick up anytime and generate when
                the source and settings look right.
              </p>
              <Link
                href="/create"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-8 py-4 text-base font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] active:scale-[0.99] sm:w-auto sm:min-w-[260px] sm:text-lg"
              >
                Create your quiz
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

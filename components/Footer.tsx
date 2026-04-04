import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create quiz" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--quiz-border)]/80 bg-[var(--quiz-card)]/50 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-3 transition-opacity hover:opacity-90"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] text-white shadow-[var(--quiz-glow)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </span>
              <span className="bg-gradient-to-r from-[var(--quiz-text-primary)] to-[var(--quiz-text-secondary)] bg-clip-text text-xl font-bold tracking-tight text-transparent">
                QuizForge
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[var(--quiz-text-secondary)]">
              Turn topics, text, files, and links into polished quizzes in minutes.
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-col gap-4 sm:items-end sm:text-right"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--quiz-muted)]">
              Navigate
            </span>
            <ul className="flex flex-col gap-3 sm:items-end">
              {footerLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-medium text-[var(--quiz-text-secondary)] transition-colors hover:text-[var(--quiz-brand-600)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--quiz-border)]/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--quiz-muted)]">
            © {new Date().getFullYear()} QuizForge. All rights reserved.
          </p>
          <p className="text-xs text-[var(--quiz-muted)]">
            Built for learning, training, and assessment.
          </p>
        </div>
      </div>
    </footer>
  );
}

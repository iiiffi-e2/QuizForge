"use client";

import { loadTheme, saveTheme } from "@/lib/quiz-storage";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Navbar() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(loadTheme());
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    saveTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <header className="no-print w-full border-b border-[var(--quiz-border)] bg-[var(--quiz-card)]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[var(--quiz-text-primary)] transition-colors hover:text-[var(--quiz-secondary)]"
        >
          QuizForge
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="rounded-md border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--quiz-primary)]">
            Pro
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-[var(--quiz-text-secondary)] transition-colors hover:border-[var(--quiz-border)] hover:bg-[var(--quiz-background)]"
          >
            <span className="hidden sm:inline">
              {theme === "light" ? "Dark mode" : "Light mode"}
            </span>
            <span className="rounded-md p-1.5 text-[var(--quiz-muted)] transition-colors hover:bg-[var(--quiz-border)] hover:text-[var(--quiz-text-primary)]">
              {theme === "light" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

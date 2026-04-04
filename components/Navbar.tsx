"use client";

import { loadTheme, saveTheme } from "@/lib/quiz-storage";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const { status } = useSession();
  const [theme, setTheme] = useState<"light" | "dark">(() => loadTheme());

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    saveTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  return (
    <header className="no-print sticky top-0 z-20 w-full border-b border-[var(--quiz-border)]/50 bg-[var(--quiz-header-glass)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
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
          <span className="bg-gradient-to-r from-[var(--quiz-text-primary)] to-[var(--quiz-text-secondary)] bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
            QuizForge
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {status === "authenticated" ? (
            <Link
              href="/profile"
              className="hidden text-sm font-semibold text-[var(--quiz-brand-600)] transition-colors hover:text-[var(--quiz-brand-700)] sm:inline"
            >
              Profile
            </Link>
          ) : null}
          {status === "authenticated" ? (
            <Link
              href="/library"
              className="hidden text-sm font-semibold text-[var(--quiz-brand-600)] transition-colors hover:text-[var(--quiz-brand-700)] sm:inline"
            >
              Library
            </Link>
          ) : null}
          <Link
            href="/create"
            className="hidden rounded-xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-2 text-sm font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] active:scale-[0.99] sm:inline-flex"
          >
            Create quiz
          </Link>
          <Link
            href="/create"
            className="inline-flex rounded-xl px-3 py-2 text-sm font-bold text-[var(--quiz-brand-600)] transition-colors hover:text-[var(--quiz-brand-700)] sm:hidden"
          >
            Create
          </Link>
          {status === "authenticated" ? (
            <Link
              href="/profile"
              className="inline text-sm font-semibold text-[var(--quiz-brand-600)] sm:hidden"
            >
              Profile
            </Link>
          ) : null}
          {status === "authenticated" ? (
            <Link
              href="/library"
              className="inline text-sm font-semibold text-[var(--quiz-brand-600)] sm:hidden"
            >
              Library
            </Link>
          ) : null}
          {status === "unauthenticated" ? (
            <Link
              href="/sign-in?callbackUrl=/library"
              className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--quiz-brand-600)] transition-colors hover:text-[var(--quiz-brand-700)]"
            >
              Sign in
            </Link>
          ) : null}
          {status === "authenticated" ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--quiz-text-secondary)] transition-colors hover:text-[var(--quiz-brand-600)]"
            >
              Sign out
            </button>
          ) : null}
          <span className="rounded-full border border-[var(--quiz-brand-600)]/25 bg-[var(--quiz-brand-600)]/10 px-3 py-1 text-xs font-semibold text-[var(--quiz-brand-600)] sm:text-sm">
            PRO
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--quiz-text-secondary)] transition-colors hover:text-[var(--quiz-brand-600)]"
          >
            <span className="hidden sm:inline">
              {theme === "light" ? "Dark Mode" : "Light Mode"}
            </span>
            <span className="text-[var(--quiz-muted)]">
              {theme === "light" ? (
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
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
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

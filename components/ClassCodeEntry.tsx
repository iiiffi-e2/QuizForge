"use client";

import { normalizeJoinCode } from "@/lib/assignment-submission";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type ClassCodeEntryProps = {
  /** Larger card styling for the landing hero */
  variant?: "prominent" | "compact";
  className?: string;
};

export function ClassCodeEntry({
  variant = "prominent",
  className = "",
}: ClassCodeEntryProps) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeJoinCode(value);
    if (!normalized.length) return;
    router.push(`/quiz?code=${encodeURIComponent(normalized)}`);
  }

  const isCompact = variant === "compact";

  return (
    <div
      className={
        isCompact
          ? `rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)]/80 p-4 sm:p-5 ${className}`
          : `rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)]/90 p-5 shadow-sm sm:p-6 ${className}`
      }
    >
      <h2
        className={
          isCompact
            ? "text-sm font-semibold text-[var(--quiz-text-primary)]"
            : "text-base font-semibold text-[var(--quiz-text-primary)] sm:text-lg"
        }
      >
        Enter class code
      </h2>
      <p
        className={
          isCompact
            ? "mt-1 text-xs text-[var(--quiz-text-secondary)]"
            : "mt-1.5 text-sm text-[var(--quiz-text-secondary)]"
        }
      >
        Join a quiz your teacher shared with a code (instead of a link).
      </p>
      <form
        onSubmit={onSubmit}
        className={
          isCompact
            ? "mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
            : "mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        }
      >
        <div className="min-w-0 flex-1">
          <label
            htmlFor="class-code-input"
            className="sr-only"
          >
            Class code
          </label>
          <input
            id="class-code-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
            placeholder="e.g. ABC12XYZ"
            className="w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-3 py-2.5 font-mono text-sm tracking-wide text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-brand-600)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-brand-600)]/25 sm:text-base"
          />
        </div>
        <button
          type="submit"
          disabled={!normalizeJoinCode(value).length}
          className="shrink-0 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:border-[var(--quiz-brand-600)]/40 hover:bg-[var(--quiz-brand-600)]/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join quiz
        </button>
      </form>
    </div>
  );
}

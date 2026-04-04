"use client";

import { saveQuizSession, saveUserAnswers } from "@/lib/quiz-storage";
import type { QuizSession } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type LibraryItem = {
  id: string;
  title: string;
  createdAt: string;
};

export function LibraryClient({ initialItems }: { initialItems: LibraryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function openSaved(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/saved-quizzes/${encodeURIComponent(id)}`);
      const data = (await res.json()) as { session?: QuizSession; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not open quiz.");
        return;
      }
      if (!data.session) {
        setError("Invalid response.");
        return;
      }
      if (!data.session.quiz?.questions?.length) {
        setError("Could not open quiz.");
        return;
      }
      saveQuizSession(data.session);
      saveUserAnswers(new Array(data.session.quiz.questions.length).fill(-1));
      router.push("/quiz");
    } catch {
      setError("Could not open quiz.");
    } finally {
      setPendingId(null);
    }
  }

  async function deleteSaved(id: string) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/saved-quizzes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not delete.");
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      setConfirmDeleteId(null);
    } catch {
      setError("Could not delete.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)]">
        Saved quizzes
      </h2>
      <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
        Quizzes you&apos;ve saved to your account. Open to take again, or delete
        when you&apos;re done.
      </p>
      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="mt-4 text-[var(--quiz-text-secondary)]">
          Nothing saved yet.{" "}
          <Link href="/create" className="font-medium text-[var(--quiz-brand-600)] hover:underline">
            Create a quiz
          </Link>
          , then use &quot;Save to profile&quot; on the results screen.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)]/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-[var(--quiz-text-primary)]">{item.title}</p>
                <p className="text-xs text-[var(--quiz-text-secondary)]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openSaved(item.id)}
                  disabled={pendingId !== null}
                  className="rounded-lg bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--quiz-glow)] disabled:opacity-60"
                >
                  {pendingId === item.id ? "Opening…" : "Open"}
                </button>
                {confirmDeleteId === item.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => deleteSaved(item.id)}
                      disabled={pendingId !== null}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300"
                    >
                      Confirm delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="rounded-lg border border-[var(--quiz-border)] px-4 py-2 text-sm font-medium text-[var(--quiz-text-secondary)]"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(item.id)}
                    disabled={pendingId !== null}
                    className="rounded-lg border border-[var(--quiz-border)] px-4 py-2 text-sm font-medium text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

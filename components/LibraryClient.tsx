"use client";

import { createShortShareUrl } from "@/lib/share-client";
import { encodeQuizToUrl } from "@/lib/share";
import { saveQuizSession, saveUserAnswers } from "@/lib/quiz-storage";
import type { QuizSession } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type LibraryItem = {
  id: string;
  title: string;
  createdAt: string;
};

function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (typeof err === "object" && err !== null && "name" in err) {
    return (err as { name: string }).name === "AbortError";
  }
  return false;
}

/**
 * Uses the Web Share API (native sheet on many Android / iOS browsers) when available;
 * otherwise copies to the clipboard.
 */
async function shareOrCopyUrl(
  url: string,
  title: string,
): Promise<"shared" | "copied" | "aborted"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: title.slice(0, 200) || "Quiz",
        text: "Take this quiz on QuizForge",
        url,
      });
      return "shared";
    } catch (err) {
      if (isAbortError(err)) return "aborted";
      // Unsupported share data or other failure — fall back to clipboard
    }
  }
  if (typeof navigator.clipboard?.writeText === "function") {
    await navigator.clipboard.writeText(url);
    return "copied";
  }
  throw new Error("Cannot share or copy");
}

export function LibraryClient({ initialItems }: { initialItems: LibraryItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [sharePendingId, setSharePendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastClearRef.current) clearTimeout(toastClearRef.current);
    };
  }, []);

  function showToast(message: string) {
    if (toastClearRef.current) clearTimeout(toastClearRef.current);
    setToast(message);
    toastClearRef.current = setTimeout(() => {
      setToast(null);
      toastClearRef.current = null;
    }, 2500);
  }

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

  async function shareSaved(id: string, displayTitle: string) {
    setError(null);
    setSharePendingId(id);
    try {
      const res = await fetch(`/api/saved-quizzes/${encodeURIComponent(id)}`);
      const data = (await res.json()) as { session?: QuizSession; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create share link.");
        return;
      }
      if (!data.session?.quiz?.questions?.length) {
        setError("Could not create share link.");
        return;
      }
      let url: string | null = await createShortShareUrl(data.session);
      if (!url) {
        url = encodeQuizToUrl(data.session);
      }
      if (!url) {
        setError(
          "This quiz is too large to share as a link. Try fewer questions or a shorter source.",
        );
        return;
      }
      const outcome = await shareOrCopyUrl(url, displayTitle);
      if (outcome === "shared") {
        showToast("Link shared");
      } else if (outcome === "copied") {
        showToast("Link copied");
      }
    } catch {
      setError("Could not share or copy link.");
    } finally {
      setSharePendingId(null);
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

  const busy = pendingId !== null || sharePendingId !== null;

  return (
    <div className="relative">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm font-medium text-[var(--quiz-text-primary)] shadow-lg"
        >
          {toast}
        </div>
      ) : null}
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
                  disabled={busy}
                  className="rounded-lg bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--quiz-glow)] disabled:opacity-60"
                >
                  {pendingId === item.id ? "Opening…" : "Open"}
                </button>
                <button
                  type="button"
                  onClick={() => shareSaved(item.id, item.title)}
                  disabled={busy}
                  className="rounded-lg border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80 disabled:opacity-60"
                >
                  {sharePendingId === item.id ? "Sharing…" : "Share link"}
                </button>
                {confirmDeleteId === item.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => deleteSaved(item.id)}
                      disabled={busy}
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
                    disabled={busy}
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

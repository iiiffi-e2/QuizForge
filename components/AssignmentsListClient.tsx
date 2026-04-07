"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type AssignmentListItem = {
  id: string;
  publicId: string;
  joinCode: string;
  title: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  submissionCount: number;
  questionCount: number | null;
};

export function AssignmentsListClient({
  initialItems,
}: {
  initialItems: AssignmentListItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const refresh = useCallback(async () => {
    const res = await fetch("/api/assignments");
    if (!res.ok) return;
    const data = (await res.json()) as { items?: AssignmentListItem[] };
    if (Array.isArray(data.items)) {
      setItems(data.items);
    }
  }, []);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setError(null);
      showToast(`${label} copied`);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  async function closeAssignment(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not close assignment.");
        return;
      }
      await refresh();
    } catch {
      setError("Could not close assignment.");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--quiz-text-secondary)]">
        No assignments yet. Open{" "}
        <Link href="/profile" className="font-medium text-[var(--quiz-brand-600)] hover:underline">
          Library
        </Link>{" "}
        and use <strong>Class assignment</strong> on a saved quiz.
      </p>
    );
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="relative mt-6 space-y-4">
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm font-medium text-[var(--quiz-text-primary)] shadow-lg"
        >
          {toast}
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const url =
            origin &&
            `${origin}/quiz?aid=${encodeURIComponent(item.publicId)}`;
          return (
            <li
              key={item.id}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-surface)]/80 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--quiz-text-primary)]">
                      {item.title}
                    </p>
                    <span
                      className={
                        item.status === "ACTIVE"
                          ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400"
                          : "rounded-full bg-[var(--quiz-border)]/80 px-2.5 py-0.5 text-xs font-semibold text-[var(--quiz-text-secondary)]"
                      }
                    >
                      {item.status === "ACTIVE" ? "Open" : "Closed"}
                    </span>
                  </div>
                  <dl className="grid gap-1 text-xs text-[var(--quiz-text-secondary)] sm:grid-cols-2 sm:gap-x-6">
                    <div>
                      <dt className="inline font-medium text-[var(--quiz-text-primary)]/80">
                        Created:{" "}
                      </dt>
                      <dd className="inline">
                        {new Date(item.createdAt).toLocaleString()}
                      </dd>
                    </div>
                    {item.closedAt ? (
                      <div>
                        <dt className="inline font-medium text-[var(--quiz-text-primary)]/80">
                          Closed:{" "}
                        </dt>
                        <dd className="inline">
                          {new Date(item.closedAt).toLocaleString()}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline font-medium text-[var(--quiz-text-primary)]/80">
                        Questions:{" "}
                      </dt>
                      <dd className="inline">
                        {item.questionCount != null ? item.questionCount : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-[var(--quiz-text-primary)]/80">
                        Submissions:{" "}
                      </dt>
                      <dd className="inline">{item.submissionCount}</dd>
                    </div>
                  </dl>
                  <p className="font-mono text-sm text-[var(--quiz-text-secondary)]">
                    Join code:{" "}
                    <span className="text-[var(--quiz-text-primary)]">
                      {item.joinCode}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--quiz-text-secondary)]">
                    Students can open your assignment link or enter this code on the
                    home or create page.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {url ? (
                    <button
                      type="button"
                      onClick={() => void copyText("Assignment link", url)}
                      className="rounded-lg border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2 text-sm font-semibold text-[var(--quiz-text-primary)]"
                    >
                      Copy link
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void copyText("Join code", item.joinCode)}
                    className="rounded-lg border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2 text-sm font-semibold text-[var(--quiz-text-primary)]"
                  >
                    Copy code
                  </button>
                  <Link
                    href={`/assignments/${encodeURIComponent(item.publicId)}`}
                    className="rounded-lg bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-3 py-2 text-sm font-semibold text-white shadow-[var(--quiz-glow)]"
                  >
                    Submissions
                  </Link>
                  {item.status === "ACTIVE" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void closeAssignment(item.id)}
                      className="rounded-lg border border-[var(--quiz-border)] px-3 py-2 text-sm font-medium text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)] disabled:opacity-60"
                    >
                      {busyId === item.id ? "Closing…" : "Close"}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-[var(--quiz-text-secondary)]">
        <button
          type="button"
          onClick={() => router.refresh()}
          className="font-medium text-[var(--quiz-brand-600)] hover:underline"
        >
          Refresh list
        </button>
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = {
  id: string;
  score: number;
  questionCount: number;
  completedAt: string;
  displayLabel: string;
};

export function AssignmentSubmissionsClient({
  assignmentId,
  assignmentTitle,
}: {
  assignmentId: string;
  assignmentTitle: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/assignments/${encodeURIComponent(assignmentId)}/submissions`,
        );
        const data = (await res.json()) as {
          submissions?: Row[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load submissions.");
          setRows([]);
          return;
        }
        setRows(Array.isArray(data.submissions) ? data.submissions : []);
      } catch {
        if (!cancelled) {
          setError("Could not load submissions.");
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  return (
    <div className="mt-6">
      <Link
        href="/assignments"
        className="text-sm font-medium text-[var(--quiz-brand-600)] hover:underline"
      >
        ← All assignments
      </Link>
      <h2 className="mt-4 text-xl font-semibold text-[var(--quiz-text-primary)]">
        {assignmentTitle}
      </h2>
      {error ? (
        <p className="mt-4 text-sm text-[var(--quiz-error)]">{error}</p>
      ) : null}
      {rows === null ? (
        <p className="mt-4 text-sm text-[var(--quiz-text-secondary)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--quiz-text-secondary)]">
          No submissions yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--quiz-border)]">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead className="border-b border-[var(--quiz-border)] bg-[var(--quiz-surface)]/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--quiz-text-primary)]">
                  Participant
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--quiz-text-primary)]">
                  Score
                </th>
                <th className="px-4 py-3 font-semibold text-[var(--quiz-text-primary)]">
                  Completed
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--quiz-border)]/60 last:border-0"
                >
                  <td className="px-4 py-3 text-[var(--quiz-text-primary)]">
                    {r.displayLabel}
                  </td>
                  <td className="px-4 py-3 text-[var(--quiz-text-primary)]">
                    {r.score}/{r.questionCount}
                  </td>
                  <td className="px-4 py-3 text-[var(--quiz-text-secondary)]">
                    {new Date(r.completedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

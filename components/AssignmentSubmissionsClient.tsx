"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

type QuestionRow = {
  prompt: string;
  choices: string[];
  correctIndex: number;
};

type AssignmentMeta = {
  title: string;
  publicId: string;
  joinCode: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  questionCount: number;
};

type SubmissionRow = {
  id: string;
  score: number;
  questionCount: number;
  completedAt: string;
  displayLabel: string;
  answers: number[] | null;
};

function choiceLetter(index: number): string {
  if (index < 0 || index > 25) return "?";
  return String.fromCharCode(65 + index);
}

function formatAnswerLine(choices: string[], index: number): string {
  if (index < 0) return "Skipped (no selection)";
  const text = choices[index]?.trim() || "—";
  return `${choiceLetter(index)}. ${text}`;
}

export function AssignmentSubmissionsClient({
  assignmentId,
  assignmentTitle,
}: {
  assignmentId: string;
  assignmentTitle: string;
}) {
  const [assignment, setAssignment] = useState<AssignmentMeta | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/assignments/${encodeURIComponent(assignmentId)}/submissions`,
        );
        const data = (await res.json()) as {
          assignment?: AssignmentMeta;
          questions?: QuestionRow[];
          submissions?: SubmissionRow[];
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Could not load submissions.");
          setSubmissions([]);
          return;
        }
        if (data.assignment) {
          setAssignment(data.assignment);
        }
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      } catch {
        if (!cancelled) {
          setError("Could not load submissions.");
          setSubmissions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  const title = assignment?.title ?? assignmentTitle;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const assignmentUrl =
    assignment && origin
      ? `${origin}/quiz?aid=${encodeURIComponent(assignment.publicId)}`
      : "";

  return (
    <div className="mt-6">
      <Link
        href="/assignments"
        className="text-sm font-medium text-[var(--quiz-brand-600)] hover:underline"
      >
        ← All assignments
      </Link>

      <div className="mt-4 rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)]/60 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--quiz-text-primary)] sm:text-2xl">
              {title}
            </h1>
            {assignment ? (
              <div className="mt-3 space-y-1 text-sm text-[var(--quiz-text-secondary)]">
                <p>
                  <span className="font-medium text-[var(--quiz-text-primary)]">
                    Status:
                  </span>{" "}
                  <span
                    className={
                      assignment.status === "ACTIVE"
                        ? "font-semibold text-emerald-600 dark:text-emerald-400"
                        : ""
                    }
                  >
                    {assignment.status === "ACTIVE" ? "Open for submissions" : "Closed"}
                  </span>
                </p>
                <p>
                  <span className="font-medium text-[var(--quiz-text-primary)]">
                    Created:
                  </span>{" "}
                  {new Date(assignment.createdAt).toLocaleString()}
                </p>
                {assignment.closedAt ? (
                  <p>
                    <span className="font-medium text-[var(--quiz-text-primary)]">
                      Closed:
                    </span>{" "}
                    {new Date(assignment.closedAt).toLocaleString()}
                  </p>
                ) : null}
                <p>
                  <span className="font-medium text-[var(--quiz-text-primary)]">
                    Questions:
                  </span>{" "}
                  {assignment.questionCount}
                </p>
                <p className="font-mono text-xs tracking-wide">
                  Join code:{" "}
                  <span className="text-[var(--quiz-text-primary)]">
                    {assignment.joinCode}
                  </span>
                </p>
                {assignmentUrl ? (
                  <p className="break-all text-xs">
                    <span className="font-medium text-[var(--quiz-text-primary)]">
                      Student link:
                    </span>{" "}
                    {assignmentUrl}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
                Loading assignment details…
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="sr-only">Submissions</h2>
      {error ? (
        <p className="mt-4 text-sm text-[var(--quiz-error)]">{error}</p>
      ) : null}
      {submissions === null ? (
        <p className="mt-4 text-sm text-[var(--quiz-text-secondary)]">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--quiz-text-secondary)]">
          No submissions yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--quiz-border)]">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="border-b border-[var(--quiz-border)] bg-[var(--quiz-surface)]/80">
              <tr>
                <th className="w-10 px-2 py-3" aria-hidden />
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
              {submissions.map((r) => {
                const open = expandedId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-b border-[var(--quiz-border)]/60">
                      <td className="px-2 py-3 align-middle">
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : r.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--quiz-text-secondary)] hover:border-[var(--quiz-border)] hover:bg-[var(--quiz-surface)] hover:text-[var(--quiz-text-primary)]"
                          aria-expanded={open}
                          aria-label={
                            open ? "Hide answers for this row" : "Show answers"
                          }
                        >
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
                            className={`transition-transform ${open ? "rotate-180" : ""}`}
                            aria-hidden
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </td>
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
                    {open ? (
                      <tr className="border-b border-[var(--quiz-border)]/60 bg-[var(--quiz-surface)]/40">
                        <td colSpan={4} className="px-4 py-4 sm:px-6">
                          {questions.length === 0 ? (
                            <p className="text-sm text-[var(--quiz-text-secondary)]">
                              Question text could not be loaded for this assignment.
                            </p>
                          ) : r.answers === null ? (
                            <p className="text-sm text-[var(--quiz-text-secondary)]">
                              Answer details are not stored for this submission (older
                              submissions). New attempts will include per-question
                              responses.
                            </p>
                          ) : (
                            <ol className="space-y-4">
                              {questions.map((q, i) => {
                                const selected = r.answers![i] ?? -1;
                                const correct = q.correctIndex;
                                const isCorrect = selected >= 0 && selected === correct;
                                const isWrong = selected >= 0 && selected !== correct;
                                return (
                                  <li
                                    key={i}
                                    className="rounded-xl border border-[var(--quiz-border)]/80 bg-[var(--quiz-card)] p-4"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--quiz-muted)]">
                                      Question {i + 1}
                                    </p>
                                    <p className="mt-1 font-medium text-[var(--quiz-text-primary)]">
                                      {q.prompt}
                                    </p>
                                    <div className="mt-3 space-y-2 text-sm">
                                      <p>
                                        <span className="text-[var(--quiz-text-secondary)]">
                                          Correct:{" "}
                                        </span>
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                          {formatAnswerLine(q.choices, correct)}
                                        </span>
                                      </p>
                                      <p>
                                        <span className="text-[var(--quiz-text-secondary)]">
                                          Their answer:{" "}
                                        </span>
                                        <span
                                          className={
                                            selected < 0
                                              ? "font-medium text-[var(--quiz-muted)]"
                                              : isCorrect
                                                ? "font-medium text-emerald-700 dark:text-emerald-400"
                                                : isWrong
                                                  ? "font-medium text-red-700 dark:text-red-400"
                                                  : "font-medium text-[var(--quiz-text-primary)]"
                                          }
                                        >
                                          {formatAnswerLine(q.choices, selected)}
                                        </span>
                                      </p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { ResultsList } from "@/components/ResultsList";
import { generateQuizFromApi } from "@/lib/api-client";
import {
  createDifficultyVariantRequest,
  createTryAgainRequest,
} from "@/lib/quiz-client-utils";
import { getScore } from "@/lib/utils";
import {
  loadQuizImagePreview,
  loadQuizSession,
  loadUserAnswers,
  mergeStoredImageIntoRequest,
  saveQuizSession,
  saveRequestDraft,
  saveUserAnswers,
} from "@/lib/quiz-storage";
import { createShortShareUrl } from "@/lib/share-client";
import { encodeQuizToUrl } from "@/lib/share";
import { QuizSession } from "@/lib/types";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function useQuizImagePreview(session: QuizSession | null) {
  return useMemo(() => {
    if (!session || session.request.input_type !== "image") return null;
    return loadQuizImagePreview();
  }, [session]);
}

export default function ResultsPage() {
  const router = useRouter();
  const { status: authStatus } = useSession();
  const [session] = useState<QuizSession | null>(() => loadQuizSession());
  const imagePreview = useQuizImagePreview(session);
  const [answers] = useState<number[]>(() =>
    session ? loadUserAnswers(session.quiz.questions.length) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attemptPersistError, setAttemptPersistError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || session.quiz.questions.length === 0) {
      router.replace("/");
    }
  }, [router, session]);

  useEffect(() => {
    if (!session || authStatus !== "authenticated") return;
    const doneKey = `quizforge-attempt-done-${session.created_at}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(doneKey)) {
      return;
    }
    const idemStorageKey = `quizforge-attempt-idem-${session.created_at}`;
    let idempotencyKey: string | null = null;
    if (typeof sessionStorage !== "undefined") {
      idempotencyKey = sessionStorage.getItem(idemStorageKey);
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem(idemStorageKey, idempotencyKey);
      }
    } else {
      idempotencyKey = crypto.randomUUID();
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/quiz-attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, answers, idempotencyKey }),
        });
        if (cancelled) return;
        if (res.ok) {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(doneKey, "1");
          }
        } else {
          const data = (await res.json()) as { error?: string };
          setAttemptPersistError(
            typeof data.error === "string"
              ? data.error
              : "Could not sync your quiz to your profile. Your score is still saved locally.",
          );
        }
      } catch {
        if (!cancelled) {
          setAttemptPersistError(
            "Could not sync your quiz to your profile. Your score is still saved locally.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, authStatus, answers]);

  const score = useMemo(() => {
    if (!session) return 0;
    return getScore(session.quiz.questions, answers);
  }, [answers, session]);

  const regenerate = async (
    variant: "same" | "harder" | "easier",
  ): Promise<void> => {
    if (!session) return;
    setIsRegenerating(true);
    setError(null);

    try {
      const baseRequest =
        variant === "same"
          ? createTryAgainRequest(session)
          : createDifficultyVariantRequest(session, variant);
      const request = mergeStoredImageIntoRequest(baseRequest);

      const quiz = await generateQuizFromApi(request);
      const nextSession: QuizSession = {
        request,
        quiz,
        created_at: new Date().toISOString(),
      };

      saveRequestDraft(request);
      saveQuizSession(nextSession);
      saveUserAnswers(new Array(quiz.questions.length).fill(-1));
      router.push("/quiz");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to regenerate quiz.";
      setError(message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const saveToLibrary = async () => {
    if (!session) return;
    if (authStatus !== "authenticated") {
      router.push("/sign-in?callbackUrl=/results");
      return;
    }
    setSaveStatus("loading");
    setSaveError(null);
    try {
      const res = await fetch("/api/saved-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveStatus("error");
        setSaveError(typeof data.error === "string" ? data.error : "Could not save.");
        return;
      }
      setSaveStatus("done");
    } catch {
      setSaveStatus("error");
      setSaveError("Could not save.");
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-transparent">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <LoadingState
            primaryText="Loading results..."
            secondaryText="Preparing your score breakdown."
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-bold text-[var(--quiz-text-primary)] sm:text-3xl">
            You scored {score}/{session.quiz.questions.length}
          </h1>
          <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
            Review each question below and regenerate with one click.
          </p>

          {imagePreview?.images[0]?.dataUrl ? (
            <div className="mt-5 flex flex-col items-center gap-2 sm:items-start">
              <img
                src={imagePreview.images[0].dataUrl}
                alt={
                  imagePreview.images[0].fileName
                    ? `Source image: ${imagePreview.images[0].fileName}`
                    : "Source image for this quiz"
                }
                className="max-h-56 max-w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] object-contain shadow-sm"
              />
              {imagePreview.images.length > 1 ? (
                <p className="text-xs text-[var(--quiz-text-secondary)]">
                  {imagePreview.images.length} source images (showing first)
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3 no-print">
            <button
              type="button"
              onClick={() => regenerate("same")}
              disabled={isRegenerating}
              className="rounded-xl bg-[var(--quiz-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--quiz-secondary)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => regenerate("harder")}
              disabled={isRegenerating}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Make Harder
            </button>
            <button
              type="button"
              onClick={() => regenerate("easier")}
              disabled={isRegenerating}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Make Easier
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80"
            >
              Print
            </button>
            <button
              type="button"
              onClick={saveToLibrary}
              disabled={saveStatus === "loading" || authStatus === "loading"}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saveStatus === "loading"
                ? "Saving…"
                : saveStatus === "done"
                  ? "Saved!"
                  : authStatus === "unauthenticated"
                    ? "Save to library (sign in)"
                    : "Save to library"}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!session) return;
                setError(null);
                setIsCopyingLink(true);
                try {
                  let url: string | null = await createShortShareUrl(session);
                  if (!url) {
                    url = encodeQuizToUrl(session);
                  }
                  if (!url) {
                    setError(
                      "This quiz is too large to share as a link. Try fewer questions or a shorter source.",
                    );
                    return;
                  }
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } finally {
                  setIsCopyingLink(false);
                }
              }}
              disabled={isCopyingLink}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {copied ? "Copied!" : isCopyingLink ? "Copying…" : "Copy Link"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-primary)] transition-colors hover:opacity-80"
            >
              Main screen
            </button>
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-[var(--quiz-error)]">{error}</p>
          ) : null}
          {saveError ? (
            <p className="mt-3 text-sm font-medium text-[var(--quiz-error)]">{saveError}</p>
          ) : null}
          {attemptPersistError ? (
            <p className="mt-3 text-sm font-medium text-[var(--quiz-error)]" role="status">
              {attemptPersistError}
            </p>
          ) : null}
        </header>

        <section className="mt-5">
          <ResultsList questions={session.quiz.questions} answers={answers} />
        </section>
      </main>
    </div>
  );
}

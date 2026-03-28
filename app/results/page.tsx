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
  const [session] = useState<QuizSession | null>(() => loadQuizSession());
  const imagePreview = useQuizImagePreview(session);
  const [answers] = useState<number[]>(() =>
    session ? loadUserAnswers(session.quiz.questions.length) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  useEffect(() => {
    if (!session || session.quiz.questions.length === 0) {
      router.replace("/");
    }
  }, [router, session]);

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

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--quiz-background)]">
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
    <div className="min-h-screen bg-[var(--quiz-background)]">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 shadow-sm sm:p-7">
          <h1 className="text-2xl font-bold text-[var(--quiz-text-primary)] sm:text-3xl">
            You scored {score}/{session.quiz.questions.length}
          </h1>
          <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">
            Review each question below and regenerate with one click.
          </p>

          {imagePreview?.dataUrl ? (
            <div className="mt-5 flex justify-center sm:justify-start">
              <img
                src={imagePreview.dataUrl}
                alt={
                  imagePreview.fileName
                    ? `Source image: ${imagePreview.fileName}`
                    : "Source image for this quiz"
                }
                className="max-h-56 max-w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] object-contain shadow-sm"
              />
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
        </header>

        <section className="mt-5">
          <ResultsList questions={session.quiz.questions} answers={answers} />
        </section>
      </main>
    </div>
  );
}

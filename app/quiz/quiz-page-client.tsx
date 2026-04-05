"use client";

import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizCard } from "@/components/QuizCard";
import { answerSelectFeedback } from "@/lib/quiz-feedback";
import {
  loadQuizSession,
  loadUserAnswers,
  saveQuizSession,
  saveUserAnswers,
} from "@/lib/quiz-storage";
import { fetchSharedQuizById } from "@/lib/share-client";
import { decodeQuizFromUrl } from "@/lib/share";
import { QuizSession } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type LoadStatus = "loading" | "ready" | "error";

export function QuizPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sid = searchParams.get("sid");
  const qParam = searchParams.get("q");
  const embedParam = searchParams.get("embed");
  const isEmbed =
    embedParam === "1" ||
    embedParam === "true" ||
    embedParam === "yes";

  const [session, setSession] = useState<QuizSession | null>(null);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    function applySession(next: QuizSession | null) {
      setSession(next);
      if (next) {
        setAnswers(loadUserAnswers(next.quiz.questions.length));
        setTimeLeft(next.request.settings.time_limit_seconds ?? null);
      } else {
        setAnswers([]);
        setTimeLeft(null);
      }
    }

    async function resolveSession() {
      setLoadStatus("loading");
      setLoadError(null);

      if (sid) {
        const result = await fetchSharedQuizById(sid);
        if (cancelled) return;
        if (!result.ok) {
          setLoadError(result.message);
          setLoadStatus("error");
          applySession(null);
          return;
        }
        saveQuizSession(result.session);
        saveUserAnswers(new Array(result.session.quiz.questions.length).fill(-1));
        applySession(result.session);
        setLoadStatus("ready");
        return;
      }

      if (qParam) {
        const shared = decodeQuizFromUrl(qParam);
        if (shared) {
          saveQuizSession(shared);
          saveUserAnswers(new Array(shared.quiz.questions.length).fill(-1));
          applySession(shared);
        } else {
          applySession(loadQuizSession());
        }
        setLoadStatus("ready");
        return;
      }

      applySession(loadQuizSession());
      setLoadStatus("ready");
    }

    void resolveSession();
    return () => {
      cancelled = true;
    };
  }, [sid, qParam]);

  useEffect(() => {
    if (loadStatus !== "ready") return;
    if (isEmbed) return;
    if (!session || session.quiz.questions.length === 0) {
      router.replace("/");
    }
  }, [loadStatus, router, session, isEmbed]);

  const progress = useMemo(() => {
    if (!session) return 0;
    return ((currentIndex + 1) / session.quiz.questions.length) * 100;
  }, [currentIndex, session]);

  const onSelectAnswer = useCallback(
    (choiceIndex: number) => {
      if (!session) return;
      if (answers[currentIndex] === choiceIndex) return;
      answerSelectFeedback();
      setAnswers((previous) => {
        const next = [...previous];
        next[currentIndex] = choiceIndex;
        saveUserAnswers(next);
        return next;
      });
    },
    [answers, currentIndex, session],
  );

  const onNext = useCallback(() => {
    if (!session) return;
    if (answers[currentIndex] == null || answers[currentIndex] < 0) {
      return;
    }

    if (currentIndex < session.quiz.questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    router.push("/results");
  }, [answers, currentIndex, router, session]);

  const onBack = useCallback(() => {
    setCurrentIndex((value) => Math.max(0, value - 1));
  }, []);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // Intentionally only re-subscribe when timer on/off toggles, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [timeLeft === null]);

  useEffect(() => {
    if (timeLeft === 0) {
      router.push("/results");
    }
  }, [timeLeft, router]);

  useEffect(() => {
    if (!session) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      const choiceMap: Record<string, number> = {
        "1": 0,
        a: 0,
        "2": 1,
        b: 1,
        "3": 2,
        c: 2,
        "4": 3,
        d: 3,
      };

      if (key in choiceMap) {
        const choiceIndex = choiceMap[key];
        const answered = answers[currentIndex] >= 0;
        if (session.request.settings.mode === "study" && answered) return;
        onSelectAnswer(choiceIndex);
        return;
      }

      if (key === "enter" || key === "arrowright") {
        e.preventDefault();
        onNext();
        return;
      }

      if (key === "arrowleft" || key === "backspace") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, currentIndex, answers, onSelectAnswer, onNext, onBack]);

  const shellClass = isEmbed
    ? "min-h-[520px] bg-transparent"
    : "min-h-screen bg-transparent";

  const Nav = isEmbed ? null : <Navbar />;

  if (loadStatus === "error") {
    return (
      <div className={shellClass}>
        {Nav}
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-base font-medium text-[var(--quiz-error)]">{loadError}</p>
          {!isEmbed && (
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-4 rounded-xl bg-[var(--quiz-primary)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Return home
            </button>
          )}
        </main>
      </div>
    );
  }

  if (loadStatus === "loading") {
    return (
      <div className={shellClass}>
        {Nav}
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <LoadingState
            primaryText="Loading quiz..."
            secondaryText="Preparing your questions."
          />
        </main>
      </div>
    );
  }

  if (!session) {
    if (isEmbed) {
      return (
        <div className={shellClass}>
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <p className="text-sm text-[var(--quiz-text-secondary)]">
              No quiz to display. Open a shared link in the full app at QuizForge.
            </p>
          </main>
        </div>
      );
    }
    return (
      <div className={shellClass}>
        {Nav}
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <LoadingState
            primaryText="Loading quiz..."
            secondaryText="Preparing your questions."
          />
        </main>
      </div>
    );
  }

  if (session.quiz.questions.length === 0) {
    return (
      <div className={shellClass}>
        {Nav}
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <p className="text-sm text-[var(--quiz-text-secondary)]">
            This quiz has no questions.
          </p>
        </main>
      </div>
    );
  }

  const total = session.quiz.questions.length;
  const question = session.quiz.questions[currentIndex];
  const selectedAnswer = answers[currentIndex] ?? -1;

  return (
    <div className={shellClass}>
      {Nav}
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <header>
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-[var(--quiz-text-primary)] sm:text-lg">
              Question {currentIndex + 1} of {total}
            </p>
            {timeLeft !== null && (
              <p
                className={`text-base font-mono font-semibold sm:text-lg ${
                  timeLeft <= 10
                    ? "text-[var(--quiz-error)]"
                    : "text-[var(--quiz-text-secondary)]"
                }`}
              >
                {formatTime(timeLeft)}
              </p>
            )}
          </div>
          <div className="mt-3">
            <ProgressBar value={progress} />
          </div>
        </header>

        <section className="mt-5">
          <QuizCard
            question={question}
            questionIndex={currentIndex}
            selectedAnswer={selectedAnswer}
            mode={session.request.settings.mode}
            onSelectAnswer={onSelectAnswer}
          />
        </section>

        <nav className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={currentIndex === 0}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-secondary)] transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={answers[currentIndex] == null || answers[currentIndex] < 0}
            className="rounded-xl bg-[var(--quiz-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--quiz-secondary)]"
          >
            {currentIndex === total - 1 ? "Finish Quiz" : "Next"}
          </button>
        </nav>

        {!isEmbed && (
          <p className="mt-4 text-center text-xs text-[var(--quiz-muted)]">
            Press A-D to select, Enter to continue, arrows to navigate
          </p>
        )}
      </main>
    </div>
  );
}

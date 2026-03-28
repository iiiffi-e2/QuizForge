"use client";

import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizCard } from "@/components/QuizCard";
import { loadQuizSession, loadUserAnswers, saveQuizSession, saveUserAnswers } from "@/lib/quiz-storage";
import { decodeQuizFromUrl } from "@/lib/share";
import { QuizSession } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--quiz-background)]">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <LoadingState
              primaryText="Loading quiz..."
              secondaryText="Preparing your questions."
            />
          </main>
        </div>
      }
    >
      <QuizPageInner />
    </Suspense>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function QuizPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session] = useState<QuizSession | null>(() => {
    const sharedParam = searchParams.get("q");
    if (sharedParam) {
      const shared = decodeQuizFromUrl(sharedParam);
      if (shared) {
        saveQuizSession(shared);
        saveUserAnswers(new Array(shared.quiz.questions.length).fill(-1));
        return shared;
      }
    }
    return loadQuizSession();
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    session ? loadUserAnswers(session.quiz.questions.length) : [],
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(() =>
    session?.request.settings.time_limit_seconds ?? null,
  );

  useEffect(() => {
    if (!session || session.quiz.questions.length === 0) {
      router.replace("/");
    }
  }, [router, session]);

  const progress = useMemo(() => {
    if (!session) return 0;
    return ((currentIndex + 1) / session.quiz.questions.length) * 100;
  }, [currentIndex, session]);

  const onSelectAnswer = useCallback(
    (choiceIndex: number) => {
      if (!session) return;
      setAnswers((previous) => {
        const next = [...previous];
        next[currentIndex] = choiceIndex;
        saveUserAnswers(next);
        return next;
      });
    },
    [currentIndex, session],
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

  // Timer
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
  }, [timeLeft === null]); // only re-run if timer existence changes

  // Auto-submit when timer expires
  useEffect(() => {
    if (timeLeft === 0) {
      router.push("/results");
    }
  }, [timeLeft, router]);

  // Keyboard navigation
  useEffect(() => {
    if (!session) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Answer selection: 1-4 or a-d
      const choiceMap: Record<string, number> = {
        "1": 0, a: 0,
        "2": 1, b: 1,
        "3": 2, c: 2,
        "4": 3, d: 3,
      };

      if (key in choiceMap) {
        const choiceIndex = choiceMap[key];
        // In study mode, don't allow re-selection after answering
        const answered = answers[currentIndex] >= 0;
        if (session.request.settings.mode === "study" && answered) return;
        onSelectAnswer(choiceIndex);
        return;
      }

      // Navigation
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

  if (!session) {
    return (
      <div className="min-h-screen bg-[var(--quiz-background)]">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <LoadingState
            primaryText="Loading quiz..."
            secondaryText="Preparing your questions."
          />
        </main>
      </div>
    );
  }

  const total = session.quiz.questions.length;
  const question = session.quiz.questions[currentIndex];
  const selectedAnswer = answers[currentIndex] ?? -1;

  return (
    <div className="min-h-screen bg-[var(--quiz-background)]">
      <Navbar />
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

        <p className="mt-4 text-center text-xs text-[var(--quiz-muted)]">
          Press A-D to select, Enter to continue, arrows to navigate
        </p>
      </main>
    </div>
  );
}

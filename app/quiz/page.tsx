"use client";

import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { ProgressBar } from "@/components/ProgressBar";
import { QuizCard } from "@/components/QuizCard";
import { loadQuizSession, loadUserAnswers, saveUserAnswers } from "@/lib/quiz-storage";
import { QuizSession } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function QuizPage() {
  const router = useRouter();
  const [session] = useState<QuizSession | null>(() => loadQuizSession());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(() =>
    session ? loadUserAnswers(session.quiz.questions.length) : [],
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

  const onSelectAnswer = (choiceIndex: number) => {
    if (!session) return;

    setAnswers((previous) => {
      const next = [...previous];
      next[currentIndex] = choiceIndex;
      saveUserAnswers(next);
      return next;
    });
  };

  const onNext = () => {
    if (!session) return;
    if (answers[currentIndex] == null || answers[currentIndex] < 0) {
      return;
    }

    if (currentIndex < session.quiz.questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }

    router.push("/results");
  };

  const onBack = () => {
    setCurrentIndex((value) => Math.max(0, value - 1));
  };

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
          <p className="text-base font-semibold text-[var(--quiz-text-primary)] sm:text-lg">
            Question {currentIndex + 1} of {total}
          </p>
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
            className="rounded-xl border border-[var(--quiz-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--quiz-text-secondary)] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
      </main>
    </div>
  );
}

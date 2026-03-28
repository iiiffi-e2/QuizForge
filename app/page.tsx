"use client";

import { InputTabs } from "@/components/InputTabs";
import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DEFAULT_REQUEST } from "@/lib/constants";
import { generateQuizFromApi } from "@/lib/api-client";
import {
  loadRequestDraft,
  saveQuizSession,
  saveRequestDraft,
  saveUserAnswers,
} from "@/lib/quiz-storage";
import { QuizGenerationRequest, QuizInputType, QuizSession } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type LoadingStage = "extracting" | "generating";

export default function HomePage() {
  const router = useRouter();
  const [request, setRequest] = useState<QuizGenerationRequest>(DEFAULT_REQUEST);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");

  useEffect(() => {
    const stored = loadRequestDraft();
    if (stored) {
      setRequest(stored);
    }
  }, []);

  useEffect(() => {
    saveRequestDraft(request);
  }, [request]);

  const canGenerate = useMemo(() => {
    return request.content.trim().length > 0;
  }, [request.content]);

  const setInputType = (nextType: QuizInputType) => {
    setError(null);
    setRequest((previous) => {
      if (nextType === previous.input_type) return previous;
      return {
        ...previous,
        input_type: nextType,
        content: "",
      };
    });
  };

  const setContent = (nextContent: string) => {
    setError(null);
    setRequest((previous) => ({
      ...previous,
      content: nextContent,
    }));
  };

  const setSettings: React.ComponentProps<typeof SettingsPanel>["onChange"] = (
    nextSettings,
  ) => {
    setRequest((previous) => ({
      ...previous,
      settings: nextSettings,
    }));
  };

  const onFileConvert: React.ComponentProps<typeof InputTabs>["onFileConvert"] = (
    type,
    payload,
  ) => {
    setRequest((previous) => ({
      ...previous,
      input_type: type,
      content: JSON.stringify(payload),
    }));
  };

  const validateRequest = (): string | null => {
    if (!request.content.trim()) {
      return "Please provide source material before generating a quiz.";
    }

    if (request.input_type === "url") {
      try {
        // eslint-disable-next-line no-new
        new URL(request.content);
      } catch {
        return "Please provide a valid URL.";
      }
    }

    return null;
  };

  const onGenerate = async () => {
    const validationError = validateRequest();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStage("extracting");

    try {
      window.setTimeout(() => {
        setLoadingStage("generating");
      }, 700);

      const quiz = await generateQuizFromApi(request);
      const session: QuizSession = {
        request,
        quiz,
        created_at: new Date().toISOString(),
      };

      saveQuizSession(session);
      saveUserAnswers(new Array(quiz.questions.length).fill(-1));
      router.push("/quiz");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unexpected error while generating quiz.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--quiz-background)]">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-[var(--quiz-text-primary)] sm:text-4xl">
            Turn anything into a quiz
          </h1>
          <p className="mt-3 text-sm text-[var(--quiz-text-secondary)] sm:text-base">
            Generate high-quality multiple-choice quizzes from topics, text, files,
            images, or URLs.
          </p>
        </section>

        <section className="mx-auto mt-7 w-full max-w-3xl rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 shadow-sm sm:p-7">
          {isLoading ? (
            <LoadingState
              primaryText={
                loadingStage === "extracting"
                  ? "Extracting content..."
                  : "Generating quiz..."
              }
              secondaryText={
                loadingStage === "extracting"
                  ? "Preparing your material for quiz generation."
                  : "Building your personalized quiz questions."
              }
            />
          ) : (
            <>
              <InputTabs
                inputType={request.input_type}
                content={request.content}
                onTypeChange={setInputType}
                onContentChange={setContent}
                onFileConvert={onFileConvert}
                onInputError={setError}
              />

              <SettingsPanel settings={request.settings} onChange={setSettings} />

              {error ? (
                <p className="mt-4 text-sm font-medium text-[var(--quiz-error)]">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="mt-7 w-full rounded-xl bg-[var(--quiz-primary)] px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--quiz-secondary)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                Generate Quiz
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

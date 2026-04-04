"use client";

import { InputTabs } from "@/components/InputTabs";
import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DEFAULT_REQUEST } from "@/lib/constants";
import { generateQuizFromApi } from "@/lib/api-client";
import {
  hasQuizSourceContent,
  loadRequestDraft,
  saveQuizSession,
  saveRequestDraft,
  saveUserAnswers,
} from "@/lib/quiz-storage";
import { QuizGenerationRequest, QuizInputType, QuizSession } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type LoadingStage = "extracting" | "generating";

export default function HomePage() {
  const router = useRouter();
  const [request, setRequest] = useState<QuizGenerationRequest>(() => ({
    ...DEFAULT_REQUEST,
    settings: { ...DEFAULT_REQUEST.settings },
  }));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("extracting");
  const skipInitialSave = useRef(true);

  useEffect(() => {
    const stored = loadRequestDraft();
    if (stored) {
      setRequest(stored);
    }
  }, []);

  useEffect(() => {
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    saveRequestDraft(request);
  }, [request]);

  const canGenerate = useMemo(
    () => hasQuizSourceContent(request),
    [request.content, request.input_type],
  );

  const setInputType = (nextType: QuizInputType) => {
    setError(null);
    setRequest((previous) => {
      if (nextType === previous.input_type) return previous;
      const isTextFamily = (t: QuizInputType) =>
        t === "topic" || t === "text";
      if (isTextFamily(nextType) && isTextFamily(previous.input_type)) {
        return { ...previous, input_type: nextType };
      }
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

    if (request.input_type === "file" || request.input_type === "image") {
      try {
        const parsed = JSON.parse(request.content) as { dataUrl?: string };
        if (!parsed.dataUrl?.trim()) {
          return "File data is not available (e.g. storage limit). Upload the file again to generate.";
        }
      } catch {
        return "Please provide source material before generating a quiz.";
      }
    }

    if (request.input_type === "url") {
      if (!URL.canParse(request.content)) {
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
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-[1.75rem] font-bold tracking-tight text-[var(--quiz-text-primary)] sm:text-4xl sm:leading-tight">
            Turn anything into a quiz
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--quiz-text-secondary)] sm:text-base">
            Generate high-quality multiple-choice quizzes instantly from topics,
            text, files, images, or URLs using advanced AI.
          </p>
        </section>

        <section className="quiz-main-card mx-auto mt-10 w-full max-w-3xl rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-6 shadow-[var(--quiz-card-shadow)] sm:p-8">
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
              <SettingsPanel settings={request.settings} onChange={setSettings} />

              <InputTabs
                inputType={request.input_type}
                content={request.content}
                onTypeChange={setInputType}
                onContentChange={setContent}
                onFileConvert={onFileConvert}
                onInputError={setError}
              />

              {error ? (
                <p className="mt-4 text-sm font-medium text-[var(--quiz-error)]">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={onGenerate}
                disabled={!canGenerate}
                className="mt-8 w-full rounded-xl bg-[var(--quiz-primary)] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--quiz-secondary)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
              >
                Generate Quiz Now
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

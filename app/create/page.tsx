"use client";

import { ClassCodeEntry } from "@/components/ClassCodeEntry";
import { InputTabs } from "@/components/InputTabs";
import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { SettingsPanel } from "@/components/SettingsPanel";
import { DEFAULT_REQUEST } from "@/lib/constants";
import { generateQuizFromApi } from "@/lib/api-client";
import {
  hasImageUploadData,
  parseImageUploadContent,
  serializeImageUploadPayload,
  type ImageUploadItem,
} from "@/lib/image-upload-payload";
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

export default function CreateQuizPage() {
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
    setRequest((previous) => {
      if (type === "image") {
        const images = (payload as { images: ImageUploadItem[] }).images;
        return {
          ...previous,
          input_type: type,
          content: serializeImageUploadPayload(images),
        };
      }
      return {
        ...previous,
        input_type: type,
        content: JSON.stringify(payload),
      };
    });
  };

  const validateRequest = (): string | null => {
    if (!request.content.trim()) {
      return "Please provide source material before generating a quiz.";
    }

    if (request.input_type === "file") {
      try {
        const parsed = JSON.parse(request.content) as { dataUrl?: string };
        if (!parsed.dataUrl?.trim()) {
          return "File data is not available (e.g. storage limit). Upload the file again to generate.";
        }
      } catch {
        return "Please provide source material before generating a quiz.";
      }
    }

    if (request.input_type === "image") {
      try {
        if (!hasImageUploadData(parseImageUploadContent(request.content))) {
          return "Image data is not available (e.g. storage limit). Upload images again to generate.";
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
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-[1.85rem] font-extrabold tracking-tight text-[var(--quiz-text-primary)] sm:text-5xl sm:leading-tight">
            Turn anything into a{" "}
            <span className="bg-gradient-to-r from-[var(--quiz-brand-600)] to-[var(--quiz-blue-600)] bg-clip-text text-transparent">
              quiz
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base font-medium leading-relaxed text-[var(--quiz-text-secondary)] sm:text-lg">
            Generate high-quality multiple-choice quizzes instantly from topics,
            text, files, images, or URLs using advanced AI.
          </p>
        </section>

        <div className="mx-auto mt-8 w-full max-w-xl px-0 sm:px-2">
          <ClassCodeEntry variant="compact" />
        </div>

        <section className="quiz-main-card mx-auto mt-8 w-full max-w-4xl rounded-3xl border border-white/60 bg-[var(--quiz-card)] p-6 sm:p-10">
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
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--quiz-brand-500)] to-[var(--quiz-brand-600)] px-4 py-4 text-base font-bold text-white shadow-[var(--quiz-glow)] transition-all hover:from-[var(--quiz-brand-600)] hover:to-[var(--quiz-brand-700)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 sm:py-5 sm:text-lg"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 opacity-95"
                  aria-hidden
                >
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <path d="M5 3v4" />
                  <path d="M19 17v4" />
                  <path d="M3 5h4" />
                  <path d="M17 19h4" />
                </svg>
                Generate Quiz Now
              </button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

"use client";

import { DEFAULT_REQUEST } from "@/lib/constants";
import { QuizGenerationRequest, QuizSession } from "@/lib/types";

export function createTryAgainRequest(session: QuizSession): QuizGenerationRequest {
  return {
    input_type: session.request.input_type,
    content: session.request.content,
    settings: { ...session.request.settings },
  };
}

export function createDifficultyVariantRequest(
  session: QuizSession,
  direction: "harder" | "easier",
): QuizGenerationRequest {
  const current = session.request.settings.difficulty;
  const nextDifficulty =
    direction === "harder"
      ? current === "easy"
        ? "medium"
        : "hard"
      : current === "hard"
        ? "medium"
        : "easy";

  return {
    ...createTryAgainRequest(session),
    settings: {
      ...session.request.settings,
      difficulty: nextDifficulty,
    },
  };
}

export function cloneDefaultRequest(): QuizGenerationRequest {
  return {
    ...DEFAULT_REQUEST,
    settings: { ...DEFAULT_REQUEST.settings },
  };
}

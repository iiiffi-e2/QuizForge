"use client";

import { QuizGenerationRequest, QuizPayload } from "@/lib/types";

export async function generateQuizFromApi(
  request: QuizGenerationRequest,
): Promise<QuizPayload> {
  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "Failed to generate quiz.");
  }

  const data = (await response.json()) as QuizPayload;
  if (!Array.isArray(data.questions)) {
    throw new Error("Invalid quiz response.");
  }

  return data;
}

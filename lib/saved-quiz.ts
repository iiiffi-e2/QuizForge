import { isQuizSession } from "@/lib/quiz-session-guards";
import type { QuizGenerationRequest, QuizSession } from "@/lib/types";

export const MAX_SAVED_QUIZ_SESSION_BYTES = 900_000;

export function byteLengthUtf8(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

export function assertValidQuizSessionForSave(value: unknown): asserts value is QuizSession {
  if (!isQuizSession(value)) {
    throw new Error("Invalid quiz session.");
  }
  const n = byteLengthUtf8(JSON.stringify(value));
  if (n > MAX_SAVED_QUIZ_SESSION_BYTES) {
    throw new Error("Quiz is too large to save. Try fewer questions or a shorter source.");
  }
}

export function deriveDefaultTitle(request: QuizGenerationRequest): string {
  const raw = request.content.trim();
  if (request.input_type === "topic" || request.input_type === "text") {
    const line = raw.split("\n")[0]?.trim() ?? "Saved quiz";
    return line.slice(0, 120) || "Saved quiz";
  }
  return "Saved quiz";
}

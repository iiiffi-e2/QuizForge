import type { QuizSession } from "@/lib/types";

export function isQuizSession(value: unknown): value is QuizSession {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  if (typeof o.request !== "object" || o.request === null) return false;
  if (typeof o.quiz !== "object" || o.quiz === null) return false;
  const quiz = o.quiz as { questions?: unknown };
  return Array.isArray(quiz.questions) && quiz.questions.length > 0;
}

import { assertValidQuizSessionForSave, deriveDefaultTitle } from "@/lib/saved-quiz";
import type { QuizSession } from "@/lib/types";
import { getScore } from "@/lib/utils";

const MAX_IDEMPOTENCY_KEY_LEN = 128;

export interface QuizAttemptPayloadInput {
  session: unknown;
  answers: unknown;
  idempotencyKey: unknown;
}

export interface ParsedQuizAttemptPayload {
  session: QuizSession;
  score: number;
  questionCount: number;
  title: string;
  idempotencyKey: string;
}

function isValidChoiceIndex(value: unknown): boolean {
  if (typeof value !== "number" || !Number.isInteger(value)) return false;
  return value >= -1 && value <= 3;
}

export function parseQuizAttemptPayload(
  input: QuizAttemptPayloadInput,
): ParsedQuizAttemptPayload {
  const { session: rawSession, answers: rawAnswers, idempotencyKey: rawKey } = input;

  if (typeof rawKey !== "string" || !rawKey.trim()) {
    throw new Error("idempotencyKey is required.");
  }
  const idempotencyKey = rawKey.trim();
  if (idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LEN) {
    throw new Error("idempotencyKey is too long.");
  }

  assertValidQuizSessionForSave(rawSession);
  const session = rawSession;

  if (!Array.isArray(rawAnswers)) {
    throw new Error("answers must be an array.");
  }
  const n = session.quiz.questions.length;
  if (rawAnswers.length !== n) {
    throw new Error("answers length must match number of questions.");
  }
  for (const a of rawAnswers) {
    if (!isValidChoiceIndex(a)) {
      throw new Error("Each answer must be an integer from -1 to 3.");
    }
  }
  const answers = rawAnswers as number[];

  const score = getScore(session.quiz.questions, answers);
  const title = deriveDefaultTitle(session.request);

  return {
    session,
    score,
    questionCount: n,
    title: title.slice(0, 200),
    idempotencyKey,
  };
}

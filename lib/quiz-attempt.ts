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

export function parseAnswersForSession(session: QuizSession, answers: unknown): number[] {
  if (!Array.isArray(answers)) {
    throw new Error("answers must be an array.");
  }
  const n = session.quiz.questions.length;
  if (answers.length !== n) {
    throw new Error("answers length must match number of questions.");
  }
  for (const a of answers) {
    if (!isValidChoiceIndex(a)) {
      throw new Error("Each answer must be an integer from -1 to 3.");
    }
  }
  return answers as number[];
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

  const answers = parseAnswersForSession(session, rawAnswers);

  const score = getScore(session.quiz.questions, answers);
  const title = deriveDefaultTitle(session.request);
  const questionCount = session.quiz.questions.length;

  return {
    session,
    score,
    questionCount,
    title: title.slice(0, 200),
    idempotencyKey,
  };
}

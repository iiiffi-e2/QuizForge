import { assertValidQuizSessionForSave } from "@/lib/saved-quiz";
import { parseAnswersForSession } from "@/lib/quiz-attempt";
import type { QuizSession } from "@/lib/types";
import { getScore } from "@/lib/utils";

export function gradeQuizSnapshot(snapshot: unknown, answers: unknown): {
  score: number;
  questionCount: number;
  answers: number[];
} {
  assertValidQuizSessionForSave(snapshot);
  const session = snapshot as QuizSession;
  const parsed = parseAnswersForSession(session, answers);
  return {
    score: getScore(session.quiz.questions, parsed),
    questionCount: session.quiz.questions.length,
    answers: parsed,
  };
}

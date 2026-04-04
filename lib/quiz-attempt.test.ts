import { describe, expect, it } from "vitest";
import { parseQuizAttemptPayload } from "./quiz-attempt";
import type { QuizSession } from "./types";
import { getScore } from "./utils";

function minimalSession(): QuizSession {
  return {
    request: {
      input_type: "topic",
      content: "Hello world",
      settings: {
        question_count: 5,
        difficulty: "easy",
        level: "general",
        mode: "study",
        source_behavior: "material_only",
        time_limit_seconds: null,
      },
    },
    quiz: {
      questions: [
        {
          question: "Q1?",
          choices: ["a", "b", "c", "d"],
          correct_index: 1,
          explanation: "e",
          source_snippet: "s",
        },
        {
          question: "Q2?",
          choices: ["a", "b", "c", "d"],
          correct_index: 2,
          explanation: "e",
          source_snippet: "s",
        },
      ],
    },
    created_at: new Date().toISOString(),
  };
}

describe("parseQuizAttemptPayload", () => {
  it("returns score matching getScore for valid payload", () => {
    const session = minimalSession();
    const answers = [1, 2];
    const parsed = parseQuizAttemptPayload({
      session,
      answers,
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.score).toBe(getScore(session.quiz.questions, answers));
    expect(parsed.questionCount).toBe(2);
  });

  it("throws when idempotency key missing", () => {
    expect(() =>
      parseQuizAttemptPayload({
        session: minimalSession(),
        answers: [0, 0],
        idempotencyKey: "",
      }),
    ).toThrow(/idempotency/i);
  });

  it("throws when answers length mismatches questions", () => {
    expect(() =>
      parseQuizAttemptPayload({
        session: minimalSession(),
        answers: [0],
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow(/answers/i);
  });
});

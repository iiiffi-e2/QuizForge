import { describe, expect, it } from "vitest";
import { gradeQuizSnapshot } from "./assignment-grade";
import type { QuizSession } from "./types";

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

describe("gradeQuizSnapshot", () => {
  it("computes score from snapshot and answers", () => {
    const session = minimalSession();
    const r = gradeQuizSnapshot(session, [1, 2]);
    expect(r.questionCount).toBe(2);
    expect(r.score).toBe(2);
    expect(r.answers).toEqual([1, 2]);
  });

  it("throws when answers length mismatches", () => {
    expect(() => gradeQuizSnapshot(minimalSession(), [0])).toThrow(/answers/i);
  });
});

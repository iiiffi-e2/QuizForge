import { describe, expect, it } from "vitest";
import {
  MAX_SAVED_QUIZ_SESSION_BYTES,
  assertValidQuizSessionForSave,
  byteLengthUtf8,
} from "./saved-quiz";
import type { QuizSession } from "./types";

function minimalValidSession(padContent: string): QuizSession {
  return {
    request: {
      input_type: "topic",
      content: padContent,
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
          question: "Q?",
          choices: ["a", "b", "c", "d"],
          correct_index: 0,
          explanation: "e",
          source_snippet: "s",
        },
      ],
    },
    created_at: new Date().toISOString(),
  };
}

describe("byteLengthUtf8", () => {
  it("counts UTF-8 bytes", () => {
    expect(byteLengthUtf8("a")).toBe(1);
    expect(byteLengthUtf8("é")).toBe(2);
  });
});

describe("assertValidQuizSessionForSave", () => {
  it("throws when serialized session exceeds max bytes", () => {
    let pad = "x";
    for (let i = 0; i < 25; i++) {
      const s = minimalValidSession(pad);
      if (byteLengthUtf8(JSON.stringify(s)) > MAX_SAVED_QUIZ_SESSION_BYTES) {
        expect(() => assertValidQuizSessionForSave(s)).toThrow(/too large/i);
        return;
      }
      pad = pad.repeat(2);
    }
    throw new Error("Failed to construct oversized session in test");
  });
});

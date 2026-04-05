import { describe, expect, it } from "vitest";
import {
  shareQuizMetaDescription,
  shareQuizMetaTitle,
} from "@/lib/quiz-share-meta";
import type { QuizSession } from "@/lib/types";

function minimalSession(
  content: string,
  inputType: QuizSession["request"]["input_type"] = "topic",
): QuizSession {
  return {
    request: {
      input_type: inputType,
      content,
      settings: {
        question_count: 5,
        difficulty: "medium",
        level: "general",
        mode: "test",
        source_behavior: "material_only",
        time_limit_seconds: null,
      },
    },
    quiz: {
      questions: [
        {
          question: "Q1",
          choices: ["a", "b", "c", "d"],
          correct_index: 0,
          explanation: "",
          source_snippet: "",
        },
      ],
    },
    created_at: new Date().toISOString(),
  };
}

describe("shareQuizMetaTitle", () => {
  it("uses topic content when short", () => {
    expect(shareQuizMetaTitle(minimalSession("Photosynthesis"))).toContain(
      "Photosynthesis",
    );
  });

  it("uses generic title for file input", () => {
    expect(shareQuizMetaTitle(minimalSession("anything", "file"))).toBe(
      "Quiz on QuizForge",
    );
  });
});

describe("shareQuizMetaDescription", () => {
  it("includes question count", () => {
    expect(shareQuizMetaDescription(minimalSession("x"))).toMatch(/1 question/);
  });
});

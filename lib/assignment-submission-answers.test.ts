import { describe, expect, it } from "vitest";
import { parseStoredSubmissionAnswers } from "./assignment-submission-answers";

describe("parseStoredSubmissionAnswers", () => {
  it("returns null for null or wrong shape", () => {
    expect(parseStoredSubmissionAnswers(null, 2)).toBeNull();
    expect(parseStoredSubmissionAnswers([], 2)).toBeNull();
    expect(parseStoredSubmissionAnswers([0, 1], 3)).toBeNull();
  });

  it("parses valid arrays", () => {
    expect(parseStoredSubmissionAnswers([-1, 2], 2)).toEqual([-1, 2]);
  });
});

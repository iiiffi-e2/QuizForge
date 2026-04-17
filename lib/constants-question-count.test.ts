import { describe, expect, it } from "vitest";
import {
  GUEST_MAX_QUESTION_COUNT,
  questionCountsForUser,
  QUESTION_COUNTS,
} from "@/lib/constants";

describe("questionCountsForUser", () => {
  it("limits guests to GUEST_MAX_QUESTION_COUNT", () => {
    const guest = questionCountsForUser(false);
    expect(guest).toEqual([5, 10, 15, 20]);
    expect(Math.max(...guest)).toBe(GUEST_MAX_QUESTION_COUNT);
  });

  it("matches full QUESTION_COUNTS when signed in", () => {
    expect(questionCountsForUser(true)).toEqual(QUESTION_COUNTS);
  });
});

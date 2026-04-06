import { describe, expect, it } from "vitest";
import {
  assertDisplayNameForGuest,
  normalizeJoinCode,
  parseAssignmentIdempotencyKey,
} from "./assignment-submission";

describe("normalizeJoinCode", () => {
  it("strips non-alphanumerics and uppercases", () => {
    expect(normalizeJoinCode("  ab-cd-12  ")).toBe("ABCD12");
  });
});

describe("assertDisplayNameForGuest", () => {
  it("throws when empty", () => {
    expect(() => assertDisplayNameForGuest("   ")).toThrow(/name/i);
  });

  it("returns trimmed string", () => {
    expect(assertDisplayNameForGuest("  Ada  ")).toBe("Ada");
  });
});

describe("parseAssignmentIdempotencyKey", () => {
  it("throws when missing", () => {
    expect(() => parseAssignmentIdempotencyKey("")).toThrow();
  });
});

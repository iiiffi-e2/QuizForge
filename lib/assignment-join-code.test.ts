import { describe, expect, it } from "vitest";
import { generateJoinCode } from "./assignment-join-code";

describe("generateJoinCode", () => {
  it("returns 8 uppercase alphanumeric chars from unambiguous set", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });
});

import { describe, expect, it } from "vitest";
import { buildEmbedSnippet, extractShareSidFromUrl } from "@/lib/embed-snippet";

describe("extractShareSidFromUrl", () => {
  it("reads sid from short share URL", () => {
    expect(
      extractShareSidFromUrl("https://example.com/quiz?sid=abc123&x=1"),
    ).toBe("abc123");
  });

  it("returns null when no sid", () => {
    expect(extractShareSidFromUrl("https://example.com/quiz?q=zzz")).toBeNull();
  });
});

describe("buildEmbedSnippet", () => {
  it("includes class, data-sid, and script src", () => {
    const s = buildEmbedSnippet("https://app.example", "sid1");
    expect(s).toContain('class="quizforge-embed"');
    expect(s).toContain('data-sid="sid1"');
    expect(s).toContain("https://app.example/embed/v1.js");
  });
});

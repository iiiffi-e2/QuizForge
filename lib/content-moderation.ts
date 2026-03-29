import OpenAI from "openai";
import type { QuizPayload } from "@/lib/types";

/** User-facing message when input or generated quiz text fails moderation. */
export const CONTENT_POLICY_USER_MESSAGE =
  "We can't create a quiz from this content. Please try different material.";

export class ContentPolicyError extends Error {
  constructor(message: string = CONTENT_POLICY_USER_MESSAGE) {
    super(message);
    this.name = "ContentPolicyError";
  }
}

const MODERATION_CHUNK_CHARS = 24_000;

function chunkText(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const chunks: string[] = [];
  for (let i = 0; i < trimmed.length; i += MODERATION_CHUNK_CHARS) {
    chunks.push(trimmed.slice(i, i + MODERATION_CHUNK_CHARS));
  }
  return chunks;
}

/**
 * Runs OpenAI moderation on the full text (chunked when long). Throws ContentPolicyError if any chunk is flagged.
 */
export async function assertContentAllowed(
  client: OpenAI,
  text: string,
): Promise<void> {
  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  for (const chunk of chunks) {
    const response = await client.moderations.create({
      model: "omni-moderation-latest",
      input: chunk,
    });
    const flagged = response.results.some((r) => r.flagged);
    if (flagged) {
      throw new ContentPolicyError();
    }
  }
}

/** Flatten quiz text for output moderation. */
export function serializeQuizForModeration(quiz: QuizPayload): string {
  const parts: string[] = [];
  for (const q of quiz.questions) {
    parts.push(q.question, ...q.choices, q.explanation, q.source_snippet);
  }
  return parts.join("\n\n");
}

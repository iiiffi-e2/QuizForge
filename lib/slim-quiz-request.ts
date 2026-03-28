import { QuizGenerationRequest } from "@/lib/types";

/** Same cap as quiz-storage draft slimming for very long pasted text. */
const MAX_TEXT_CONTENT_CHARS = 350_000;

/**
 * Strips embedded file/image data URLs and truncates huge text. Safe for URLs, KV, and localStorage.
 */
export function slimQuizRequest(request: QuizGenerationRequest): QuizGenerationRequest {
  if (request.input_type === "file" || request.input_type === "image") {
    try {
      const parsed = JSON.parse(request.content) as {
        fileName?: string;
        mimeType?: string;
        dataUrl?: string;
      };
      return {
        ...request,
        content: JSON.stringify({
          fileName: parsed.fileName ?? "",
          mimeType: parsed.mimeType ?? "",
          dataUrl: "",
        }),
      };
    } catch {
      return { ...request, content: "" };
    }
  }
  if (request.content.length > MAX_TEXT_CONTENT_CHARS) {
    return {
      ...request,
      content: request.content.slice(0, MAX_TEXT_CONTENT_CHARS),
    };
  }
  return request;
}

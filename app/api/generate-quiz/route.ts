import "@/lib/pdf-dom-polyfill";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import mammoth from "mammoth";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import { QuizGenerationRequest, QuizPayload, QuizQuestion } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

const MAX_NORMALIZED_LENGTH = 12000;
const MAX_CONTENT_LENGTH_FOR_MODEL = 6000;

let pdfWorkerConfigured = false;

function ensurePdfWorker(): void {
  if (pdfWorkerConfigured) return;
  pdfWorkerConfigured = true;
  const requireFromProject = createRequire(join(process.cwd(), "package.json"));
  const pdfjsDistDir = dirname(requireFromProject.resolve("pdfjs-dist/package.json"));
  const pdfWorkerPath = join(pdfjsDistDir, "legacy", "build", "pdf.worker.mjs");
  PDFParse.setWorker(pathToFileURL(pdfWorkerPath).href);
}

const QUIZ_SCHEMA = {
  name: "quiz_payload",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "question",
            "choices",
            "correct_index",
            "explanation",
            "source_snippet",
          ],
          properties: {
            question: { type: "string" },
            choices: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
            },
            correct_index: {
              type: "integer",
              minimum: 0,
              maximum: 3,
            },
            explanation: { type: "string" },
            source_snippet: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<QuizGenerationRequest>;
    const validationError = validateRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const typed = body as QuizGenerationRequest;
    const extracted = await extractContent(typed.input_type, typed.content);
    if (!extracted.trim()) {
      return NextResponse.json(
        { error: "Could not extract enough content from the provided source." },
        { status: 400 },
      );
    }

    const normalized = normalizeExtractedContent(extracted);
    const modelReadyMaterial = await summarizeIfNeeded(normalized);
    const quiz = await generateQuizWithRetry(modelReadyMaterial, typed);

    return NextResponse.json(quiz);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateRequest(body: Partial<QuizGenerationRequest>): string | null {
  if (!body || typeof body !== "object") return "Invalid request payload.";
  if (!body.input_type) return "input_type is required.";
  if (!body.content || typeof body.content !== "string") return "content is required.";
  if (!body.settings) return "settings are required.";

  const validTypes = new Set(["topic", "text", "file", "image", "url"]);
  if (!validTypes.has(body.input_type)) {
    return "Unsupported input_type.";
  }

  const validQuestionCounts = new Set([5, 10, 15, 20]);
  if (!validQuestionCounts.has(body.settings.question_count as number)) {
    return "question_count must be one of 5, 10, 15, 20.";
  }

  const validDifficulty = new Set(["easy", "medium", "hard"]);
  if (!validDifficulty.has(body.settings.difficulty as string)) {
    return "Invalid difficulty.";
  }

  const validLevels = new Set([
    "elementary",
    "middle",
    "high_school",
    "college",
    "general",
  ]);
  if (!validLevels.has(body.settings.level as string)) {
    return "Invalid level.";
  }

  const validModes = new Set(["study", "test"]);
  if (!validModes.has(body.settings.mode as string)) {
    return "Invalid mode.";
  }

  const validSourceBehavior = new Set(["material_only", "material_plus_general"]);
  if (!validSourceBehavior.has(body.settings.source_behavior as string)) {
    return "Invalid source_behavior.";
  }

  return null;
}

async function extractContent(
  inputType: QuizGenerationRequest["input_type"],
  content: string,
): Promise<string> {
  switch (inputType) {
    case "topic":
      return normalizeText(content);
    case "text":
      return normalizeText(content);
    case "url":
      return extractFromUrl(content);
    case "file":
      return extractFromFilePayload(content);
    case "image":
      return extractFromImagePayload(content);
    default:
      return "";
  }
}

async function extractFromUrl(urlValue: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error("Invalid URL provided.");
  }

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "QuizForgeBot/1.0",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to fetch URL content.");
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $("script, style, noscript").remove();
  const title = $("title").text();
  const headingText = $("h1,h2").map((_idx, el) => $(el).text()).get().join(" ");
  const bodyText = $("body").text();

  return normalizeText(`${title} ${headingText} ${bodyText}`);
}

type UploadedPayload = {
  fileName: string;
  mimeType: string;
  dataUrl: string;
};

function parseUploadedPayload(value: string): UploadedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Invalid uploaded payload.");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("fileName" in parsed) ||
    !("mimeType" in parsed) ||
    !("dataUrl" in parsed)
  ) {
    throw new Error("Malformed uploaded payload.");
  }

  const typed = parsed as UploadedPayload;
  if (!typed.dataUrl.startsWith("data:")) {
    throw new Error("Invalid file encoding.");
  }

  return typed;
}

async function extractFromFilePayload(content: string): Promise<string> {
  const payload = parseUploadedPayload(content);
  const buffer = dataUrlToBuffer(payload.dataUrl);
  const lowerName = payload.fileName.toLowerCase();
  const mimeType = payload.mimeType.toLowerCase();

  if (lowerName.endsWith(".txt") || mimeType.includes("text/plain")) {
    return normalizeText(buffer.toString("utf8"));
  }

  if (
    lowerName.endsWith(".docx") ||
    mimeType.includes(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value);
  }

  if (lowerName.endsWith(".pdf") || mimeType.includes("application/pdf")) {
    ensurePdfWorker();
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return normalizeText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
}

async function extractFromImagePayload(content: string): Promise<string> {
  const payload = parseUploadedPayload(content);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You extract clear, faithful text from images. Return only plain extracted text.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all readable text from this image for educational quiz generation.",
          },
          {
            type: "image_url",
            image_url: {
              url: payload.dataUrl,
            },
          },
        ],
      },
    ],
  });

  const extracted = response.choices[0]?.message?.content ?? "";
  return normalizeText(extracted);
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    throw new Error("Invalid data URL.");
  }
  return Buffer.from(parts[1], "base64");
}

function normalizeExtractedContent(content: string): string {
  const trimmed = normalizeText(content).slice(0, MAX_NORMALIZED_LENGTH);
  return trimmed;
}

async function summarizeIfNeeded(normalized: string): Promise<string> {
  if (normalized.length <= MAX_CONTENT_LENGTH_FOR_MODEL) {
    return normalized;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return normalized.slice(0, MAX_CONTENT_LENGTH_FOR_MODEL);
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
    input: `Summarize this material for quiz generation while preserving key facts, definitions, and causal relationships.\n\n${normalized}`,
    text: { verbosity: "low" },
    max_output_tokens: 1000,
  });

  return normalizeText(response.output_text).slice(0, MAX_CONTENT_LENGTH_FOR_MODEL);
}

async function generateQuizWithRetry(
  sourceMaterial: string,
  request: QuizGenerationRequest,
): Promise<QuizPayload> {
  const maxAttempts = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateQuiz(sourceMaterial, request);
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error("Failed to generate quiz.");
    }
  }

  throw new Error(lastError?.message ?? "Failed to generate quiz.");
}

async function generateQuiz(
  sourceMaterial: string,
  request: QuizGenerationRequest,
): Promise<QuizPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({ apiKey });

  const instructions = [
    "You create high-quality educational multiple-choice quizzes.",
    "Follow all rules exactly.",
    "Return JSON only matching the required schema.",
    "Rules:",
    "- Generate exactly the requested question_count items.",
    "- Each question has exactly 4 choices.",
    "- Exactly one correct choice.",
    "- Questions must be unambiguous.",
    "- Match requested difficulty and level.",
    "- Explanations should be concise and clear.",
    `- source_behavior is "${request.settings.source_behavior}".`,
    request.settings.source_behavior === "material_only"
      ? "- Use ONLY the provided material for facts."
      : "- You may expand with general knowledge when useful.",
  ].join("\n");

  const prompt = [
    `input_type: ${request.input_type}`,
    `question_count: ${request.settings.question_count}`,
    `difficulty: ${request.settings.difficulty}`,
    `level: ${request.settings.level}`,
    `mode: ${request.settings.mode}`,
    `source_behavior: ${request.settings.source_behavior}`,
    "",
    "Material:",
    sourceMaterial,
  ].join("\n");

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
    temperature: 0.2,
    messages: [
      { role: "system", content: instructions },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: QUIZ_SCHEMA,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Model returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Model output was not valid JSON.");
  }

  const validated = validateQuizPayload(parsed, request.settings.question_count);
  return validated;
}

function validateQuizPayload(
  payload: unknown,
  expectedQuestionCount: number,
): QuizPayload {
  if (typeof payload !== "object" || payload === null || !("questions" in payload)) {
    throw new Error("Invalid quiz payload.");
  }

  const questions = (payload as { questions: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw new Error("Quiz payload missing questions.");
  }

  if (questions.length !== expectedQuestionCount) {
    throw new Error("Generated question count does not match requested count.");
  }

  const normalizedQuestions = questions.map((item) => normalizeQuestion(item));
  return { questions: normalizedQuestions };
}

function normalizeQuestion(item: unknown): QuizQuestion {
  if (typeof item !== "object" || item === null) {
    throw new Error("Invalid question format.");
  }

  const typed = item as Record<string, unknown>;
  const question = normalizeText(String(typed.question ?? ""));
  const explanation = normalizeText(String(typed.explanation ?? ""));
  const sourceSnippet = normalizeText(String(typed.source_snippet ?? ""));
  const correctIndex = Number(typed.correct_index);
  const choicesRaw = typed.choices;

  if (!Array.isArray(choicesRaw) || choicesRaw.length !== 4) {
    throw new Error("Each question must contain exactly 4 choices.");
  }

  const choices = choicesRaw.map((choice) => normalizeText(String(choice)));
  if (!question || !explanation) {
    throw new Error("Question text and explanation are required.");
  }
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error("correct_index must be an integer from 0 to 3.");
  }

  return {
    question,
    choices: [choices[0], choices[1], choices[2], choices[3]],
    correct_index: correctIndex,
    explanation,
    source_snippet: sourceSnippet || "No source snippet available.",
  };
}

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import mammoth from "mammoth";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { installPdfPolyfills } from "@/lib/pdf-dom-polyfill";
import { NextResponse } from "next/server";
import {
  assertContentAllowed,
  ContentPolicyError,
  serializeQuizForModeration,
} from "@/lib/content-moderation";
import {
  hasImageUploadData,
  parseImageUploadContent,
} from "@/lib/image-upload-payload";
import { auth } from "@/lib/auth";
import { GUEST_MAX_QUESTION_COUNT } from "@/lib/constants";
import {
  QUESTION_COUNT_VALUES,
  QuizGenerationRequest,
  QuizPayload,
  QuizQuestion,
} from "@/lib/types";
import { normalizeText } from "@/lib/utils";

const MAX_NORMALIZED_LENGTH = 12000;
const MAX_CONTENT_LENGTH_FOR_MODEL = 6000;

let pdfWorkerConfigured = false;

type PDFParseCtor = (typeof import("pdf-parse"))["PDFParse"];

function ensurePdfWorker(PDFParse: PDFParseCtor): void {
  if (pdfWorkerConfigured) return;
  pdfWorkerConfigured = true;
  const requireFromProject = createRequire(join(process.cwd(), "package.json"));
  const pdfjsDistDir = dirname(requireFromProject.resolve("pdfjs-dist/package.json"));
  const pdfWorkerPath = join(pdfjsDistDir, "legacy", "build", "pdf.worker.mjs");
  PDFParse.setWorker(pathToFileURL(pdfWorkerPath).href);
}

let pdfParseModule: typeof import("pdf-parse") | null = null;

async function getPDFParse(): Promise<PDFParseCtor> {
  installPdfPolyfills();
  if (!pdfParseModule) {
    pdfParseModule = await import("pdf-parse");
  }
  return pdfParseModule.PDFParse;
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

const IMAGE_EXTRACTION_SCHEMA = {
  name: "image_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "main_subject",
      "visual_description",
      "readable_text",
      "notable_details",
    ],
    properties: {
      main_subject: { type: "string" },
      visual_description: { type: "string" },
      readable_text: { type: "string" },
      notable_details: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<QuizGenerationRequest>;
    const session = await auth();
    const isLoggedIn = Boolean(session?.user?.id);
    const validationError = validateRequest(body, isLoggedIn);
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is missing." }, { status: 500 });
    }
    const moderationClient = new OpenAI({ apiKey });
    await assertContentAllowed(moderationClient, modelReadyMaterial);

    const quiz = await generateQuizWithRetry(modelReadyMaterial, typed);

    return NextResponse.json(quiz);
  } catch (caughtError) {
    if (caughtError instanceof ContentPolicyError) {
      return NextResponse.json({ error: caughtError.message }, { status: 400 });
    }
    const message =
      caughtError instanceof Error ? caughtError.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function validateRequest(
  body: Partial<QuizGenerationRequest>,
  isLoggedIn: boolean,
): string | null {
  if (!body || typeof body !== "object") return "Invalid request payload.";
  if (!body.input_type) return "input_type is required.";
  if (!body.content || typeof body.content !== "string") return "content is required.";
  if (!body.settings) return "settings are required.";

  const validTypes = new Set(["topic", "text", "file", "image", "url"]);
  if (!validTypes.has(body.input_type)) {
    return "Unsupported input_type.";
  }

  const count = body.settings.question_count as number;
  const validQuestionCounts = new Set<number>(QUESTION_COUNT_VALUES);
  if (!validQuestionCounts.has(count)) {
    return `question_count must be one of ${QUESTION_COUNT_VALUES.join(", ")}.`;
  }
  if (!isLoggedIn && count > GUEST_MAX_QUESTION_COUNT) {
    return `Sign in to generate quizzes with more than ${GUEST_MAX_QUESTION_COUNT} questions.`;
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
    const PDFParse = await getPDFParse();
    ensurePdfWorker(PDFParse);
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
  const images = parseImageUploadContent(content);
  if (!hasImageUploadData(images)) {
    throw new Error("No image data in upload payload.");
  }

  const blocks: string[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const item = images[index];
    if (!item.dataUrl.startsWith("data:")) {
      throw new Error("Invalid file encoding.");
    }
    const label = item.fileName.trim() || `image ${index + 1}`;
    const extracted = await extractVisionMaterialFromDataUrl(item.dataUrl);
    blocks.push(`--- IMAGE ${index + 1} (${label}) ---\n${extracted}`);
  }

  return normalizeText(blocks.join("\n\n"));
}

async function extractVisionMaterialFromDataUrl(dataUrl: string): Promise<string> {
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
          "You analyze images for educational quiz generation. Identify the main subject and describe what is visibly present. Transcribe readable text faithfully. List concrete, testable details visible in the image. Do not invent text you cannot read or facts not supported by the image.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Fill the schema: main subject (primary focus), visual description (scene, objects, activities, relationships), readable text (OCR; empty string if none), notable details (short factual bullets inferable from what is visible).",
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: IMAGE_EXTRACTION_SCHEMA,
    },
  });

  const raw = response.choices[0]?.message?.content ?? "";
  if (!raw.trim()) {
    throw new Error("Model returned an empty image analysis.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Image analysis was not valid JSON.");
  }

  return formatImageExtractionMaterial(parsed);
}

function formatImageExtractionMaterial(payload: unknown): string {
  const data = validateImageExtractionPayload(payload);
  const lines: string[] = [];
  if (data.main_subject) {
    lines.push(`MAIN SUBJECT: ${data.main_subject}`);
  }
  if (data.visual_description) {
    lines.push(`VISUAL DESCRIPTION: ${data.visual_description}`);
  }
  if (data.readable_text.trim()) {
    lines.push(`READABLE TEXT: ${data.readable_text}`);
  }
  if (data.notable_details.length > 0) {
    lines.push(
      "NOTABLE DETAILS:",
      ...data.notable_details.map((d) => `- ${d}`),
    );
  }
  return lines.join("\n");
}

function validateImageExtractionPayload(payload: unknown): {
  main_subject: string;
  visual_description: string;
  readable_text: string;
  notable_details: string[];
} {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid image extraction payload.");
  }
  const o = payload as Record<string, unknown>;
  const main_subject = normalizeText(String(o.main_subject ?? ""));
  const visual_description = normalizeText(String(o.visual_description ?? ""));
  const readable_text = normalizeText(String(o.readable_text ?? ""));
  const rawDetails = o.notable_details;
  const notable_details = Array.isArray(rawDetails)
    ? rawDetails.map((d) => normalizeText(String(d))).filter(Boolean)
    : [];
  if (!main_subject && !visual_description && !readable_text && notable_details.length === 0) {
    throw new Error("Image analysis contained no usable content.");
  }
  return { main_subject, visual_description, readable_text, notable_details };
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
      if (error instanceof ContentPolicyError) {
        throw error;
      }
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

  const instructionLines = [
    "You create high-quality educational multiple-choice quizzes.",
    "Content must be educational, respectful, and appropriate for a general audience: no harassment, slurs, hateful stereotypes, or gratuitous graphic or sexual material.",
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
  ];
  if (request.input_type === "image") {
    instructionLines.push(
      "- When the material includes multiple sections labeled \"--- IMAGE N\", treat them as one combined source and distribute questions across images where appropriate.",
    );
    if (request.settings.source_behavior === "material_only") {
      instructionLines.push(
        "- When input_type is image and source_behavior is material_only: use only facts inferable from the provided material (MAIN SUBJECT, VISUAL DESCRIPTION, NOTABLE DETAILS, READABLE TEXT). Do not invent book or document contents you cannot see.",
        "- Prioritize questions about the MAIN SUBJECT and the scene under VISUAL DESCRIPTION and NOTABLE DETAILS.",
        "- When READABLE TEXT is present, include questions grounded in that text alongside visual-content questions; when it is absent or minimal, rely on the visual description.",
      );
    } else {
      instructionLines.push(
        "- When input_type is image and general knowledge is allowed: if READABLE TEXT or MAIN SUBJECT clearly identifies a named work (book, article, course, author/title, artwork, etc.), focus most questions on that work's subject matter, themes, and typical educational facts using general knowledge—not on cover design, colors, typography, or layout unless the image has no identifiable work.",
        "- If the image is a generic scene with no identifiable work, use MAIN SUBJECT, VISUAL DESCRIPTION, and NOTABLE DETAILS as usual.",
        "- If identification is ambiguous, prefer conservative questions grounded in visible text and description rather than guessing.",
      );
    }
  }
  const instructions = instructionLines.join("\n");

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
  await assertContentAllowed(client, serializeQuizForModeration(validated));
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

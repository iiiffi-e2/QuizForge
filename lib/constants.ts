import {
  Difficulty,
  QuizGenerationRequest,
  Level,
  QuizInputType,
  QuizMode,
  QuizSettings,
  SourceBehavior,
} from "@/lib/types";

export const STORAGE_KEYS = {
  REQUEST_DRAFT: "quizforge-request-draft",
  QUIZ_SESSION: "quizforge-session",
  USER_ANSWERS: "quizforge-user-answers",
  QUIZ_IMAGE_PREVIEW: "quizforge-quiz-image-preview",
  THEME: "quizforge-theme",
} as const;

/** Main source tabs (mock: Text, File, Image, URL). Topic vs pasted text lives under Text. */
export type SourceInputTabId = "text" | "file" | "image" | "url";

export const SOURCE_INPUT_TABS: Array<{ id: SourceInputTabId; label: string }> = [
  { id: "text", label: "Text" },
  { id: "file", label: "File" },
  { id: "image", label: "Image" },
  { id: "url", label: "URL" },
];

export function inputTypeToTabId(inputType: QuizInputType): SourceInputTabId {
  return inputType === "topic" || inputType === "text" ? "text" : inputType;
}

export function tabIdToInputType(
  tabId: SourceInputTabId,
  previousInputType: QuizInputType,
): QuizInputType {
  if (tabId === "text") {
    if (previousInputType === "topic" || previousInputType === "text") {
      return previousInputType;
    }
    return "topic";
  }
  return tabId;
}

export const QUESTION_COUNTS: QuizSettings["question_count"][] = [5, 10, 15, 20];

export const DIFFICULTIES: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export const LEVELS: Array<{ value: Level; label: string }> = [
  { value: "elementary", label: "Elementary" },
  { value: "middle", label: "Middle" },
  { value: "high_school", label: "High School" },
  { value: "college", label: "College" },
  { value: "general", label: "General" },
];

export const MODES: Array<{
  value: QuizMode;
  label: string;
  description: string;
}> = [
  {
    value: "study",
    label: "Study Mode",
    description: "See hints and explanations as you go. Ideal for learning.",
  },
  {
    value: "test",
    label: "Test Mode",
    description: "Timed, exam-style. Answer first, then reveal results.",
  },
];

export const SOURCE_BEHAVIORS: Array<{
  value: SourceBehavior;
  label: string;
  description: string;
}> = [
  {
    value: "material_only",
    label: "Strict Material Only",
    description:
      "Generate questions strictly based on the provided material without drawing on outside knowledge.",
  },
  {
    value: "material_plus_general",
    label: "Material + General Knowledge",
    description:
      "Use material and broader context. For images, if a title or work is visible, quizzes may draw on general knowledge about that work.",
  },
];

export const TIME_LIMITS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "No Limit" },
  { value: 30, label: "30 sec" },
  { value: 60, label: "1 min" },
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
];

export const DEFAULT_SETTINGS: QuizSettings = {
  question_count: 10,
  difficulty: "medium",
  level: "high_school",
  mode: "test",
  source_behavior: "material_plus_general",
  time_limit_seconds: null,
};

export const DEFAULT_REQUEST: QuizGenerationRequest = {
  input_type: "topic",
  content: "",
  settings: { ...DEFAULT_SETTINGS },
};


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
  THEME: "quizforge-theme",
} as const;

export const INPUT_TABS: Array<{ value: QuizInputType; label: string }> = [
  { value: "topic", label: "Topic" },
  { value: "text", label: "Text" },
  { value: "file", label: "File" },
  { value: "image", label: "Image" },
  { value: "url", label: "URL" },
];

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

export const MODES: Array<{ value: QuizMode; label: string }> = [
  { value: "study", label: "Study" },
  { value: "test", label: "Test" },
];

export const SOURCE_BEHAVIORS: Array<{
  value: SourceBehavior;
  label: string;
  description: string;
}> = [
  {
    value: "material_only",
    label: "material_only",
    description: "Use only provided material.",
  },
  {
    value: "material_plus_general",
    label: "material_plus_general",
    description: "Use material and broader context.",
  },
];

export const TIME_LIMITS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "None" },
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


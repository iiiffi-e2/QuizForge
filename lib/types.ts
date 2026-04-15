export type QuizInputType = "topic" | "text" | "file" | "image" | "url";

export type Difficulty = "easy" | "medium" | "hard";

export type Level =
  | "elementary"
  | "middle"
  | "high_school"
  | "college"
  | "general";

export type QuizMode = "study" | "test";

export type SourceBehavior = "material_only" | "material_plus_general";

export const QUESTION_COUNT_VALUES = [
  5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export type QuestionCount = (typeof QUESTION_COUNT_VALUES)[number];

export interface QuizSettings {
  question_count: QuestionCount;
  difficulty: Difficulty;
  level: Level;
  mode: QuizMode;
  source_behavior: SourceBehavior;
  time_limit_seconds: number | null;
}

export interface QuizQuestion {
  question: string;
  choices: [string, string, string, string];
  correct_index: number;
  explanation: string;
  source_snippet: string;
}

export interface QuizPayload {
  questions: QuizQuestion[];
}

export interface QuizGenerationRequest {
  input_type: QuizInputType;
  content: string;
  settings: QuizSettings;
}

export interface QuizSession {
  request: QuizGenerationRequest;
  quiz: QuizPayload;
  created_at: string;
}

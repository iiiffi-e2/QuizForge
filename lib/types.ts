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

export interface QuizSettings {
  question_count: 5 | 10 | 15 | 20;
  difficulty: Difficulty;
  level: Level;
  mode: QuizMode;
  source_behavior: SourceBehavior;
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

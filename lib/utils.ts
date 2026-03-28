import { QuizQuestion } from "@/lib/types";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function getScore(questions: QuizQuestion[], answers: number[]): number {
  return questions.reduce((total, question, index) => {
    return total + (answers[index] === question.correct_index ? 1 : 0);
  }, 0);
}

export function normalizeText(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}


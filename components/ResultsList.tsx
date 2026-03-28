import { QuizQuestion } from "@/lib/types";

interface ResultsListProps {
  questions: QuizQuestion[];
  answers: number[];
}

export function ResultsList({ questions, answers }: ResultsListProps) {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const userAnswerIndex = answers[index];
        const isCorrect = userAnswerIndex === question.correct_index;
        const userAnswer =
          userAnswerIndex >= 0 ? question.choices[userAnswerIndex] : "No answer selected";
        const correctAnswer = question.choices[question.correct_index];

        return (
          <article
            key={`${index}-${question.question.slice(0, 20)}`}
            className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-[var(--quiz-text-primary)] sm:text-base">
              {index + 1}. {question.question}
            </p>

            <div className="mt-3 space-y-1 text-sm">
              <p
                className={
                  isCorrect ? "text-[var(--quiz-success)]" : "text-[var(--quiz-error)]"
                }
              >
                <span className="font-semibold">Your answer:</span> {userAnswer}
              </p>
              <p className="text-[var(--quiz-text-primary)]">
                <span className="font-semibold">Correct answer:</span> {correctAnswer}
              </p>
            </div>

            <div className="mt-3">
              <p className="text-sm font-semibold text-[var(--quiz-text-primary)]">
                Explanation
              </p>
              <p className="mt-1 text-sm text-[var(--quiz-text-secondary)]">
                {question.explanation}
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--quiz-muted)]">
                Based on
              </p>
              <p className="mt-1 text-xs text-[var(--quiz-text-secondary)]">
                {question.source_snippet}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

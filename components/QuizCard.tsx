import { AnswerOption } from "@/components/AnswerOption";
import { QuizQuestion } from "@/lib/types";

interface QuizCardProps {
  question: QuizQuestion;
  questionIndex: number;
  selectedAnswer: number;
  mode: "study" | "test";
  onSelectAnswer: (choiceIndex: number) => void;
}

export function QuizCard({
  question,
  questionIndex,
  selectedAnswer,
  mode,
  onSelectAnswer,
}: QuizCardProps) {
  const answered = selectedAnswer >= 0;

  return (
    <div className="rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-5 shadow-sm sm:p-7">
      <p className="text-lg font-semibold leading-snug text-[var(--quiz-text-primary)] sm:text-2xl">
        {question.question}
      </p>

      <div className="mt-6 space-y-3">
        {question.choices.map((choice, choiceIndex) => {
          const showCorrectness = mode === "study" && answered;
          const isSelected = selectedAnswer === choiceIndex;
          const isCorrect = showCorrectness && choiceIndex === question.correct_index;
          const isIncorrect =
            showCorrectness && isSelected && choiceIndex !== question.correct_index;

          return (
            <AnswerOption
              key={`${questionIndex}-${choiceIndex}`}
              index={choiceIndex}
              text={choice}
              isSelected={isSelected}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              disabled={mode === "study" && answered}
              onClick={() => onSelectAnswer(choiceIndex)}
            />
          );
        })}
      </div>

      {mode === "study" && answered ? (
        <div className="mt-5 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] p-4">
          <p className="text-sm font-semibold text-[var(--quiz-text-primary)]">
            Explanation
          </p>
          <p className="mt-1 text-sm text-[var(--quiz-text-secondary)]">
            {question.explanation}
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--quiz-muted)]">
            Based on
          </p>
          <p className="mt-1 text-xs text-[var(--quiz-text-secondary)]">
            {question.source_snippet}
          </p>
        </div>
      ) : null}
    </div>
  );
}

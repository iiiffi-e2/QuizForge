import { cn } from "@/lib/utils";

interface AnswerOptionProps {
  text: string;
  index: number;
  isSelected: boolean;
  isCorrect: boolean;
  isIncorrect: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function AnswerOption({
  text,
  index,
  isSelected,
  isCorrect,
  isIncorrect,
  disabled = false,
  onClick,
}: AnswerOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors sm:text-base",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quiz-primary)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-90",
        isCorrect &&
          "border-[var(--quiz-success)] bg-green-50 text-[var(--quiz-success)]",
        isIncorrect && "border-[var(--quiz-error)] bg-red-50 text-[var(--quiz-error)]",
        !isCorrect &&
          !isIncorrect &&
          isSelected &&
          "border-[var(--quiz-primary)] bg-[var(--quiz-primary)] text-white",
        !isCorrect &&
          !isIncorrect &&
          !isSelected &&
          "border-[var(--quiz-border)] bg-[var(--quiz-card)] text-[var(--quiz-text-primary)] hover:opacity-80",
      )}
    >
      <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs font-semibold">
        {String.fromCharCode(65 + index)}
      </span>
      {text}
    </button>
  );
}

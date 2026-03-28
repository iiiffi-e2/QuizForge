interface LoadingStateProps {
  primaryText: string;
  secondaryText: string;
}

export function LoadingState({ primaryText, secondaryText }: LoadingStateProps) {
  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-8 text-center shadow-sm">
      <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-4 border-[var(--quiz-border)] border-t-[var(--quiz-primary)]" />
      <p className="text-base font-semibold text-[var(--quiz-text-primary)]">
        {primaryText}
      </p>
      <p className="mt-2 text-sm text-[var(--quiz-text-secondary)]">{secondaryText}</p>
    </div>
  );
}

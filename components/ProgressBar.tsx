interface ProgressBarProps {
  value: number;
}

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--quiz-border)]">
      <div
        className="h-full rounded-full bg-[var(--quiz-primary)] transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

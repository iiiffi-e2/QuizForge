export function Navbar() {
  return (
    <header className="w-full border-b border-[var(--quiz-border)] bg-[var(--quiz-card)]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="text-lg font-semibold text-[var(--quiz-text-primary)]">
          QuizForge
        </div>
        <div className="text-sm text-[var(--quiz-muted)]">MVP</div>
      </div>
    </header>
  );
}

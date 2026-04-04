import {
  DIFFICULTIES,
  LEVELS,
  MODES,
  QUESTION_COUNTS,
  SOURCE_BEHAVIORS,
  TIME_LIMITS,
} from "@/lib/constants";
import { QuizSettings, QuizMode } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  settings: QuizSettings;
  onChange: (next: QuizSettings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const update = <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <section className="mt-8 border-t border-[var(--quiz-border)] pt-8">
      <h2 className="text-lg font-bold text-[var(--quiz-text-primary)] sm:text-2xl">
        Quiz Settings
      </h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">
            Question Count
          </span>
          <select
            value={settings.question_count}
            onChange={(event) =>
              update(
                "question_count",
                Number(event.target.value) as QuizSettings["question_count"],
              )
            }
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)]"
          >
            {QUESTION_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count} Questions
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">
            Difficulty Level
          </span>
          <select
            value={settings.difficulty}
            onChange={(event) =>
              update("difficulty", event.target.value as QuizSettings["difficulty"])
            }
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)]"
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">
            Target Audience
          </span>
          <select
            value={settings.level}
            onChange={(event) => update("level", event.target.value as QuizSettings["level"])}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)]"
          >
            {LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">Time Limit</span>
          <select
            value={settings.time_limit_seconds ?? ""}
            onChange={(event) => {
              const val = event.target.value;
              update("time_limit_seconds", val === "" ? null : Number(val));
            }}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)]"
          >
            {TIME_LIMITS.map((tl) => (
              <option key={tl.label} value={tl.value ?? ""}>
                {tl.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-[var(--quiz-text-primary)] sm:text-lg">
          Quiz Mode
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => {
            const selected = settings.mode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => update("mode", mode.value as QuizMode)}
                className={cn(
                  "flex flex-col rounded-2xl border p-4 text-left transition-colors",
                  selected
                    ? "border-[var(--quiz-primary)] bg-[var(--quiz-ring)] ring-1 ring-[var(--quiz-primary)]"
                    : "border-[var(--quiz-border)] bg-[var(--quiz-background)] hover:border-[var(--quiz-muted)]",
                )}
              >
                <span className="text-sm font-semibold text-[var(--quiz-text-primary)]">
                  {mode.label}
                </span>
                <span className="mt-1.5 text-xs leading-relaxed text-[var(--quiz-text-secondary)] sm:text-sm">
                  {mode.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold text-[var(--quiz-text-primary)] sm:text-lg">
          Source Behavior
        </h3>
        <p className="mt-1 text-xs text-[var(--quiz-text-secondary)] sm:text-sm">
          How strictly the generator should stick to your material.
        </p>
        <div className="mt-4 space-y-3">
          {SOURCE_BEHAVIORS.map((behavior) => (
            <label
              key={behavior.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                settings.source_behavior === behavior.value
                  ? "border-[var(--quiz-primary)] bg-[var(--quiz-ring)] ring-1 ring-[var(--quiz-primary)]"
                  : "border-[var(--quiz-border)] bg-[var(--quiz-background)] hover:border-[var(--quiz-muted)]",
              )}
            >
              <input
                type="radio"
                name="source_behavior"
                value={behavior.value}
                checked={settings.source_behavior === behavior.value}
                onChange={() => update("source_behavior", behavior.value)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--quiz-primary)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--quiz-text-primary)]">
                  {behavior.label}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--quiz-text-secondary)] sm:text-sm">
                  {behavior.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    <section className="mt-7">
      <h2 className="text-lg font-semibold text-[var(--quiz-text-primary)] sm:text-xl">
        Quiz Settings
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none"
          >
            {QUESTION_COUNTS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">Difficulty</span>
          <select
            value={settings.difficulty}
            onChange={(event) =>
              update("difficulty", event.target.value as QuizSettings["difficulty"])
            }
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none"
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">Level</span>
          <select
            value={settings.level}
            onChange={(event) => update("level", event.target.value as QuizSettings["level"])}
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none"
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
            className="rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2.5 text-[var(--quiz-text-primary)] focus:border-[var(--quiz-primary)] focus:outline-none"
          >
            {TIME_LIMITS.map((tl) => (
              <option key={tl.label} value={tl.value ?? ""}>
                {tl.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-[var(--quiz-text-secondary)]">Mode</span>
          <div className="inline-flex w-fit rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] p-1">
            {MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => update("mode", mode.value as QuizMode)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  settings.mode === mode.value
                    ? "bg-[var(--quiz-primary)] text-white"
                    : "text-[var(--quiz-text-secondary)] hover:opacity-80",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-[var(--quiz-text-secondary)]">
          Source Behavior
        </p>
        <div className="mt-2 space-y-2">
          {SOURCE_BEHAVIORS.map((behavior) => (
            <label
              key={behavior.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-3 py-2.5"
            >
              <input
                type="radio"
                name="source_behavior"
                value={behavior.value}
                checked={settings.source_behavior === behavior.value}
                onChange={() => update("source_behavior", behavior.value)}
                className="mt-0.5 h-4 w-4 accent-[var(--quiz-primary)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--quiz-text-primary)]">
                  {behavior.label}
                </span>
                <span className="block text-xs text-[var(--quiz-text-secondary)]">
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

"use client";

import {
  SOURCE_INPUT_TABS,
  type SourceInputTabId,
  inputTypeToTabId,
  tabIdToInputType,
} from "@/lib/constants";
import { QuizInputType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

interface InputTabsProps {
  inputType: QuizInputType;
  content: string;
  onTypeChange: (type: QuizInputType) => void;
  onContentChange: (content: string) => void;
  onFileConvert: (
    type: "file" | "image",
    payload: { fileName: string; mimeType: string; dataUrl: string },
  ) => void;
  onInputError: (message: string | null) => void;
}

export function InputTabs({
  inputType,
  content,
  onTypeChange,
  onContentChange,
  onFileConvert,
  onInputError,
}: InputTabsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const sourceTrackRef = useRef<HTMLDivElement>(null);
  const sourceTabRefs = useRef<Partial<Record<SourceInputTabId, HTMLButtonElement | null>>>(
    {},
  );
  const [sourceSlide, setSourceSlide] = useState({ left: 0, width: 0 });

  const textSubTrackRef = useRef<HTMLDivElement>(null);
  const topicBtnRef = useRef<HTMLButtonElement>(null);
  const pasteBtnRef = useRef<HTMLButtonElement>(null);
  const [textSubSlide, setTextSubSlide] = useState({ left: 0, width: 0 });

  const contentData = safeParseContent(content);

  const currentFileName =
    (inputType === "file" || inputType === "image") && contentData?.fileName
      ? contentData.fileName
      : "";

  const imagePreviewUrl =
    inputType === "image" && contentData?.dataUrl?.trim()
      ? contentData.dataUrl
      : null;

  const activeTabId = inputTypeToTabId(inputType);

  const measureSourceSlide = useCallback(() => {
    const track = sourceTrackRef.current;
    const btn = sourceTabRefs.current[activeTabId];
    if (!track || !btn) return;
    const t = track.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setSourceSlide({ left: b.left - t.left, width: b.width });
  }, [activeTabId]);

  const measureTextSubSlide = useCallback(() => {
    const track = textSubTrackRef.current;
    const btn = inputType === "topic" ? topicBtnRef.current : pasteBtnRef.current;
    if (!track || !btn) return;
    const t = track.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setTextSubSlide({ left: b.left - t.left, width: b.width });
  }, [inputType]);

  useLayoutEffect(() => {
    measureSourceSlide();
    const id = requestAnimationFrame(() => measureSourceSlide());
    return () => cancelAnimationFrame(id);
  }, [measureSourceSlide]);

  useLayoutEffect(() => {
    if (activeTabId !== "text") return;
    measureTextSubSlide();
    const id = requestAnimationFrame(() => measureTextSubSlide());
    return () => cancelAnimationFrame(id);
  }, [activeTabId, measureTextSubSlide, inputType]);

  useLayoutEffect(() => {
    const track = sourceTrackRef.current;
    if (!track) return;
    const ro = new ResizeObserver(() => measureSourceSlide());
    ro.observe(track);
    window.addEventListener("resize", measureSourceSlide);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureSourceSlide);
    };
  }, [measureSourceSlide]);

  useLayoutEffect(() => {
    const track = textSubTrackRef.current;
    if (!track || activeTabId !== "text") return;
    const ro = new ResizeObserver(() => measureTextSubSlide());
    ro.observe(track);
    window.addEventListener("resize", measureTextSubSlide);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureTextSubSlide);
    };
  }, [measureTextSubSlide, activeTabId]);

  const renderContent = () => {
    if (inputType === "topic") {
      return (
        <div className="group relative">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-[var(--quiz-brand-600)]"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Enter a topic (e.g., Photosynthesis, World War II, Quantum Physics)"
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            className="w-full rounded-2xl border-2 border-[var(--quiz-border)] bg-[var(--quiz-card)] py-4 pl-14 pr-5 text-base text-[var(--quiz-text-primary)] shadow-sm placeholder:text-[var(--quiz-muted)] transition-colors hover:border-[var(--quiz-brand-500)]/40 focus:border-[var(--quiz-brand-600)] focus:outline-none focus:ring-4 focus:ring-[var(--quiz-ring)]"
          />
        </div>
      );
    }

    if (inputType === "text") {
      return (
        <textarea
          rows={8}
          placeholder="Paste your material here..."
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="w-full resize-y rounded-2xl border-2 border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] shadow-sm placeholder:text-[var(--quiz-muted)] transition-colors focus:border-[var(--quiz-brand-600)] focus:outline-none focus:ring-4 focus:ring-[var(--quiz-ring)] sm:text-base"
        />
      );
    }

    if (inputType === "url") {
      return (
        <input
          type="url"
          placeholder="https://example.com/article"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="w-full rounded-2xl border-2 border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] shadow-sm placeholder:text-[var(--quiz-muted)] transition-colors focus:border-[var(--quiz-brand-600)] focus:outline-none focus:ring-4 focus:ring-[var(--quiz-ring)] sm:text-base"
        />
      );
    }

    const isFile = inputType === "file";
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          isFile ? fileInputRef.current?.click() : imageInputRef.current?.click()
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (isFile) fileInputRef.current?.click();
            else imageInputRef.current?.click();
          }
        }}
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--quiz-border)] bg-[var(--quiz-tab-track)] p-6 text-center transition-colors hover:border-[var(--quiz-brand-500)]/50"
      >
        <p className="text-sm font-semibold text-[var(--quiz-text-primary)] sm:text-base">
          Drag & drop or click to upload
        </p>
        <p className="mt-2 text-xs text-[var(--quiz-text-secondary)] sm:text-sm">
          {isFile ? "Supports PDF, DOCX, TXT" : "Supports JPG, PNG"}
        </p>
        {currentFileName ? (
          <p className="mt-3 text-xs font-semibold text-[var(--quiz-brand-600)]">
            Selected: {currentFileName}
          </p>
        ) : null}
      </div>
    );
  };

  const showImagePreview = inputType === "image" && imagePreviewUrl;

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--quiz-muted)]">
        Source
      </p>
      <div
        ref={sourceTrackRef}
        className="relative mt-3 inline-flex w-full flex-wrap gap-0 overflow-hidden rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-tab-track)] p-1.5 sm:w-auto"
        role="tablist"
        aria-label="Source type"
      >
        <div
          className="quiz-source-slider-pill pointer-events-none absolute top-1.5 bottom-1.5 rounded-xl bg-[var(--quiz-card)] shadow-sm ring-1 ring-[var(--quiz-border)]"
          style={{
            left: sourceSlide.width ? sourceSlide.left : 0,
            width: sourceSlide.width || undefined,
            opacity: sourceSlide.width ? 1 : 0,
          }}
        />
        {SOURCE_INPUT_TABS.map((tab) => {
          const selected = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                sourceTabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTypeChange(tabIdToInputType(tab.id, inputType))}
              className={cn(
                "relative z-10 min-w-[4.25rem] flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none",
                selected
                  ? "text-[var(--quiz-brand-600)]"
                  : "text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTabId === "text" ? (
        <div className="mt-4">
          <div
            ref={textSubTrackRef}
            className="relative inline-flex w-full overflow-hidden rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-tab-track)] p-0.5 sm:w-auto"
            role="group"
            aria-label="Topic or pasted text"
          >
            <div
              className="quiz-source-slider-pill pointer-events-none absolute inset-y-0.5 rounded-lg bg-[var(--quiz-brand-600)] shadow-sm"
              style={{
                left: textSubSlide.width ? textSubSlide.left : 0,
                width: textSubSlide.width || undefined,
                opacity: textSubSlide.width ? 1 : 0,
              }}
            />
            <button
              ref={topicBtnRef}
              type="button"
              onClick={() => onTypeChange("topic")}
              className={cn(
                "relative z-10 flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-5 sm:text-sm",
                inputType === "topic"
                  ? "text-white"
                  : "text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]",
              )}
            >
              Topic
            </button>
            <button
              ref={pasteBtnRef}
              type="button"
              onClick={() => onTypeChange("text")}
              className={cn(
                "relative z-10 flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-5 sm:text-sm",
                inputType === "text"
                  ? "text-white"
                  : "text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]",
              )}
            >
              Paste text
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">{renderContent()}</div>

      {showImagePreview ? (
        <div className="mt-4 flex flex-col items-center">
          <img
            src={imagePreviewUrl}
            alt={
              currentFileName
                ? `Preview of ${currentFileName}`
                : "Uploaded image preview"
            }
            className="max-h-64 max-w-full rounded-2xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] object-contain shadow-sm"
          />
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(event) =>
          handleFileChange(
            event.currentTarget.files?.[0],
            "file",
            onFileConvert,
            onInputError,
          )
        }
      />

      <input
        ref={imageInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="hidden"
        onChange={(event) =>
          handleFileChange(
            event.currentTarget.files?.[0],
            "image",
            onFileConvert,
            onInputError,
          )
        }
      />
    </section>
  );
}

function safeParseContent(content: string): {
  fileName?: string;
  dataUrl?: string;
} | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as { fileName?: string; dataUrl?: string };
  } catch {
    return null;
  }
}

async function handleFileChange(
  file: File | undefined,
  type: "file" | "image",
  onFileConvert: InputTabsProps["onFileConvert"],
  onInputError: InputTabsProps["onInputError"],
): Promise<void> {
  if (!file) return;
  onInputError(null);

  try {
    const dataUrl = await fileToDataUrl(file);
    onFileConvert(type, {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      dataUrl,
    });
  } catch {
    onInputError("Unable to read file. Please try a different file.");
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read file."));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

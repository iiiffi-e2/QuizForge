"use client";

import {
  SOURCE_INPUT_TABS,
  inputTypeToTabId,
  tabIdToInputType,
} from "@/lib/constants";
import { QuizInputType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRef } from "react";

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

  const renderContent = () => {
    if (inputType === "topic") {
      return (
        <input
          type="text"
          placeholder="Enter a topic (e.g., Photosynthesis, World War II, Quantum Physics)"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)] sm:text-base"
        />
      );
    }

    if (inputType === "text") {
      return (
        <textarea
          rows={8}
          placeholder="Paste your material here..."
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="w-full resize-y rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)] sm:text-base"
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
          className="w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--quiz-ring)] sm:text-base"
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
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--quiz-border)] bg-[var(--quiz-background)] p-6 text-center transition-colors hover:border-[var(--quiz-muted)]"
      >
        <p className="text-sm font-semibold text-[var(--quiz-text-primary)] sm:text-base">
          Drag & drop or click to upload
        </p>
        <p className="mt-2 text-xs text-[var(--quiz-text-secondary)] sm:text-sm">
          {isFile ? "Supports PDF, DOCX, TXT" : "Supports JPG, PNG"}
        </p>
        {currentFileName ? (
          <p className="mt-3 text-xs font-semibold text-[var(--quiz-primary)]">
            Selected: {currentFileName}
          </p>
        ) : null}
      </div>
    );
  };

  const showImagePreview = inputType === "image" && imagePreviewUrl;

  return (
    <section className="mt-8 border-t border-[var(--quiz-border)] pt-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--quiz-muted)]">
        Source
      </p>
      <div
        className="mt-3 inline-flex flex-wrap gap-1 rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] p-1"
        role="tablist"
        aria-label="Source type"
      >
        {SOURCE_INPUT_TABS.map((tab) => {
          const selected = activeTabId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onTypeChange(tabIdToInputType(tab.id, inputType))}
              className={cn(
                "min-w-[4.5rem] rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                selected
                  ? "bg-[var(--quiz-card)] text-[var(--quiz-text-primary)] shadow-sm ring-1 ring-[var(--quiz-border)]"
                  : "text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTabId === "text" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div
            className="inline-flex gap-1 rounded-lg border border-[var(--quiz-border)] bg-[var(--quiz-background)] p-0.5"
            role="group"
            aria-label="Topic or pasted text"
          >
            <button
              type="button"
              onClick={() => onTypeChange("topic")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                inputType === "topic"
                  ? "bg-[var(--quiz-primary)] text-white"
                  : "text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]",
              )}
            >
              Topic
            </button>
            <button
              type="button"
              onClick={() => onTypeChange("text")}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                inputType === "text"
                  ? "bg-[var(--quiz-primary)] text-white"
                  : "text-[var(--quiz-text-secondary)] hover:text-[var(--quiz-text-primary)]",
              )}
            >
              Paste text
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">{renderContent()}</div>

      {showImagePreview ? (
        <div className="mt-4 flex flex-col items-center">
          <img
            src={imagePreviewUrl}
            alt={
              currentFileName
                ? `Preview of ${currentFileName}`
                : "Uploaded image preview"
            }
            className="max-h-64 max-w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-background)] object-contain shadow-sm"
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

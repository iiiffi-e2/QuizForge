"use client";

import { INPUT_TABS } from "@/lib/constants";
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

  const renderContent = () => {
    if (inputType === "topic") {
      return (
        <input
          type="text"
          placeholder="Enter a topic (e.g., Photosynthesis)"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-primary)] focus:outline-none sm:text-base"
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
          className="w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-primary)] focus:outline-none sm:text-base"
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
          className="w-full rounded-xl border border-[var(--quiz-border)] bg-[var(--quiz-card)] px-4 py-3 text-sm text-[var(--quiz-text-primary)] placeholder:text-[var(--quiz-muted)] focus:border-[var(--quiz-primary)] focus:outline-none sm:text-base"
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
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--quiz-border)] bg-[var(--quiz-background)] p-6 text-center hover:opacity-80"
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

  return (
    <section>
      <div className="flex flex-wrap gap-2">
        {INPUT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTypeChange(tab.value)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              inputType === tab.value
                ? "bg-[var(--quiz-primary)] text-white"
                : "text-[var(--quiz-text-secondary)] hover:opacity-80",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">{renderContent()}</div>

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
} | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as { fileName?: string };
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

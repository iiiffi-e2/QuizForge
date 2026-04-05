import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";
import { shareQuizMetaDescription, shareQuizMetaTitle } from "@/lib/quiz-share-meta";
import { getSharedQuizSessionById } from "@/lib/share-resolve";
import { getSiteUrl } from "@/lib/site-url";
import { QuizPageClient } from "./quiz-page-client";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = await searchParams;
  const raw = sp.sid;
  const sid =
    typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  const site = getSiteUrl();
  const base: Metadata = {
    robots: { index: true, follow: true },
  };

  if (!sid) {
    return {
      ...base,
      title: "Take a quiz",
      description: "Take a quiz on QuizForge.",
    };
  }

  const session = await getSharedQuizSessionById(sid);
  const ogUrl = new URL("/api/og/quiz", site);
  ogUrl.searchParams.set("sid", sid);

  if (!session) {
    return {
      title: "Quiz | QuizForge",
      description: "This shared quiz is missing or expired.",
      robots: { index: false, follow: true },
      openGraph: {
        title: "Quiz | QuizForge",
        description: "This shared quiz is missing or expired.",
        url: new URL(`/quiz?sid=${encodeURIComponent(sid)}`, site).toString(),
        siteName: "QuizForge",
        images: [
          {
            url: ogUrl.toString(),
            width: 1200,
            height: 630,
            alt: "QuizForge",
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Quiz | QuizForge",
        description: "This shared quiz is missing or expired.",
        images: [ogUrl.toString()],
      },
    };
  }

  const title = shareQuizMetaTitle(session);
  const description = shareQuizMetaDescription(session);
  const pageUrl = new URL(`/quiz?sid=${encodeURIComponent(sid)}`, site).toString();

  return {
    title: `${title} | QuizForge`,
    description,
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "QuizForge",
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl.toString()],
    },
  };
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent">
          <Navbar />
          <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
            <LoadingState
              primaryText="Loading quiz..."
              secondaryText="Preparing your questions."
            />
          </main>
        </div>
      }
    >
      <QuizPageClient />
    </Suspense>
  );
}

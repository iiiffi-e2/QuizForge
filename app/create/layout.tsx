import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

const site = getSiteUrl();

export const metadata: Metadata = {
  title: "Create a quiz",
  description:
    "Generate a quiz from a topic, text, file, image, or link — tune difficulty and length.",
  alternates: { canonical: new URL("/create", site).toString() },
  openGraph: {
    title: "Create a quiz | QuizForge",
    description:
      "Generate a quiz from a topic, text, file, image, or link — tune difficulty and length.",
    url: new URL("/create", site).toString(),
  },
  twitter: {
    card: "summary_large_image",
    title: "Create a quiz | QuizForge",
    description:
      "Generate a quiz from a topic, text, file, image, or link — tune difficulty and length.",
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

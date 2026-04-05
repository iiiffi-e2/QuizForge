import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { shareQuizMetaTitle } from "@/lib/quiz-share-meta";
import { getSharedQuizSessionById } from "@/lib/share-resolve";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const SIZE = { width: 1200, height: 630 };

function ogResponse(
  title: string,
  subtitle: string,
  siteLabel: string,
): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #0f172a 0%, #115e59 45%, #1e3a5f 100%)",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "#f8fafc",
              lineHeight: 1.15,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#5eead4",
            }}
          >
            {subtitle}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#e2e8f0",
              letterSpacing: "-0.02em",
            }}
          >
            QuizForge
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#94a3b8",
            }}
          >
            {siteLabel}
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}

export async function GET(request: NextRequest) {
  const siteLabel = getSiteUrl().host;
  const sid = request.nextUrl.searchParams.get("sid");
  if (!sid) {
    return ogResponse("Quiz on QuizForge", "Shared quiz", siteLabel);
  }

  const session = await getSharedQuizSessionById(sid);
  if (!session) {
    return ogResponse("Quiz unavailable", "Link expired or invalid", siteLabel);
  }

  const title = shareQuizMetaTitle(session);
  return ogResponse(title, "Take the quiz", siteLabel);
}

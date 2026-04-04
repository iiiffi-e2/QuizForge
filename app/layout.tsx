import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuizForge",
  description: "Turn anything into a quiz",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("quizforge-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className="relative min-h-screen overflow-x-hidden">
        <div className="quiz-bg-gradient-mesh" aria-hidden />
        <div
          className="quiz-bg-pattern pointer-events-none fixed inset-0"
          aria-hidden
        />
        <div
          className="quiz-bg-orbs pointer-events-none fixed top-[-10%] left-[-10%] h-[40%] min-h-[280px] w-[40%] min-w-[280px] rounded-full bg-[rgb(20_184_166_/0.14)] blur-[100px]"
          aria-hidden
        />
        <div
          className="quiz-bg-orbs pointer-events-none fixed right-[-10%] bottom-[-10%] h-[40%] min-h-[280px] w-[40%] min-w-[280px] rounded-full bg-[rgb(59_130_246_/0.12)] blur-[100px]"
          aria-hidden
        />
        <div className="relative z-10 flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}

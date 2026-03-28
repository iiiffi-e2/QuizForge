This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Short share links (Upstash Redis)

QuizForge can store shared quizzes in [Upstash Redis](https://upstash.com/) so **Copy link** produces a short URL like `https://yoursite.com/quiz?sid=…` instead of a very long `?q=…` string.

### 1. Create an Upstash database

1. Sign in at [Upstash Console](https://console.upstash.com/).
2. **Create database** → pick a name and region (choose one close to your users or to Vercel’s region).
3. Open the database → **REST API** → copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.

### 2. Local development

1. Copy `.env.example` to `.env.local` (if you do not already have one).
2. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the Upstash dashboard.
3. Restart `npm run dev`.

Without these variables, **Copy link** still works using the compressed in-URL format (subject to length limits).

### 3. Deploy on Vercel

1. Push your repo to GitHub/GitLab/Bitbucket and [import the project in Vercel](https://vercel.com/new).
2. Under **Environment Variables**, add:
   - `OPENAI_API_KEY` (required for generation)
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (optional, for short links)
3. Redeploy after saving variables.

**Vercel KV:** You can use [Vercel KV](https://vercel.com/docs/storage/vercel-kv) instead of creating Redis manually; it is Upstash-backed. Add the KV integration to your project and use the REST URL and token Vercel provides so the same `@upstash/redis` client keeps working.

Shared payloads expire after **30 days** (server-side TTL).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

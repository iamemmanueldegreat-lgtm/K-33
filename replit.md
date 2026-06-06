# Kortex AI

An AI-powered educational platform that helps university students study smarter with AI-generated course content, study guides, quizzes, and a personal AI tutor.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/kortex run dev` — run the frontend (port 19009)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + react-router-dom
- Auth + DB: Firebase (Firestore + Auth + Storage)
- AI: Google Gemini (`@google/genai`) via `/api/*` routes on the Express server
- API: Express 5 in `artifacts/api-server/`
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kortex/` — React + Vite frontend (served at `/`)
- `artifacts/api-server/` — Express backend (served at `/api`)
- `artifacts/kortex/src/lib/firebase.ts` — Firebase client initialization
- `artifacts/kortex/firebase-applet-config.json` — Firebase project config
- `artifacts/api-server/src/routes/kortex.ts` — Gemini AI API routes

## Architecture decisions

- Firebase handles auth and all user data (Firestore) — no Postgres schema needed for user state.
- Gemini AI routes live in the shared Express `api-server` artifact.
- Frontend makes API calls to `/api/*` which routes through the shared proxy to the Express server.
- Vercel Analytics/SpeedInsights removed (not supported on Replit); Firebase Analytics still works.

## Product

- AI-generated course creation by department
- AI study guides, key takeaways, and practice quizzes per topic
- Live AI chat tutor (Kortex AI) with streaming responses
- Student analytics (streaks, study hours, quiz scores)
- Admin dashboard for platform management

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Firebase config is in `artifacts/kortex/firebase-applet-config.json` (not an env var).
- `GEMINI_API_KEY` env var must be set for the AI routes to work.
- The app uses `experimentalForceLongPolling` for Firestore (required for this Firebase project).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

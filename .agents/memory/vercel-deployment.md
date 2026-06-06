---
name: Vercel deployment configuration
description: How this project is configured to deploy to Vercel with DeepSeek AI routes
---

## Setup

- `vercel.json` at repo root configures the Vercel build
- Build command: `pnpm --filter @workspace/kortex run build`  
- Output: `artifacts/kortex/dist/public`
- All `/api/*` requests route to `api/index.js` (Vercel serverless function)
- `api/index.js` calls DeepSeek API using native fetch — no extra npm deps needed

**Why:** Vercel needs a single output directory + serverless functions in `api/`. The Express server in `artifacts/api-server/` is only for Replit dev; Vercel uses `api/index.js` instead.

**How to apply:** When adding new AI routes, add them to BOTH `artifacts/api-server/src/routes/kortex.ts` (Replit dev) AND `api/index.js` (Vercel prod).

## Required Vercel env var
- `DEEPSEEK_API_KEY` — must be set in Vercel project dashboard → Settings → Environment Variables

## vite.config.ts note
PORT env var was made optional (fallback: 5173) so `vite build` works on Vercel without PORT set. Replit still provides PORT so dev mode is unaffected.

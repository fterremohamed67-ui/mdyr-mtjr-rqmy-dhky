# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## AI assistant

The authenticated `POST /api/agent/chat` endpoint sends every chat message to OpenRouter. Configure these on the API server (never as `VITE_` variables):

- `OPENROUTER_API_KEY` (loaded from root `.env.local` during `pnpm dev`)
- Optional `OPENROUTER_MODEL` (defaults to `google/gemini-2.0-flash-001`)
- Configure `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` for the endpoint's existing authentication middleware.

The chat request can include up to 12 prior user/assistant messages for conversational context. Ruby detects whether the latest customer message is Arabic, English, or French and responds in that language while preserving catalog names, prices, and download links.

Cloud TTS is optional and falls back to browser speech when unavailable. Configure these only on the API server:

- `TTS_PROVIDER=openai` with `OPENAI_API_KEY`; optional `OPENAI_TTS_MODEL` and `OPENAI_TTS_VOICE` (defaults: `gpt-4o-mini-tts`, `coral`)
- `TTS_PROVIDER=elevenlabs` with `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`; optional `ELEVENLABS_TTS_MODEL`
- `TTS_PROVIDER=azure` with `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`; optional `AZURE_SPEECH_VOICE` (when unset, selects an Arabic, English, or French neural voice based on the text)
- `TTS_PROVIDER=openrouter` with `OPENROUTER_API_KEY` and `OPENROUTER_AUDIO_MODEL`; optional `OPENROUTER_AUDIO_VOICE`
- If `TTS_PROVIDER` is omitted, the server prefers a configured ElevenLabs voice, then Azure Speech, OpenAI, and OpenRouter Audio.

ElevenLabs uses its streaming-optimized endpoint. Short replies use configured cloud TTS; longer replies begin immediately with browser speech and are split at sentence and clause boundaries. Speech preparation removes links, markdown decoration, and emoji while preserving Arabic diacritics already present in the text and normalizing Arabic-Indic digits. Browser speech and speech recognition select Arabic, English, or French according to the reply/conversation language, with the browser language as the initial recognition preference. Keep provider credentials on the API server; if cloud TTS is unavailable, a matching browser voice is used when available.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

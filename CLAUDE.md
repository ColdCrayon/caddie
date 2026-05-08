# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

## Environment Setup

Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` — from Supabase project settings
- `VITE_SUPABASE_ANON_KEY` — from Supabase API settings
- `VITE_GOOGLE_MAPS_KEY` — from Google Cloud Console (enable Maps JS API + Places API)

Supabase Edge Function secret (set via `supabase secrets set`):
- `ANTHROPIC_KEY` — Claude API key from console.anthropic.com

## Architecture

**Stack:** React 19 + Vite + TypeScript, Tailwind CSS (custom Caddie palette), Zustand for client state, TanStack Query for server state, Framer Motion for page transitions, Recharts for charts.

**Auth + data:** Supabase (Postgres + auth + realtime + storage). All Claude API calls go through `supabase/functions/ai-proxy/index.ts` — never expose the Anthropic key client-side.

**Design system:** All color tokens are in `tailwind.config.js` (`fairway`, `rough`, `sand`, `chalk`, `birdie`, `bogey`, `eagle`, `sky`, `ink`). Fonts: Playfair Display (display/headings), DM Mono (numbers/data), Archivo Narrow (UI labels). Use `font-display`, `font-mono`, `font-ui` classes.

**State architecture:**
- `src/stores/roundStore.ts` — active round state, persisted to localStorage via Zustand `persist`. This is the offline-safe source of truth during a round.
- `src/stores/userStore.ts` — auth user profile, also persisted.
- TanStack Query handles all Supabase reads with aggressive caching (`staleTime: 5min`).

**Routing:** All routes in `src/App.tsx`. Protected behind auth guard. Bottom nav shown only on top-level routes. `/round/active` does not show the bottom nav (full-screen experience).

**Key data flows:**
1. Start round → `roundStore.startRound()` → navigate to `/round/active` → swipeable `HoleCard` components update store → on finish, flush to Supabase and clear store
2. AI advice → `src/lib/claude.ts` fetches the Edge Function → streams response chunks into UI
3. Swing analysis → `MediaRecorder` → `canvas.ts` extracts 5 frames → send base64 frames to Edge Function → parse JSON response

**PWA:** Configured via `vite-plugin-pwa`. Service worker uses Workbox with network-first for Supabase/weather calls. Safari on iPhone does not support `beforeinstallprompt` — the install banner in `App.tsx` shows manual instructions instead.

## Database

Schema and RLS policies live in `supabase/migrations/001_initial.sql`. Run this in the Supabase SQL editor to set up a new project. Key tables: `users`, `courses` (community-shared), `rounds`, `holes_played`, `shots`, `swings`, `group_info`/`group_members`/`group_posts`, `course_game_plans`, `digests`.

Realtime is enabled on `rounds`, `holes_played`, and `group_posts`.

## Deployment

Push to GitHub → connect to Vercel → set the three `VITE_*` env vars in Vercel dashboard → deploys automatically on push to `main`. Add the Vercel URL to Supabase Auth allowed redirect URLs.

Edge Functions deploy with `supabase functions deploy ai-proxy` after running `supabase link`.

## Graphify

This project uses **graphify** to build a persistent knowledge graph of the codebase, decisions, and relationships across sessions.

**When to run graphify:**
- After any significant architectural change (new screens, new data flows, new API integrations)
- When discovering non-obvious relationships between components (e.g. "CourseMap must be re-mounted with a stable onPinSet ref")
- When the user types `/graphify` (invoke the Skill tool with `skill: "graphify"`)

**How:** Type `/graphify` in the prompt to invoke the skill. It accepts any input — code snippets, architectural descriptions, lessons learned — and adds nodes/edges to the knowledge graph for future sessions to use as context.

<!-- mulch:start -->
## Project Expertise (Mulch)
<!-- mulch-onboard-v:3 -->

This project uses [Mulch](https://github.com/jayminwest/mulch) for structured expertise management.

**At the start of every session**, run:
```bash
ml prime
```

Injects project-specific conventions, patterns, decisions, failures, references, and guides into
your context. Run `ml prime --files src/foo.ts` before editing a file to load only records
relevant to that path (per-file framing, classification age, and confirmation scores included).

For monolith projects where dumping every record wastes context, set
`prime.default_mode: manifest` in `.mulch/mulch.config.yaml` (or pass `--manifest`) to emit a
quick reference + domain index. Agents then scope-load with `ml prime <domain>` or
`ml prime --files <path>`.

**Before completing your task**, record insights worth preserving — conventions discovered,
patterns applied, failures encountered, or decisions made:
```bash
ml record <domain> --type <convention|pattern|failure|decision|reference|guide> --description "..."
```

Evidence auto-populates from git (current commit + changed files). Link explicitly with
`--evidence-seeds <id>` / `--evidence-gh <id>` / `--evidence-linear <id>` / `--evidence-bead <id>`,
`--evidence-commit <sha>`, or `--relates-to <mx-id>`. Upserts of named records merge outcomes
instead of replacing them; validation failures print a copy-paste retry hint with missing fields
pre-filled.

Run `ml status` for domain health, `ml doctor` to check record integrity (add `--fix` to strip
broken file anchors), `ml --help` for the full command list. Write commands use file locking and
atomic writes, so multiple agents can record concurrently. Expertise survives `git worktree`
cleanup — `.mulch/` resolves to the main repo.

### Before You Finish

1. Discover what to record (shows changed files and suggests domains):
   ```bash
   ml learn
   ```
2. Store insights from this work session:
   ```bash
   ml record <domain> --type <convention|pattern|failure|decision|reference|guide> --description "..."
   ```
3. Validate and commit:
   ```bash
   ml sync
   ```
<!-- mulch:end -->

# Graph Report - .  (2026-05-06)

## Corpus Check
- Corpus is ~19,715 words - fits in a single context window. You may not need a graph.

## Summary
- 175 nodes · 147 edges · 11 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell & Assets|App Shell & Assets]]
- [[_COMMUNITY_AI Client Functions|AI Client Functions]]
- [[_COMMUNITY_League & Groups|League & Groups]]
- [[_COMMUNITY_Design System & Branding|Design System & Branding]]
- [[_COMMUNITY_Auth & Error Handling|Auth & Error Handling]]
- [[_COMMUNITY_GPS & Shot Logging|GPS & Shot Logging]]
- [[_COMMUNITY_Claude API Proxy|Claude API Proxy]]
- [[_COMMUNITY_Handicap & Scoring|Handicap & Scoring]]
- [[_COMMUNITY_Swing Analysis|Swing Analysis]]
- [[_COMMUNITY_Module 32|Module 32]]
- [[_COMMUNITY_Module 49|Module 49]]

## God Nodes (most connected - your core abstractions)
1. `Caddie PWA Golf Companion App` - 20 edges
2. `getAuthHeader()` - 7 edges
3. `index.html — App Entry Point` - 5 edges
4. `Join()` - 4 edges
5. `supabase/functions/ai-proxy/index.ts — Claude API Proxy Edge Function` - 4 edges
6. `Typography System (Playfair Display, DM Mono, Archivo Narrow)` - 4 edges
7. `Round Tracking Feature (Swipeable HoleCard, Supabase Flush on Finish)` - 4 edges
8. `ErrorBoundary` - 3 edges
9. `streamAIAdvice()` - 3 edges
10. `fetchSwingAnalysis()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo` --references--> `Caddie PWA Golf Companion App`  [INFERRED]
  public/favicon.svg → index.html
- `hero.png — Isometric Layered Stack Visual (Purple/White)` --references--> `Caddie PWA Golf Companion App`  [INFERRED]
  src/assets/hero.png → index.html
- `Caddie App Icon 192px — Green Rounded Square with Cursive 'c'` --references--> `Caddie PWA Golf Companion App`  [EXTRACTED]
  public/icons/icon-192.png → index.html
- `Caddie PWA Golf Companion App` --implements--> `AI Advice Feature (Streaming Claude Responses)`  [EXTRACTED]
  index.html → CLAUDE.md
- `Caddie PWA Golf Companion App` --implements--> `Swing Analysis Feature (MediaRecorder + Canvas Frame Extraction)`  [EXTRACTED]
  index.html → CLAUDE.md

## Hyperedges (group relationships)
- **Caddie Core Technology Stack** — tech_react, tech_vite, tech_typescript, tech_tailwind, tech_zustand, tech_tanstack_query, tech_framer_motion, tech_recharts [EXTRACTED 1.00]
- **Caddie Backend & External Services** — tech_supabase, tech_anthropic_claude, tech_google_maps, service_vercel, edge_function_ai_proxy [EXTRACTED 1.00]
- **Caddie State Management Layer** — store_round_store, store_user_store, tech_zustand, tech_tanstack_query [EXTRACTED 1.00]
- **Caddie Design System (Colors + Fonts)** — design_color_palette, design_typography, font_playfair, font_dm_mono, font_archivo_narrow, tech_tailwind [EXTRACTED 1.00]
- **Caddie Core Features** — feature_round_tracking, feature_ai_advice, feature_swing_analysis, feature_pwa [EXTRACTED 1.00]
- **Caddie PWA Visual Assets** — caddie_icon_192, caddie_icon_512, caddie_favicon_svg [INFERRED 0.95]

## Communities

### Community 0 - "App Shell & Assets"
Cohesion: 0.1
Nodes (25): src/App.tsx — Routes and Auth Guard, react.svg — React Framework Logo, vite.svg — Vite Build Tool Logo, Caddie PWA Golf Companion App, Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo, hero.png — Isometric Layered Stack Visual (Purple/White), README.md — React + TypeScript + Vite Template, supabase/migrations/001_initial.sql — Database Schema and RLS Policies (+17 more)

### Community 1 - "AI Client Functions"
Cohesion: 0.23
Nodes (9): fetchAIAdvice(), fetchCourseScout(), fetchShotReaction(), fetchSwingAnalysis(), fetchWeeklyDigest(), getAuthHeader(), streamAIAdvice(), generateGamePlan() (+1 more)

### Community 2 - "League & Groups"
Cohesion: 0.17
Nodes (3): Join(), useJoinGroup(), cn()

### Community 3 - "Design System & Branding"
Cohesion: 0.28
Nodes (9): index.html — App Entry Point, Caddie App Icon 192px — Green Rounded Square with Cursive 'c', Caddie App Icon 512px — Green Rounded Square with Cursive 'c', Custom Caddie Color Palette (fairway, rough, sand, chalk, birdie, bogey, eagle, sky, ink), Typography System (Playfair Display, DM Mono, Archivo Narrow), Archivo Narrow Font (UI Labels), DM Mono Font (Numbers/Data), Playfair Display Font (Display/Headings) (+1 more)

### Community 4 - "Auth & Error Handling"
Cohesion: 0.29
Nodes (1): ErrorBoundary

### Community 5 - "GPS & Shot Logging"
Cohesion: 0.33
Nodes (3): getCurrentPosition(), captureGPS(), getAdvice()

### Community 6 - "Claude API Proxy"
Cohesion: 0.33
Nodes (6): supabase/functions/ai-proxy/index.ts — Claude API Proxy Edge Function, AI Advice Feature (Streaming Claude Responses), Swing Analysis Feature (MediaRecorder + Canvas Frame Extraction), src/lib/claude.ts — Claude API Client (Edge Function Fetcher), Rationale: Claude API calls via Edge Function to avoid exposing Anthropic key client-side, Anthropic Claude API (via Edge Function Proxy)

### Community 9 - "Handicap & Scoring"
Cohesion: 0.5
Nodes (2): getBestCount(), handicapIndex()

### Community 10 - "Swing Analysis"
Cohesion: 0.4
Nodes (2): extractFrames(), handleRecorded()

### Community 32 - "Module 32"
Cohesion: 1.0
Nodes (2): CLAUDE.md — Project Architecture & Dev Guide, Mulch — Structured Expertise Management Tool (ml prime, ml record)

### Community 49 - "Module 49"
Cohesion: 1.0
Nodes (1): icons.svg — Social/UI Icon Sprite Sheet

## Knowledge Gaps
- **20 isolated node(s):** `CLAUDE.md — Project Architecture & Dev Guide`, `Caddie App Icon 512px — Green Rounded Square with Cursive 'c'`, `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo`, `icons.svg — Social/UI Icon Sprite Sheet`, `hero.png — Isometric Layered Stack Visual (Purple/White)` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Auth & Error Handling`** (7 nodes): `EnvError()`, `ErrorBoundary`, `.getDerivedStateFromError()`, `.render()`, `loadProfile()`, `App.tsx`, `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Handicap & Scoring`** (5 nodes): `getBestCount()`, `getScoreLabel()`, `handicapIndex()`, `scoreDifferential()`, `handicap.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Swing Analysis`** (5 nodes): `extractFrames()`, `extractThumbnail()`, `canvas.ts`, `Swing.tsx`, `handleRecorded()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 32`** (2 nodes): `CLAUDE.md — Project Architecture & Dev Guide`, `Mulch — Structured Expertise Management Tool (ml prime, ml record)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module 49`** (1 nodes): `icons.svg — Social/UI Icon Sprite Sheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Caddie PWA Golf Companion App` connect `App Shell & Assets` to `Design System & Branding`, `Claude API Proxy`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `Join()` connect `League & Groups` to `Auth & Error Handling`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Caddie PWA Golf Companion App` (e.g. with `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo` and `hero.png — Isometric Layered Stack Visual (Purple/White)`) actually correct?**
  _`Caddie PWA Golf Companion App` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Join()` (e.g. with `.render()` and `cn()`) actually correct?**
  _`Join()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CLAUDE.md — Project Architecture & Dev Guide`, `Caddie App Icon 512px — Green Rounded Square with Cursive 'c'`, `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & Assets` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
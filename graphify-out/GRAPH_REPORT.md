# Graph Report - .  (2026-05-08)

## Corpus Check
- 31 files · ~15,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 270 nodes · 273 edges · 14 communities detected
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell & PWA|App Shell & PWA]]
- [[_COMMUNITY_Core Architecture & DB Schema|Core Architecture & DB Schema]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Frame Extraction & Animations|Frame Extraction & Animations]]
- [[_COMMUNITY_GPS Utilities|GPS Utilities]]
- [[_COMMUNITY_AI  Claude API Layer|AI / Claude API Layer]]
- [[_COMMUNITY_Google Maps Markers|Google Maps Markers]]
- [[_COMMUNITY_MediaPipe Pose Analysis|MediaPipe Pose Analysis]]
- [[_COMMUNITY_Round Setup Flow|Round Setup Flow]]
- [[_COMMUNITY_AI Proxy Edge Function|AI Proxy Edge Function]]
- [[_COMMUNITY_Scoring & Handicap|Scoring & Handicap]]
- [[_COMMUNITY_Course Search Transform|Course Search Transform]]
- [[_COMMUNITY_Project Docs & Mulch|Project Docs & Mulch]]
- [[_COMMUNITY_Icons Sprite|Icons Sprite]]

## God Nodes (most connected - your core abstractions)
1. `Caddie PWA Golf Companion App` - 20 edges
2. `Caddie (Golf App)` - 12 edges
3. `Database Schema (supabase/migrations/001_initial.sql)` - 11 edges
4. `getAuthHeader()` - 8 edges
5. `Framer Motion Page Transitions` - 7 edges
6. `Supabase (Postgres + Auth + Realtime + Storage)` - 7 edges
7. `analyzePoseFromVideo()` - 6 edges
8. `distanceBetween()` - 5 edges
9. `index.html — App Entry Point` - 5 edges
10. `calculateBiometrics()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Caddie PWA Golf Companion App` --references--> `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo`  [INFERRED]
  index.html → public/favicon.svg
- `Caddie PWA Golf Companion App` --references--> `hero.png — Isometric Layered Stack Visual (Purple/White)`  [INFERRED]
  index.html → src/assets/hero.png
- `Caddie PWA Golf Companion App` --references--> `Caddie App Icon 192px — Green Rounded Square with Cursive 'c'`  [EXTRACTED]
  index.html → public/icons/icon-192.png
- `index.html — App Entry Point` --references--> `Caddie App Icon 192px — Green Rounded Square with Cursive 'c'`  [EXTRACTED]
  index.html → public/icons/icon-192.png
- `vite.svg — Vite Build Tool Logo` --references--> `Vite Build Tool`  [EXTRACTED]
  src/assets/vite.svg → README.md

## Communities

### Community 0 - "App Shell & PWA"
Cohesion: 0.06
Nodes (40): src/App.tsx — Routes and Auth Guard, react.svg — React Framework Logo, vite.svg — Vite Build Tool Logo, Caddie PWA Golf Companion App, Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo, hero.png — Isometric Layered Stack Visual (Purple/White), index.html — App Entry Point, Caddie App Icon 192px — Green Rounded Square with Cursive 'c' (+32 more)

### Community 1 - "Core Architecture & DB Schema"
Cohesion: 0.08
Nodes (31): App.tsx Routing (src/App.tsx), Caddie (Golf App), Database Schema (supabase/migrations/001_initial.sql), DB Table: course_game_plans, DB Table: courses (community-shared), DB Table: digests, DB Table: group_info / group_members, DB Table: group_posts (realtime enabled) (+23 more)

### Community 2 - "Error Boundary"
Cohesion: 0.1
Nodes (4): ErrorBoundary, Join(), useJoinGroup(), cn()

### Community 3 - "Frame Extraction & Animations"
Cohesion: 0.12
Nodes (4): extractFrames(), Framer Motion Page Transitions, generateDigest(), handleRecorded()

### Community 4 - "GPS Utilities"
Cohesion: 0.23
Nodes (8): distanceBetween(), getCurrentPosition(), getDistancesToGreen(), isNearPoint(), autoFillDistance(), captureGPS(), getAdvice(), handleGpsButton()

### Community 5 - "AI / Claude API Layer"
Cohesion: 0.31
Nodes (9): fetchAIAdvice(), fetchCourseScout(), fetchShotReaction(), fetchSwingAnalysis(), fetchWeeklyDigest(), getAuthHeader(), streamAIAdvice(), streamAIRequest() (+1 more)

### Community 7 - "Google Maps Markers"
Cohesion: 0.31
Nodes (8): init(), makeFlagEl(), makePlayerEl(), makeShotTargetEl(), placePinAt(), placeShotAt(), updateLines(), watchPosition()

### Community 8 - "MediaPipe Pose Analysis"
Cohesion: 0.38
Nodes (9): analyzePoseFromVideo(), calculateAngle(), calculateBiometrics(), clamp(), detectPhaseIndices(), horizontalAngle(), initPoseLandmarker(), minKeyVisibility() (+1 more)

### Community 9 - "Round Setup Flow"
Cohesion: 0.29
Nodes (2): buildHolesFromApi(), selectApiCourse()

### Community 11 - "AI Proxy Edge Function"
Cohesion: 0.33
Nodes (6): ai-proxy Edge Function (supabase/functions/ai-proxy/index.ts), Rationale: All Claude API calls proxied through Edge Function to protect Anthropic key, Anthropic Key Security (never expose client-side), canvas.ts (Frame Extractor), src/lib/claude.ts (AI Advice Client), Swing Analysis Flow (MediaRecorder + canvas.ts)

### Community 15 - "Scoring & Handicap"
Cohesion: 0.5
Nodes (2): getBestCount(), handicapIndex()

### Community 22 - "Course Search Transform"
Cohesion: 1.0
Nodes (2): extractColor(), transformCourse()

### Community 34 - "Project Docs & Mulch"
Cohesion: 1.0
Nodes (2): CLAUDE.md — Project Architecture & Dev Guide, Mulch — Structured Expertise Management Tool (ml prime, ml record)

### Community 50 - "Icons Sprite"
Cohesion: 1.0
Nodes (1): icons.svg — Social/UI Icon Sprite Sheet

## Knowledge Gaps
- **41 isolated node(s):** `CLAUDE.md — Project Architecture & Dev Guide`, `Caddie App Icon 512px — Green Rounded Square with Cursive 'c'`, `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo`, `icons.svg — Social/UI Icon Sprite Sheet`, `hero.png — Isometric Layered Stack Visual (Purple/White)` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Round Setup Flow`** (8 nodes): `BackToSearch()`, `beginRound()`, `buildHolesFromApi()`, `fallbackToManual()`, `handleManualSubmit()`, `saveAndContinue()`, `selectApiCourse()`, `Round.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Scoring & Handicap`** (5 nodes): `getBestCount()`, `getScoreLabel()`, `handicapIndex()`, `scoreDifferential()`, `handicap.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Course Search Transform`** (3 nodes): `extractColor()`, `transformCourse()`, `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Docs & Mulch`** (2 nodes): `CLAUDE.md — Project Architecture & Dev Guide`, `Mulch — Structured Expertise Management Tool (ml prime, ml record)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Icons Sprite`** (1 nodes): `icons.svg — Social/UI Icon Sprite Sheet`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Framer Motion Page Transitions` connect `Frame Extraction & Animations` to `Round Setup Flow`, `Error Boundary`, `Round Active UI`, `Core Architecture & DB Schema`?**
  _High betweenness centrality (0.188) - this node is a cross-community bridge._
- **Why does `Caddie (Golf App)` connect `Core Architecture & DB Schema` to `Frame Extraction & Animations`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `handleRecorded()` connect `Frame Extraction & Animations` to `MediaPipe Pose Analysis`, `AI / Claude API Layer`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Caddie PWA Golf Companion App` (e.g. with `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo` and `hero.png — Isometric Layered Stack Visual (Purple/White)`) actually correct?**
  _`Caddie PWA Golf Companion App` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CLAUDE.md — Project Architecture & Dev Guide`, `Caddie App Icon 512px — Green Rounded Square with Cursive 'c'`, `Caddie Favicon SVG — Purple Lightning Bolt / Layered Isometric Logo` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell & PWA` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Core Architecture & DB Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
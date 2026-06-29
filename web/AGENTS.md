# AGENTS.md — cristal-cli-web (Codex context)

Three.js / React Three Fiber migration of the Unity narrative terminal game
CRISTAL.CLI. This file is durable guidance for Codex; a short accurate file beats a
long vague one.

## Layout
- `src/game/` — game logic + R3F components (Scene, Labyrinth, Player, RoomScene, …)
  and **pure logic modules** (`maze.ts`, `store.ts`, `types.ts`, `StabilityEngine.ts`).
- `src/terminal/` — terminal core ported from Unity.
- `src/ui/` — React UI overlays.
- `public/` — static assets served at `/` (e.g. `public/brand/` icons).

## Commands (run from `web/`)
- `npm run typecheck` — `tsc -b --noEmit`. **This is the verification gate. Every change must pass it.**
- `npm run dev` — Vite dev server (browser verification; usually :5173).
- There is **no unit-test runner installed yet** (no vitest/jest). Tests may be
  written in vitest style (`import { describe, it, expect } from 'vitest'`) for when a
  runner lands, but they are NOT executed by `typecheck` — do not claim them green.

## Conventions
- TypeScript, ES modules, 2-space indent. Match the existing style in
  `src/game/types.ts` and `src/game/store.ts` before writing.
- **Separate pure logic from rendering.** Game-rule logic goes in a pure module (no
  `three`, no React, no DOM, no WebGL imports) so it is deterministic and testable;
  the R3F layer consumes it. `StabilityEngine.ts` is the reference example.
- Deterministic logic only in pure modules: **no `Math.random`, no `Date.now`** —
  pass time/seed in as arguments.
- **No ES2022+ APIs** — the repo's `tsc` lib target is lower, so `Array.prototype.at()`
  fails typecheck (`Property 'at' does not exist`). Use index access (`arr[arr.length - 1]`,
  `arr.slice(-n)`) instead. Always run `npm run typecheck` before claiming green.
- No code comments — self-explanatory names (see repo `CLAUDE.md`).

## Working with this repo (the labor split)
- **Codex's lane:** self-contained pure TS modules with a clear contract, mechanical
  refactors, and their vitest-style tests. **Do NOT touch** `package.json`,
  `tsconfig`, lockfiles, or add dependencies unless the task explicitly says so.
- **Not Codex's lane (left to the integrator):** three.js/R3F render, scene wiring,
  shaders, UI, browser debugging, architecture decisions, narrative/world coherence.
- Multiple agents may edit this tree concurrently — only touch the files your task
  names; leave other dirty/untracked files alone.

## Done when
A change is done when: the named files are created/edited, `npm run typecheck` passes
from `web/`, and `git status` shows no unintended edits. Report the public API and
which checks you ran.

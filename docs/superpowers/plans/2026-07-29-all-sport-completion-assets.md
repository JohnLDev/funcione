# All Sport Completion Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add bitmap-backed completion animations for basketball, football/futsal, and beach tennis, then publish to `main`.

**Architecture:** Reuse the existing `SportCompletionAnimation` component. Add one transparent PNG per remaining sport under `apps/frontend/public/sports/`, render each image as decorative content, and animate the sport ball with CSS keyframes.

**Tech Stack:** React, Vite public assets, Tailwind utility classes, CSS keyframes, Playwright E2E, built-in `imagegen`.

## Global Constraints

- Work on branch `codex/all-sport-completion-assets`.
- Publish to `main` only after all final verification passes.
- Keep the existing modal copy, buttons, and execution state behavior unchanged.
- Keep volleyball behavior unchanged aside from shared CSS/component organization.
- Use generated images as decorative content with `alt=""` and `aria-hidden="true"`.
- Store assets under `apps/frontend/public/sports/` and reference them with root-absolute paths.
- No new runtime dependency.
- Use TDD: write E2E assertions and verify they fail before production changes.

---

### Task 1: Add Failing E2E Coverage

**Files:**
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Consumes: existing signup, training wizard, and workout completion helpers.
- Produces: assertions for these sport markers:
  - `basketball-shot-player-asset`
  - `basketball-shot-hoop`
  - `basketball-shot-ball`
  - `football-kick-player-asset`
  - `football-kick-goal`
  - `football-kick-ball`
  - `beach-tennis-swing-player-asset`
  - `beach-tennis-swing-net`
  - `beach-tennis-swing-ball`

- [x] **Step 1: Write the failing E2E test**

Add a Playwright test named `uses sport-specific completion assets for every supported sport`. For each modality below, create a new account, generate a plan, start the first workout, finish it, and assert `data-sport` plus the three marker test ids:

```ts
const sportCompletionCases = [
  {
    modality: 'basquete',
    markerIds: [
      'basketball-shot-player-asset',
      'basketball-shot-hoop',
      'basketball-shot-ball',
    ],
    name: /basquete/i,
  },
  {
    modality: 'futebol_futsal',
    markerIds: [
      'football-kick-player-asset',
      'football-kick-goal',
      'football-kick-ball',
    ],
    name: /futebol/i,
  },
  {
    modality: 'beach_tenis',
    markerIds: [
      'beach-tennis-swing-player-asset',
      'beach-tennis-swing-net',
      'beach-tennis-swing-ball',
    ],
    name: /beach tenis/i,
  },
] as const;
```

- [x] **Step 2: Run the focused E2E test to verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "uses sport-specific completion assets"
```

Expected: FAIL because the first new marker is not found.

### Task 2: Generate And Save Sport Assets

**Files:**
- Create: `apps/frontend/public/sports/basketball-dunk-player.png`
- Create: `apps/frontend/public/sports/football-kick-player.png`
- Create: `apps/frontend/public/sports/beach-tennis-swing-player.png`

**Interfaces:**
- Produces public URLs:
  - `/sports/basketball-dunk-player.png`
  - `/sports/football-kick-player.png`
  - `/sports/beach-tennis-swing-player.png`

- [x] **Step 1: Generate basketball asset**

Use built-in `imagegen` with a flat `#00ff00` chroma-key background. The scene shows one basketball player attacking the basket, with hoop and ball visible, in a modern app illustration style.

- [x] **Step 2: Generate football/futsal asset**

Use built-in `imagegen` with a flat `#00ff00` chroma-key background. The scene shows one football/futsal player kicking a ball toward a goal, in a modern app illustration style.

- [x] **Step 3: Generate beach tennis asset**

Use built-in `imagegen` with a flat `#00ff00` chroma-key background. The scene shows one beach tennis athlete swinging a racket and sending a ball over a net, in a modern app illustration style.

- [x] **Step 4: Remove chroma-key backgrounds**

For each generated source path printed by `imagegen`, run the chroma-key
removal command with one of the fixed output paths below.

Basketball:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input "$BASKETBALL_IMAGEGEN_SOURCE" \
  --out apps/frontend/public/sports/basketball-dunk-player.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Football/futsal:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input "$FOOTBALL_IMAGEGEN_SOURCE" \
  --out apps/frontend/public/sports/football-kick-player.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Beach tennis:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input "$BEACH_TENNIS_IMAGEGEN_SOURCE" \
  --out apps/frontend/public/sports/beach-tennis-swing-player.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Then resize each PNG to max 640px with `sips -Z 640`.

- [x] **Step 5: Inspect saved PNGs**

Verify each asset has alpha, transparent corners, readable sport action, and no obvious green fringe.

### Task 3: Render Asset-Backed Sport Animations

**Files:**
- Modify: `apps/frontend/src/components/training-active-plan.tsx`
- Modify: `apps/frontend/src/index.css`

**Interfaces:**
- Consumes: the three new public PNG URLs.
- Produces: DOM markers listed in Task 1.

- [x] **Step 1: Replace basketball CSS-only branch**

Render `/sports/basketball-dunk-player.png`, a hoop marker, and an animated ball marker.

- [x] **Step 2: Replace football/futsal CSS-only branch**

Render `/sports/football-kick-player.png`, a goal marker, and an animated ball marker.

- [x] **Step 3: Replace beach tennis CSS-only branch**

Render `/sports/beach-tennis-swing-player.png`, a net marker, and an animated ball marker.

- [x] **Step 4: Add CSS keyframes and classes**

Add one small movement cycle per sport. The assets move subtly; the CSS ball carries most of the action.

- [x] **Step 5: Run focused verification**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "uses sport-specific completion assets"
npm run typecheck
npm run build
```

Expected: all pass.

### Task 4: Final Verification, Merge, And Push

**Files:**
- All files changed by Tasks 1-3.

- [x] **Step 1: Run final verification**

Run:

```bash
npm test
npm run test:e2e
git diff --check
```

Expected: all pass.

- [x] **Step 2: Commit locally**

Run:

```bash
git add apps/frontend/e2e/training-plan.spec.ts apps/frontend/src/components/training-active-plan.tsx apps/frontend/src/index.css apps/frontend/public/sports/basketball-dunk-player.png apps/frontend/public/sports/football-kick-player.png apps/frontend/public/sports/beach-tennis-swing-player.png docs/superpowers/specs/2026-07-29-all-sport-completion-assets-design.md docs/superpowers/plans/2026-07-29-all-sport-completion-assets.md
git commit -m "feat(training): add sport completion assets"
```

- [x] **Step 3: Merge and push to main**

Run:

```bash
git switch main
git merge --ff-only codex/all-sport-completion-assets
npm run typecheck
npm test
npm run test:e2e
npm run build
git push origin main
```

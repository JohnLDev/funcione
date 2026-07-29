# Volleyball Spike Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the volleyball workout completion animation so it shows a player attacking a ball over the net.

**Architecture:** Keep the existing `SportCompletionAnimation` component and swap only the volleyball branch. Store a generated PNG under `apps/frontend/public/sports/`, render it as a decorative image, and animate the attack ball with CSS keyframes.

**Tech Stack:** React, Vite public assets, Tailwind utility classes, CSS keyframes, Playwright E2E.

## Global Constraints

- Work on branch `codex/volleyball-spike-animation`.
- Do not push directly unless the user explicitly asks.
- Keep all existing completion modal copy and non-volleyball animations unchanged.
- Use the generated bitmap as decorative content with `alt=""` and `aria-hidden="true"`.
- No new runtime dependency.
- Use TDD: write the E2E assertion and verify it fails before production changes.

---

### Task 1: Add Failing E2E Coverage

**Files:**
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Consumes: existing `workout-completion-sport-animation` test id.
- Produces: assertions for `volleyball-spike-player-asset`, `volleyball-spike-net`, and `volleyball-spike-ball`.

- [x] **Step 1: Write the failing test**

Add these assertions after the existing `data-sport="volei"` assertion:

```ts
await expect(page.getByTestId('volleyball-spike-player-asset')).toBeVisible();
await expect(page.getByTestId('volleyball-spike-net')).toBeVisible();
await expect(page.getByTestId('volleyball-spike-ball')).toBeVisible();
```

- [x] **Step 2: Run the focused E2E test to verify RED**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "tracks workout execution progress"
```

Expected: FAIL because `volleyball-spike-player-asset` is not found.

### Task 2: Generate And Save The Volleyball Asset

**Files:**
- Create: `apps/frontend/public/sports/volleyball-spike-attacker.png`

**Interfaces:**
- Produces: `/sports/volleyball-spike-attacker.png`, consumed by `SportCompletionAnimation`.

- [x] **Step 1: Generate a bitmap asset**

Use the built-in image generation tool with this prompt:

```text
Use case: stylized-concept
Asset type: small UI celebration animation asset
Primary request: Create a compact stylized sports illustration of a volleyball player jumping near a net and spiking a ball over the top of the net.
Scene/backdrop: transparent-friendly clean composition on a perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one athletic volleyball player in mid-air attack pose, extended arm above the net, volleyball above the hand, simple net beside the player.
Style: modern app illustration, crisp edges, bold silhouette, blue and white athletic colors, readable at small size.
Avoid: text, logos, watermarks, photorealism, crowd, extra players, shadows, gradients in the background, #00ff00 in the subject.
```

- [x] **Step 2: Remove the chroma-key background**

Run:

```bash
python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input <generated-source> \
  --out apps/frontend/public/sports/volleyball-spike-attacker.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

- [x] **Step 3: Inspect the PNG**

Verify the saved asset has an alpha channel, transparent corners, and a clear
attacker/net silhouette.

### Task 3: Render The Asset And Animation

**Files:**
- Modify: `apps/frontend/src/components/training-active-plan.tsx`
- Modify: `apps/frontend/src/index.css`

**Interfaces:**
- Consumes: `/sports/volleyball-spike-attacker.png`
- Produces: volleyball-specific DOM markers:
  - `data-testid="volleyball-spike-player-asset"`
  - `data-testid="volleyball-spike-net"`
  - `data-testid="volleyball-spike-ball"`

- [x] **Step 1: Replace the volleyball branch**

Render the PNG with `alt=""`, `aria-hidden="true"`, fixed width/height,
and a volleyball-specific animation class. Keep the scene inside the existing
container.

- [x] **Step 2: Add CSS keyframes**

Add keyframes for the player jump and ball attack path. The ball starts near the
attacking arm and crosses over the net.

- [x] **Step 3: Run focused verification**

Run:

```bash
npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "tracks workout execution progress"
npm run typecheck
npm run build
```

Expected: all pass.

### Task 4: Final Verification And Commit

**Files:**
- All files changed in Tasks 1-3.

- [x] **Step 1: Run broader verification**

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
git add apps/frontend/e2e/training-plan.spec.ts apps/frontend/src/components/training-active-plan.tsx apps/frontend/src/index.css apps/frontend/public/sports/volleyball-spike-attacker.png docs/superpowers/specs/2026-07-29-volleyball-spike-animation-design.md docs/superpowers/plans/2026-07-29-volleyball-spike-animation.md
git commit -m "feat(training): improve volleyball animation"
```

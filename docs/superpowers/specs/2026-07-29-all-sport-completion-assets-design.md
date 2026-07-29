# All Sport Completion Assets Design

## Context

The workout completion modal renders sport-specific celebration visuals through
`SportCompletionAnimation` in `apps/frontend/src/components/training-active-plan.tsx`.
Volleyball now uses a generated bitmap asset plus CSS animation. Basketball,
football/futsal, and beach tennis still use simple CSS shapes.

The user approved applying the same bitmap-asset treatment to the remaining
sports and asked to publish the final result to `main`.

## Goal

Make every supported sport completion animation feel as specific as volleyball,
while keeping the existing modal copy and workout completion flow unchanged.

## Product Requirements

- Keep the volleyball animation unchanged except for shared refactors required by
  the other sports.
- Add sport-specific bitmap assets for:
  - `basquete`: a player attacking the basket with a ball moving into the hoop.
  - `futebol_futsal`: a player kicking a ball toward a goal.
  - `beach_tenis`: a player swinging a racket and sending the ball over a net.
- Store all assets under `apps/frontend/public/sports/` and reference them with
  root-absolute Vite public paths such as `/sports/basketball-dunk-player.png`.
- Keep all generated images decorative for assistive technology with `alt=""`
  and `aria-hidden="true"`. The existing animation wrapper keeps the accessible
  `aria-label`.
- Keep the modal text, buttons, and execution state behavior unchanged.
- The final implementation must be merged and pushed to `main` after passing
  verification.

## Approach

Generate one transparent PNG per remaining sport. Render the PNG as the base
scene and animate a small CSS ball trail over it. This keeps the assets expressive
while keeping the motion controllable, lightweight, and consistent with the
volleyball implementation.

Use a tiny renderer map in `SportCompletionAnimation` only if it makes the
component clearer. Otherwise, keep the conditional branches but replace the
remaining CSS-only scenes with the new asset-backed scenes.

## Testing

Extend the E2E training flow to complete workouts for `basquete`,
`futebol_futsal`, and `beach_tenis`, then assert the completion modal renders
the correct `data-sport` and the sport-specific visual markers.

Focused verification:

- `npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "uses sport-specific completion assets"`
- `npm run typecheck`
- `npm run build`

Final verification before push:

- `npm test`
- `npm run test:e2e`
- `git diff --check`

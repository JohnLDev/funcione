# Volleyball Spike Animation Design

## Context

The workout completion modal already renders a sport animation through
`SportCompletionAnimation` in `apps/frontend/src/components/training-active-plan.tsx`.
For volleyball, the current CSS-only animation reads as generic and does not
clearly communicate an athlete attacking a ball over the net.

The user approved option 3: use a bitmap asset for the volleyball-specific
scene.

## Goal

Make the volleyball completion animation show a player attacking a ball over
the net, while keeping the existing modal copy, completion flow, and other sport
animations unchanged.

## Product Requirements

- Only the `volei` completion animation changes.
- The scene shows a volleyball player in an attack/spike action, a net, and a
  ball travelling over the net.
- The feedback modal keeps the same positive completion copy.
- The animation remains decorative for assistive technology. The existing
  wrapper label remains the accessible description.
- The asset must live inside `apps/frontend/public` so the production build can
  serve it without runtime external dependencies.
- The implementation must work in light and dark themes.

## Approach

Use a generated bitmap PNG for the attacker/net scene and animate it with CSS
inside the existing animation container. Use a separate CSS ball element for the
moving attack trajectory so the image can stay crisp while the animation remains
lightweight and controllable.

The PNG is decorative and will use `alt=""` and `aria-hidden="true"`. The
container keeps `aria-label={label}` and `data-sport="volei"`.

## Testing

Extend the existing E2E workout execution test to assert the volleyball
animation exposes test markers for the attacker asset, the net, and the attack
ball when the completed plan modality is `volei`.

Run:

- `npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --grep "tracks workout execution progress"`
- `npm run typecheck`
- `npm run build`

Before final delivery, run the broader verification expected by the project when
feasible:

- `npm test`
- `npm run test:e2e`

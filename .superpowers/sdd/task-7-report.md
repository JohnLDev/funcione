# Task 7 Report: Frontend Training Gateway And Route State

## Status

DONE

## TDD Evidence

### RED

Command:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --project=mobile-chrome
```

Result: exit code `1`.

Relevant output:

```text
Running 1 test using 1 worker
✘  1 [mobile-chrome] › e2e/training-plan.spec.ts:4:3 › monthly training plan route › opens the training route from dashboard navigation
Error: locator.click: Test timeout of 30000ms exceeded.
- waiting for getByRole('link', { name: /treino/i })
1 failed
```

The test failed for the intended reason: the dashboard rendered navigation buttons, not a Treino link.

### GREEN

Command:

```bash
rtk npm run typecheck --workspace @langchain-training/frontend
```

Result: exit code `0`.

```text
> tsc -b
```

Command:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --project=mobile-chrome
```

Result: exit code `0`.

```text
Running 1 test using 1 worker
✓  1 [mobile-chrome] › e2e/training-plan.spec.ts:4:3 › monthly training plan route › opens the training route from dashboard navigation
1 passed (2.3s)
```

## Implementation

- Added monthly training-plan contract types, API gateway, localStorage-backed mock gateway, environment gateway factory, provider, and hook.
- Added a protected `/training` route using the same session/profile-completion guards as `/dashboard`.
- Added a temporary responsive training screen that shows loading, active-plan, or new-plan route state.
- Converted dashboard side and mobile navigation to React Router `NavLink` elements; Treino now targets `/training` and browser history remains native.
- Added matching `training` translations in `pt-BR` and `en-US`.
- Added a mobile Playwright route test that creates a mock-auth account, opens Treino, and asserts the route and Portuguese heading.

## Files Changed

- `apps/frontend/e2e/training-plan.spec.ts`
- `apps/frontend/src/App.tsx`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/components/training-screen.tsx`
- `apps/frontend/src/i18n/locales/en-US/common.json`
- `apps/frontend/src/i18n/locales/pt-BR/common.json`
- `apps/frontend/src/training/api-training-plan-gateway.ts`
- `apps/frontend/src/training/mock-training-plan-gateway.ts`
- `apps/frontend/src/training/training-plan-gateway.ts`
- `apps/frontend/src/training/training-plan-provider.tsx`
- `apps/frontend/src/training/training-plan.ts`
- `apps/frontend/src/training/use-training-plan.ts`
- `docs/superpowers/plans/2026-07-23-training-route-state.md`

## Self-Review

- Verified the route uses `useAuth().session.accessToken` through `TrainingPlanProvider`; no new auth state was introduced.
- Verified mock mode selects the mock training gateway, so E2E makes no backend or Supabase call.
- Verified `/training` redirects unauthenticated users to `/login` and incomplete profiles to `/complete-profile`, matching `/dashboard`.
- Verified dashboard navigation renders real `NavLink` anchors on mobile and desktop. The mobile E2E proves the main path, and the full E2E suite passes on both browser projects.
- Verified the temporary screen has constrained width, mobile-first padding, and `overflow-x-hidden`.
- Ran `git diff --check`; no whitespace errors were reported.

## Verification

All commands completed with exit code `0`:

```bash
rtk npm run typecheck
rtk npm test
rtk npm run test:e2e
rtk npm run build
```

Results:

- Root typecheck passed.
- Backend test suite passed: 58 tests, 0 failures.
- Full Playwright suite passed: 8 tests across mobile and desktop, 0 failures.
- Production build passed.

## Concerns

None.

## Review Fix: Respect Monthly Mock Training Window

### RED

Command:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- mock-training-plan-gateway.spec.ts training-plan.spec.ts --project=mobile-chrome
```

Result: exit code `1`.

Relevant output:

```text
mock training plan gateway › treats expired plans as regenerable and creates a current monthly plan
Expected: null
Received: {"status":"expired", ...}

monthly training plan route › opens the training route from dashboard navigation
Expected: 1
Received: 3
2 failed
```

This proved that expired records remained active in the mock gateway and that all three `/dashboard` navigation entries received `aria-current="page"`.

### GREEN

All commands completed with exit code `0`:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- mock-training-plan-gateway.spec.ts --project=mobile-chrome
rtk npm run typecheck --workspace @langchain-training/frontend
rtk npm run test:e2e --workspace @langchain-training/frontend -- training-plan.spec.ts --project=mobile-chrome
```

Results:

- Focused mock-gateway test passed: 1 test, 0 failures.
- Frontend typecheck passed.
- Task 7 mobile route test passed: 1 test, 0 failures.

### Files Changed

- `apps/frontend/e2e/mock-training-plan-gateway.spec.ts`
- `apps/frontend/e2e/training-plan.spec.ts`
- `apps/frontend/src/components/app-shell.tsx`
- `apps/frontend/src/training/mock-training-plan-gateway.ts`
- `docs/superpowers/plans/2026-07-23-training-route-state.md`
- `.superpowers/sdd/task-7-report.md`

### Fix Summary And Self-Review

- Mock plan generation now uses the current time and retains the 30-day UTC regeneration window.
- A stored plan is active only when it has `status: 'active'` and a regeneration timestamp in the future. Expired/non-active records allow a new monthly plan to replace the stored record.
- The focused Playwright test imports the Vite-served mock gateway directly in the browser and uses only `localStorage`; it makes no backend or Supabase call.
- Home and Treino remain `NavLink` route destinations. History and Profile remain real `Link` controls to their current dashboard placeholder without active styling or `aria-current` until distinct routes exist.
- `git diff --check` passed after the fix.

### Concerns

None.

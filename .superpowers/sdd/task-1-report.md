# Task 1 Report: Shared Auth Token And Supabase Profile Repository

## Status

Completed and committed as `feat: add request scoped profile repositories`.

## Implemented

- Added `extractBearerToken` as the shared parser used by both auth verification and request-scoped profile repository selection.
- Added `UserProfileRepositoryFactory`, allowing an access token to produce a request-scoped `UserProfileRepository`.
- Added `createSupabaseUserProfileRepository`, which creates a non-persistent Supabase client using the caller JWT in the `Authorization: Bearer` header. It maps `user_profiles` rows to the domain profile and supports `findByUserId` plus conflict-targeted upsert.
- Updated profile GET and PUT routes to choose a factory-created repository when a valid bearer token and factory are supplied, while retaining the injected shared repository as fallback.
- Updated `buildApp` to create one shared fallback in-memory repository per application and pass the optional repository factory into auth routes.
- Exported the new auth utilities and added the requested route regression test.

## TDD Evidence

### RED

Command:

```bash
rtk npm run build --workspace @langchain-training/backend && rtk node --test apps/backend/dist/modules/auth/http/auth-routes.test.js
```

Result: failed as expected during compilation with `TS2561`: `userProfileRepositoryFactory` did not exist in `BuildAppOptions`. The test callback also had an implicit `any` because the option type was absent.

### GREEN

Command:

```bash
rtk npm run build --workspace @langchain-training/backend && rtk node --test apps/backend/dist/modules/auth/http/auth-routes.test.js
```

Result: build passed; auth route suite passed 8/8, including `uses a request scoped user profile repository when a factory is provided`.

## Verification

All commands were run from the isolated worktree.

```bash
rtk git diff --check
rtk npm run typecheck
rtk npm test
rtk npm run test:e2e
rtk npm run build
```

Results: diff check passed; typecheck passed; unit tests passed 16/16; Playwright E2E passed 6/6 across desktop and mobile; workspace build passed. Playwright's web server printed existing `NO_COLOR` and `FORCE_COLOR` environment warnings, with no test failures.

## Files Changed

- `apps/backend/src/app.ts`
- `apps/backend/src/modules/auth/application/bearer-token.ts`
- `apps/backend/src/modules/auth/application/user-profile-repository-factory.ts`
- `apps/backend/src/modules/auth/http/auth-routes.test.ts`
- `apps/backend/src/modules/auth/http/auth-routes.ts`
- `apps/backend/src/modules/auth/index.ts`
- `apps/backend/src/modules/auth/infra/supabase-auth-verifier.ts`
- `apps/backend/src/modules/auth/infra/supabase-user-profile-repository.ts`
- `.superpowers/sdd/task-1-report.md`

## Self-Review

No defects found in the Task 1 diff. The factory is only called after successful authentication and only for a parsed bearer token; malformed/missing tokens preserve the configured fallback behavior. No service-role key was introduced or exposed.

## Concerns

Current Supabase JS documentation also mentions `auth.hasCustomAuthorizationHeader: true` when supplying a custom global `Authorization` header. The task brief supplied an exact repository snippet without that option, so this implementation follows the brief verbatim. Confirm whether the project wants that extra configuration in a follow-up, particularly if later repository operations call Supabase Auth methods in addition to database operations.

## Review Fixes

### Added Coverage

- Added PUT `/api/auth/profile` coverage proving the factory receives the bearer token and the profile persists in the factory-created request-scoped repository.
- Added an isolated Supabase repository test using an injected `fetch` double. It validates the caller JWT `Authorization` header, `findByUserId` row-to-domain mapping, and `upsert` domain-to-row mapping with `on_conflict=user_id` and the Supabase upsert preference.

### RED/GREEN Evidence

RED command:

```bash
rtk npm run build --workspace @langchain-training/backend
```

Result: failed as expected with `TS2353` because `fetch` was not accepted by `SupabaseUserProfileRepositoryConfig`; the test could not yet inject a network double.

GREEN command:

```bash
rtk npm run build --workspace @langchain-training/backend && rtk node --test apps/backend/dist/modules/auth/http/auth-routes.test.js apps/backend/dist/modules/auth/infra/supabase-user-profile-repository.test.js
```

Result: build passed and focused suites passed 10/10 (9 auth route tests and 1 Supabase repository test).

### Commands And Results

```bash
rtk npm run build --workspace @langchain-training/backend
rtk node --test apps/backend/dist/modules/auth/http/auth-routes.test.js apps/backend/dist/modules/auth/infra/supabase-user-profile-repository.test.js
```

Result: both commands passed; no external network calls were made.

### Files Changed

- `apps/backend/src/modules/auth/http/auth-routes.test.ts`
- `apps/backend/src/modules/auth/infra/supabase-user-profile-repository.test.ts`
- `apps/backend/src/modules/auth/infra/supabase-user-profile-repository.ts`
- `docs/superpowers/plans/2026-07-23-monthly-training-plan-form.md`
- `.superpowers/sdd/task-1-report.md`

### Self-Review

The injected `fetch` is optional and preserves production client creation. The focused test exercises the real Supabase JS request builder and asserts its outgoing headers, URL, query parameters, and payload mapping. The PUT test verifies persistence through the repository instance returned by the factory, not merely that the factory was invoked.

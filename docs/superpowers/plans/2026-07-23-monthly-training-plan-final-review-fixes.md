# Monthly Training Plan Final Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the Critical, Important, and straightforward C1-control findings from the final whole-branch review for the Funcione monthly training plan flow.

**Architecture:** Keep the authenticated monthly REST endpoints as the only application-level generation surface. Move all monthly-plan and reservation writes behind owner-checked Supabase RPCs, use a 15-minute database lease for abandoned reservations, and keep the service resilient when completion or cleanup transport calls fail. Tighten the shared request contract, then make the existing React provider/screen render loading, pending, error/retry, wizard, and active-plan states explicitly.

**Tech Stack:** TypeScript, Node test runner, Fastify/OpenAPI, Zod 4, Supabase Postgres/RLS/RPC, React 19, i18next, Playwright.

## Global Constraints

- Baseline is `e016193` on `codex/monthly-training-plan-form` in the existing isolated worktree.
- Use TDD for every behavior change and preserve unrelated workspace changes.
- Monthly plan/reservation tables expose reads only; all writes use invariant-enforcing RPCs.
- Any required `SECURITY DEFINER` RPC must verify `auth.uid()` ownership, use `set search_path = ''`, revoke `EXECUTE` from `public` and `anon`, and grant only to `authenticated`.
- Remove the unauthenticated legacy `POST /api/training-plans` route and its OpenAPI operation.
- Keep UI changes mobile first, update pt-BR and en-US, and cover critical user states in Playwright on mobile and desktop projects.

---

### Task 1: Secure Persistence And Recover Stale Reservations

**Files:**
- Modify: `supabase/migrations/20260723220139_create_training_plan_tables.sql`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-repository.ts`
- Modify: `apps/backend/src/modules/training/infra/in-memory-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.ts`
- Modify: `apps/backend/src/modules/training/infra/supabase-training-repositories.test.ts`
- Create: `apps/backend/src/modules/training/infra/training-plan-migration.test.ts`

**Interfaces:**
- Monthly state lookup receives an observation time for deterministic in-memory lease/expiry tests; Supabase remains authoritative and uses database `now()`.
- Release uses `release_training_monthly_plan_generation(uuid)` instead of direct table update.
- Reserve uses `reserve_training_monthly_plan_generation(uuid)` and database timestamps.

- [x] Add repository/static migration tests that fail because writes are directly granted, RPCs are invoker-based, release is a direct update, and stale leases do not exist.
- [x] Run the focused repository/migration tests and confirm the expected failures.
- [x] Add a 15-minute `lease_expires_at`, database-side stale release and active-plan expiry, strict owner checks, definer security, explicit function grants, and read-only table grants.
- [x] Update Supabase and in-memory repositories to use the secured RPC contract and deterministic lease recovery.
- [x] Re-run focused repository/migration tests and confirm they pass.

### Task 2: Harden Service And HTTP Contracts

**Files:**
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.ts`
- Modify: `apps/backend/src/modules/training/application/monthly-training-plan-service.test.ts`
- Modify: `apps/backend/src/modules/training/domain/schemas.ts`
- Create: `apps/backend/src/modules/training/domain/schemas.test.ts`
- Modify: `apps/backend/src/modules/training/domain/prompt-text.ts`
- Modify: `apps/backend/src/modules/training/domain/prompt-text.test.ts`
- Modify: `apps/backend/src/modules/training/http/training-json-schemas.ts`
- Modify: `apps/backend/src/modules/training/http/training-routes.ts`
- Modify: `apps/backend/src/modules/training/http/training-routes.test.ts`

**Interfaces:**
- Durations are exactly `30 | 45 | 60 | 75 | 90`.
- Goals, equipment, and injuries are bounded and unique by enum/type; every injury requires `gravidade`.
- Monthly routes document global `500`; legacy generation returns `404` and is absent from OpenAPI.

- [x] Add failing domain/service/route tests for C1 stripping, bounded unique arrays, required severity, completion exceptions, safe cleanup failures, legacy-route removal, and monthly `500` OpenAPI/runtime responses.
- [x] Run focused backend tests and confirm each new assertion fails for the intended missing behavior.
- [x] Implement minimal schema, service, OpenAPI, and route changes.
- [x] Re-run focused backend tests and confirm they pass.

### Task 3: Complete Wizard, State, And Active Plan UI

**Files:**
- Modify: `apps/frontend/src/training/training-plan.ts`
- Modify: `apps/frontend/src/training/training-plan-provider.tsx`
- Modify: `apps/frontend/src/training/mock-training-plan-gateway.ts`
- Modify: `apps/frontend/src/components/training-screen.tsx`
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/src/components/training-active-plan.tsx`
- Modify: `apps/frontend/src/i18n/locales/pt-BR/common.json`
- Modify: `apps/frontend/src/i18n/locales/en-US/common.json`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- `TrainingInjury.gravidade` is required and each selected injury owns its own optional note.
- `canGenerate: false` with no active plan renders pending state; provider errors render with reload/reconciliation retry.
- Review displays every request field available before generation (age remains backend-derived and is identified as such).

- [x] Add failing E2E assertions for per-injury details, complete review/mobile notice, pending and error/retry states, network-safe POST behavior, and complete active-plan details.
- [x] Run targeted Playwright tests on mobile and desktop and confirm intended failures.
- [x] Implement the typed injury editor, review summary, visible monthly notice, explicit screen states, localized retry/error copy, and active-plan detail fields.
- [x] Re-run targeted Playwright tests on mobile and desktop and confirm they pass.

### Task 4: Documentation, Review, And Verification

**Files:**
- Modify: `docs/superpowers/specs/2026-07-23-monthly-training-plan-form-design.md`
- Modify: `docs/superpowers/plans/2026-07-23-monthly-training-plan-final-review-fixes.md`
- Create: `.superpowers/sdd/final-review-fix-report.md`

- [x] Update the design for authenticated-only monthly generation, read-only table exposure, strict RPCs, lease recovery, and final UI states.
- [x] Run targeted backend and frontend test commands and record exact results.
- [x] Run `rtk npm run typecheck`, `rtk npm test`, `rtk npm run test:e2e`, and `rtk npm run build` from the root.
- [x] Inspect `git diff --check`, the complete diff, and worktree status; perform a final review against every brief item.
- [x] Write the required final-review report and create a focused commit.

### Task 5: Re-review Follow-up

**Files:**
- Modify: `supabase/migrations/20260723220139_create_training_plan_tables.sql`
- Create: `supabase/migrations/20260724093529_secure_monthly_training_plan_rpc.sql`
- Modify: `apps/backend/src/modules/training/infra/training-plan-migration.test.ts`
- Modify: `apps/backend/src/modules/training/http/training-routes.ts`
- Modify: `apps/backend/src/modules/training/http/training-routes.test.ts`
- Modify: `apps/backend/src/modules/training/http/training-json-schemas.ts`
- Modify: `apps/frontend/src/components/training-plan-wizard.tsx`
- Modify: `apps/frontend/e2e/training-plan.spec.ts`

**Interfaces:**
- Existing Supabase deployments receive a forward migration instead of relying only on edits to the original migration.
- `complete_training_monthly_plan_generation` validates the plan JSON, snapshot, metadata, and athletic-profile mirror before writing untrusted completion payloads.
- Free-text OpenAPI fields declare min/max length and the route normalizes prompt-bound strings before JSON Schema validation.
- The wizard review does not display a client-derived age value; it identifies age as calculated from the authenticated registration profile.

- [x] Add failing backend tests for the missing forward migration, DB completion-payload validation, and OpenAPI free-text min/max bounds.
- [x] Add failing mobile E2E expectation for backend-derived age wording in the review step.
- [x] Implement the forward migration, completion validation helper, route pre-validation normalizer, OpenAPI bounds, and review copy update.
- [x] Re-run focused backend and mobile E2E tests and confirm they pass.
- [x] Run the full root verification commands again after the follow-up changes.
- [x] Re-review found remaining DB completion validation gaps for mirrored enum data, nullable comparisons, and nested workout result item contracts.
- [x] Add failing backend migration tests for enum allowlists, null-safe mirrors, nested `alongamentos`/`exercicios` contracts, text field types, and free-text bounds in both base and forward migrations.
- [x] Strengthen base and forward SQL validation for snapshot/profile allowlists, required scalar types, `is distinct from` mirror comparisons, objective/equipment/injury values, custom text bounds, and nested workout result item fields.
- [x] Run focused backend tests and the full root verification commands again after the second follow-up.
- [ ] Re-review the final diff after the second follow-up commit.

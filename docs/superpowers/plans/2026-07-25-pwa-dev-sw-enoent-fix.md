# PWA Dev Service Worker ENOENT Fix Plan

**Goal:** Prevent Vite development from showing `ENOENT ... apps/frontend/dev-dist/sw.js` when a browser or stale service worker requests `/dev-sw.js?dev-sw`.

**Root Cause:** `vite-plugin-pwa` development service worker support was enabled and the app also allowed development registration through `?pwa=1`. That makes the dev server depend on transient `apps/frontend/dev-dist/*` files. If those files are removed while the server is running, Vite can return a 500 error for `/dev-sw.js?dev-sw`.

**Architecture:** Keep PWA installability metadata available in development, but register and generate service worker behavior only for production builds. Development should still expose the manifest/icons for validation, unregister stale development service workers, and ensure `/dev-sw.js?dev-sw` never breaks the app shell.

**Files Affected:**
- `apps/frontend/e2e/pwa-installability.spec.ts`
- `apps/frontend/src/pwa/register-service-worker.ts`
- `apps/frontend/vite.config.ts`
- `apps/frontend/index.html`
- `apps/frontend/public/manifest.webmanifest`
- `docs/superpowers/specs/2026-07-25-pwa-installability-design.md`
- `README.md`

**Verification Commands:**
- `npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium apps/frontend/e2e/pwa-installability.spec.ts`
- `npm run typecheck --workspace @langchain-training/frontend`
- `npm run build --workspace @langchain-training/frontend`

## Tasks

- [x] Reproduce the current `/dev-sw.js?dev-sw` ENOENT on the running dev server.
- [x] Add failing E2E coverage proving the app shell does not register a development service worker.
- [x] Disable development service worker generation/registration while preserving production PWA output.
- [x] Unregister stale service workers in development so old browser state does not keep requesting `/dev-sw.js?dev-sw`.
- [x] Update PWA documentation/spec notes for development behavior.
- [x] Verify targeted E2E, frontend typecheck, and frontend build.

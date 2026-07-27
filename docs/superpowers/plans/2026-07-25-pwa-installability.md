# PWA Installability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Funcione frontend installable as a PWA using the generated Funcione MileX app icons.

**Architecture:** The frontend uses `vite-plugin-pwa` to generate the web app manifest, service worker, and registration script during Vite builds. Static icons live under `apps/frontend/public/icons`, while Workbox precaches only app shell assets and avoids authenticated API routes.

**Tech Stack:** Vite, React, Playwright, vite-plugin-pwa, Workbox, npm workspaces.

## Global Constraints

- Preserve existing workspace changes and do not revert unrelated files.
- Use `rtk proxy` for shell commands in this workspace.
- Start behavior changes with automated tests.
- Keep PWA caching limited to static app shell assets.
- Do not runtime-cache `/api`, `/documentation`, or `/healthz`.
- Keep the app mobile-first and verify installability metadata through E2E.

---

### Task 1: PWA E2E Contract

**Files:**
- Create: `apps/frontend/e2e/pwa-installability.spec.ts`

**Interfaces:**
- Consumes: frontend app at Playwright `baseURL`.
- Produces: E2E contract for manifest fields and app icon assets.

- [x] Write a failing Playwright test named `exposes installability metadata and app icons`.
- [x] Run `npm run test:e2e --workspace @langchain-training/frontend -- --project=desktop-chromium apps/frontend/e2e/pwa-installability.spec.ts` and verify it fails because the manifest/service worker is missing.

### Task 2: PWA Assets And Configuration

**Files:**
- Modify: `apps/frontend/package.json`
- Modify: `package-lock.json`
- Modify: `apps/frontend/vite.config.ts`
- Modify: `apps/frontend/index.html`
- Create: `apps/frontend/public/icons/funcione-milex-app-icon-48.png`
- Create: `apps/frontend/public/icons/funcione-milex-app-icon-180.png`
- Create: `apps/frontend/public/icons/funcione-milex-app-icon-192.png`
- Create: `apps/frontend/public/icons/funcione-milex-app-icon-512.png`
- Create: `apps/frontend/public/icons/funcione-milex-app-icon-1024.png`
- Create: `apps/frontend/public/icons/funcione-milex-app-icon.png`

**Interfaces:**
- Produces: generated `/manifest.webmanifest`.
- Produces: generated `/sw.js`.
- Produces: installation icons under `/icons/*`.

- [x] Install `vite-plugin-pwa` as a frontend dev dependency.
- [x] Copy generated icons from `/Users/john/Downloads/Funcione-MileX-App-Icon/` into `apps/frontend/public/icons/`.
- [x] Configure `VitePWA` in `apps/frontend/vite.config.ts` with manifest metadata, icons, app shell precache patterns, and route denylist for API/documentation/health.
- [x] Add favicon, apple touch icon, theme color, and app description metadata to `apps/frontend/index.html`.
- [x] Run the targeted PWA E2E test and verify it passes.

### Task 3: Documentation And Full Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-25-pwa-installability.md`

**Interfaces:**
- Produces: documented installability requirements and local validation command.

- [x] Document PWA/installability behavior in `README.md`.
- [x] Run `npm run typecheck`.
- [x] Run `npm run test:e2e`.
- [x] Run `npm run build`.
- [x] Run `docker compose config --quiet`.
- [x] Run `git diff --check`.

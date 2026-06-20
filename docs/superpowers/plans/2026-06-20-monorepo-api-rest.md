# Monorepo API REST Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o projeto em um monorepo com backend REST documentado por OpenAPI e frontend Vite minimo.

**Architecture:** A raiz orquestra npm workspaces. O backend roda como monolito modular em `apps/backend`, com o modulo `training` contendo dominio, aplicacao, infra e HTTP. O frontend em `apps/frontend` nasce como Vite TypeScript compilavel, com proxy de desenvolvimento para `/api`.

**Tech Stack:** TypeScript, Node.js, npm workspaces, Fastify, `@fastify/swagger`, `@fastify/swagger-ui`, Vite, Zod, LangChain.

---

### Task 1: Monorepo Workspaces

**Files:**
- Modify: `package.json`
- Create: `tsconfig.base.json`
- Create: `apps/backend/package.json`
- Create: `apps/backend/tsconfig.json`
- Create: `apps/frontend/package.json`
- Create: `apps/frontend/tsconfig.json`

- [ ] **Step 1: Convert root package to workspace orchestrator**

Root scripts must call workspace scripts:

```json
{
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspace @langchain-training/backend",
    "typecheck": "npm run typecheck --workspaces",
    "dev:backend": "npm run dev --workspace @langchain-training/backend",
    "dev:frontend": "npm run dev --workspace @langchain-training/frontend"
  },
  "workspaces": ["apps/backend", "apps/frontend"]
}
```

- [ ] **Step 2: Add backend workspace scripts**

Backend scripts:

```json
{
  "scripts": {
    "build": "tsgo -p tsconfig.json",
    "typecheck": "tsgo -p tsconfig.json --noEmit",
    "test": "npm run build && node --test dist/**/*.test.js",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js"
  }
}
```

- [ ] **Step 3: Add frontend workspace scripts**

Frontend scripts:

```json
{
  "scripts": {
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b",
    "dev": "vite",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 4: Run baseline workspace install**

Run: `npm install`

Expected: package lock updates successfully with workspace dependencies.

### Task 2: Backend Modular Monolith Layout

**Files:**
- Move: `src/domain/training/**` to `apps/backend/src/modules/training/domain/**`
- Move: `src/agents/instructor/instructor.ts` to `apps/backend/src/modules/training/infra/instructor.ts`
- Move: `src/agent.ts` to `apps/backend/src/shared/agent.ts`
- Replace: `main.ts` with backend server entry or remove from root after preserving behavior in backend
- Create: `apps/backend/src/modules/training/application/generate-training-plan.ts`
- Create: `apps/backend/src/modules/training/index.ts`

- [ ] **Step 1: Move existing training domain into module**

Preserve current exports and tests. Update imports from `../../domain/training/index.js` to module-local paths.

- [ ] **Step 2: Extract application use case**

Create `generateTrainingPlan(input, dependencies)` that owns provider fallback and returns:

```ts
{
  provider?: string;
  model?: string;
  fallbackUsed: boolean;
  attempts: ModelAttempt[];
  durationMs?: number;
  result?: PlanoTreino;
  error?: string;
}
```

- [ ] **Step 3: Keep external model creation in infra**

Keep LangChain, provider config and prompt logic inside `infra/instructor.ts`.

- [ ] **Step 4: Run moved domain tests**

Run: `npm run test --workspace @langchain-training/backend`

Expected: existing policy tests still pass.

### Task 3: REST API and OpenAPI

**Files:**
- Create: `apps/backend/src/app.ts`
- Create: `apps/backend/src/server.ts`
- Create: `apps/backend/src/shared/config/env.ts`
- Create: `apps/backend/src/shared/http/errors.ts`
- Create: `apps/backend/src/modules/training/http/training-routes.ts`
- Create: `apps/backend/src/modules/training/http/training-json-schemas.ts`
- Create: `apps/backend/src/modules/training/http/training-routes.test.ts`

- [ ] **Step 1: Write route tests first**

Tests must cover:

```ts
await app.inject({ method: 'POST', url: '/api/training-plans', payload: invalidPayload });
await app.inject({ method: 'POST', url: '/api/training-plans', payload: validPayload });
await app.inject({ method: 'GET', url: '/documentation/json' });
```

Expected before implementation: tests fail because `buildApp` and routes do not exist.

- [ ] **Step 2: Implement Fastify app factory**

`buildApp(options)` registers Swagger before routes, then registers training routes.

- [ ] **Step 3: Implement POST `/api/training-plans`**

Route validates body and responses through JSON schema. It calls injected `generateTrainingPlan` dependency.

- [ ] **Step 4: Implement OpenAPI endpoints**

Expose Swagger UI at `/documentation` and OpenAPI JSON at `/documentation/json`.

- [ ] **Step 5: Run backend tests**

Run: `npm run test --workspace @langchain-training/backend`

Expected: route tests and domain tests pass.

### Task 4: Frontend Vite Skeleton

**Files:**
- Create: `apps/frontend/index.html`
- Create: `apps/frontend/vite.config.ts`
- Create: `apps/frontend/src/main.ts`
- Create: `apps/frontend/src/style.css`
- Create: `apps/frontend/src/vite-env.d.ts`

- [ ] **Step 1: Create minimal Vite TypeScript app**

The first screen should only identify the app shell and avoid final theme decisions.

- [ ] **Step 2: Configure dev proxy**

`vite.config.ts` proxies `/api` to `http://localhost:3000`.

- [ ] **Step 3: Run frontend build**

Run: `npm run build --workspace @langchain-training/frontend`

Expected: TypeScript and Vite build pass.

### Task 5: Final Verification

**Files:**
- Modify: `package-lock.json`
- Review: all moved and created files

- [ ] **Step 1: Run root typecheck**

Run: `npm run typecheck`

Expected: both workspaces typecheck.

- [ ] **Step 2: Run root tests**

Run: `npm test`

Expected: backend tests pass.

- [ ] **Step 3: Run root build**

Run: `npm run build`

Expected: backend and frontend builds pass.

- [ ] **Step 4: Inspect git diff**

Run: `git status --short` and `git diff --stat`

Expected: changes match the monorepo/API/frontend scope.

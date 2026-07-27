# Frontend API Base URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the Cloudflare Pages frontend call the Render backend at `https://funcione-api.onrender.com` through a configurable Vite environment variable.

**Architecture:** Add a small frontend API URL helper that joins `VITE_API_BASE_URL` with existing `/api/...` paths while preserving the current relative `/api` behavior when the variable is absent. Update the training and registration profile API gateways to use this helper so deploys can point directly to Render without Cloudflare proxy rewrites.
Because direct browser calls to Render are cross-origin, enable backend CORS for API requests using Fastify's CORS plugin.

**Tech Stack:** Vite 7.3.1, React, TypeScript, Playwright component-style gateway tests, Fastify, `@fastify/cors`.

## Global Constraints

- Frontend lives in `apps/frontend` and uses Vite.
- Only variables prefixed with `VITE_` are exposed to client code.
- Keep the existing relative `/api` fallback for local dev and proxy-based deployments.
- Use `https://funcione-api.onrender.com` as the production backend URL requested by the user.
- Direct browser calls to Render must pass CORS preflight for `authorization` and `content-type` headers.
- Preserve existing workspace changes and do not touch unrelated files.

---

### Task 1: API Base URL Helper

**Files:**
- Create: `apps/frontend/src/api/api-url.ts`
- Create: `.env.production`
- Test: `apps/frontend/e2e/api-training-plan-gateway.spec.ts`
- Test: `apps/frontend/e2e/api-registration-profile-gateway.spec.ts`
- Modify: `apps/frontend/src/training/api-training-plan-gateway.ts`
- Modify: `apps/frontend/src/auth/api-registration-profile-gateway.ts`
- Modify: `apps/frontend/src/vite-env.d.ts`

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_BASE_URL?: string`
- Produces: `toApiUrl(path: ApiPath, options?: { apiBaseUrl?: string }): string`, where `ApiPath` is a template literal type for `/api/${string}`.

- [x] **Step 1: Write failing training gateway test**

Add a test that sets `globalThis.fetch`, calls `createApiTrainingPlanGateway({ apiBaseUrl: 'https://funcione-api.onrender.com' }).getGenerationStatus('valid-token', 'generation-123')`, and expects the request URL to be:

```ts
'https://funcione-api.onrender.com/api/training-plans/generations/generation-123'
```

- [x] **Step 2: Write failing registration gateway test**

Add a test that sets `globalThis.fetch`, calls `createApiRegistrationProfileGateway({ apiBaseUrl: 'https://funcione-api.onrender.com' }).completeProfile('access-token', profile)`, and expects the request URL to be:

```ts
'https://funcione-api.onrender.com/api/auth/profile'
```

- [x] **Step 3: Run focused tests and verify RED**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- api-training-plan-gateway.spec.ts api-registration-profile-gateway.spec.ts --project desktop-chromium
```

Expected: the two new tests fail because the gateways still request relative `/api/...` URLs.

- [x] **Step 4: Implement API URL helper**

Create `apps/frontend/src/api/api-url.ts`:

```ts
export type ApiPath = `/api/${string}`;

export type ApiUrlOptions = {
  apiBaseUrl?: string;
};

function getDefaultApiBaseUrl(): string | undefined {
  return import.meta.env?.VITE_API_BASE_URL;
}

export function toApiUrl(path: ApiPath, options: ApiUrlOptions = {}): string {
  const apiBaseUrl = (options.apiBaseUrl ?? getDefaultApiBaseUrl())
    ?.trim()
    .replace(/\/+$/, '');

  if (!apiBaseUrl) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}
```

Then replace direct gateway fetch paths with `toApiUrl('/api/...')`.

- [x] **Step 5: Type Vite env and set production default**

Add `readonly VITE_API_BASE_URL?: string;` to `apps/frontend/src/vite-env.d.ts` so the helper can later read Vite env values with TypeScript support.

Create `.env.production`:

```env
VITE_API_BASE_URL=https://funcione-api.onrender.com
```

- [x] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
rtk npm run test:e2e --workspace @langchain-training/frontend -- api-training-plan-gateway.spec.ts api-registration-profile-gateway.spec.ts --project desktop-chromium
```

Expected: focused gateway tests pass.

- [x] **Step 7: Run frontend typecheck and build**

Run:

```bash
rtk npm run typecheck --workspace @langchain-training/frontend
rtk npm run build --workspace @langchain-training/frontend
```

Expected: both commands exit 0.

### Task 2: Backend CORS For Direct Render API Calls

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `package-lock.json`
- Modify: `apps/backend/src/app.ts`
- Modify: `apps/backend/src/shared/http/health-routes.test.ts`

**Interfaces:**
- Consumes: browser `Origin` and `Access-Control-Request-*` preflight headers.
- Produces: CORS responses that allow API requests with `authorization` and `content-type` headers.

- [x] **Step 1: Write failing backend CORS preflight test**

Add a test that injects:

```ts
await app.inject({
  method: 'OPTIONS',
  url: '/api/auth/profile',
  headers: {
    origin: 'https://funcione.pages.dev',
    'access-control-request-method': 'PUT',
    'access-control-request-headers': 'authorization, content-type',
  },
});
```

Expected response:

```ts
assert.equal(response.statusCode, 204);
assert.equal(
  response.headers['access-control-allow-origin'],
  'https://funcione.pages.dev',
);
assert.match(
  String(response.headers['access-control-allow-headers']),
  /authorization/i,
);
```

- [x] **Step 2: Run backend health route test and verify RED**

Run:

```bash
rtk npm run build --workspace @langchain-training/backend
rtk node --test apps/backend/dist/shared/http/health-routes.test.js
```

Expected: the new CORS preflight test fails before the plugin is registered.

- [x] **Step 3: Install and register `@fastify/cors`**

Run:

```bash
rtk npm install @fastify/cors --workspace @langchain-training/backend
```

Register in `apps/backend/src/app.ts` before API routes:

```ts
await app.register(fastifyCors, {
  allowedHeaders: ['authorization', 'content-type'],
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  origin: true,
});
```

- [x] **Step 4: Run backend CORS test and verify GREEN**

Run:

```bash
rtk npm run build --workspace @langchain-training/backend
rtk node --test apps/backend/dist/shared/http/health-routes.test.js
```

Expected: the health and CORS tests pass.

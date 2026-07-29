# Deployment Automation

## Backend: Render

The backend is deployed by Render's native Git integration through `render.yaml`.

- Service: `funcione-api`
- Branch: `main`
- Trigger: `autoDeployTrigger: commit`
- Health check: `/healthz`
- Path filter: backend files, root package files, TypeScript base config, and `render.yaml`

This means backend deploys are automatic when a push to `main` changes files such as:

- `apps/backend/**`
- `package.json`
- `package-lock.json`
- `tsconfig.base.json`
- `render.yaml`

Do not add a GitHub Actions deploy hook for Render unless Render auto-deploy is intentionally disabled. Keeping Render as the backend deployment owner avoids duplicate deploys.

## Frontend: Cloudflare

The frontend deploy is handled by GitHub Actions using Wrangler.

Workflow file:

- `.github/workflows/deploy-frontend.yml`

Triggers:

- Automatic: push to `main` when frontend-related files change.
- Manual: GitHub Actions > `Deploy frontend` > `Run workflow`.

The workflow:

1. Checks out the repository.
2. Sets up Node.js `22.15.0`.
3. Runs `npm ci`.
4. Runs frontend typecheck.
5. Runs frontend production build.
6. Deploys `apps/frontend` with `cloudflare/wrangler-action`.

## Required GitHub Secrets

Add these in GitHub:

`Repository > Settings > Secrets and variables > Actions > Secrets`

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token allowed to deploy the `funcione` Worker/assets project.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID.
- `VITE_SUPABASE_URL`: Supabase project URL used by the browser app.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key used by the browser app.

## Optional GitHub Variables

Add these in GitHub:

`Repository > Settings > Secrets and variables > Actions > Variables`

- `VITE_API_BASE_URL`: backend API base URL. Defaults to `https://funcione-api.onrender.com` when omitted.
- `VITE_AUTH_REDIRECT_URL`: canonical frontend URL for social login redirects. If omitted, the app uses the current browser origin.

## Expected Flow

```text
Push to main
├─ Backend files changed -> Render deploys funcione-api
├─ Frontend files changed -> GitHub Actions deploys Cloudflare frontend
└─ Docs-only/non-matching files -> no production deploy
```

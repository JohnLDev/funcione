import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const rootUrl = new URL('../../../../../', import.meta.url);

async function readRootFile(fileName: string) {
  return readFile(new URL(fileName, rootUrl), 'utf8');
}

describe('Docker production configuration', () => {
  it('defines optimized frontend and backend runtime targets', async () => {
    const dockerfile = await readRootFile('Dockerfile');

    assert.match(dockerfile, /FROM\s+node:22-alpine\s+AS\s+deps/i);
    assert.match(dockerfile, /npm ci/i);
    assert.match(dockerfile, /AS\s+backend-runtime/i);
    assert.match(dockerfile, /AS\s+frontend-runtime/i);
    assert.match(dockerfile, /USER\s+node/i);
    assert.match(dockerfile, /nginxinc\/nginx-unprivileged/i);
    assert.doesNotMatch(dockerfile, /VITE_AUTH_MODE/);
  });

  it('keeps secrets and local artifacts out of Docker build context', async () => {
    const dockerignore = await readRootFile('.dockerignore');

    for (const pattern of [
      '.env',
      '.env.*',
      'node_modules',
      'dist',
      'playwright-report',
      '.worktrees',
    ]) {
      assert.match(dockerignore, new RegExp(`(^|\\n)${pattern.replace('.', '\\.')}(\\n|$)`));
    }
  });

  it('configures Compose services, healthchecks, and optional worker profile', async () => {
    const compose = await readRootFile('compose.yaml');

    assert.match(compose, /backend:/);
    assert.match(compose, /frontend:/);
    assert.match(compose, /worker:/);
    assert.match(compose, /target:\s+backend-runtime/);
    assert.match(compose, /target:\s+frontend-runtime/);
    assert.match(compose, /healthcheck:/);
    assert.match(compose, /profiles:\s*\n\s+- worker/);
    assert.doesNotMatch(compose, /VITE_AUTH_MODE/);
    assert.doesNotMatch(compose, /\$\{name/);
    assert.doesNotMatch(compose, /\$\{response/);
  });

  it('proxies frontend API traffic to the backend service', async () => {
    const nginxConfig = await readFile(
      new URL('../../../../frontend/nginx.conf', import.meta.url),
      'utf8',
    );

    assert.match(nginxConfig, /listen\s+8080/);
    assert.match(nginxConfig, /location\s+\/api\//);
    assert.match(nginxConfig, /proxy_pass\s+http:\/\/backend:3000\/api\//);
    assert.match(nginxConfig, /try_files\s+\$uri\s+\$uri\/\s+\/index\.html/);
  });

  it('adds root Docker workflow scripts and backend worker script', async () => {
    const rootPackageJson = JSON.parse(await readRootFile('package.json'));
    const backendPackageJson = JSON.parse(
      await readFile(new URL('../../../../backend/package.json', import.meta.url), 'utf8'),
    );

    assert.equal(rootPackageJson.scripts['docker:build'], 'docker compose build');
    assert.equal(rootPackageJson.scripts['docker:up'], 'docker compose up -d backend frontend');
    assert.equal(rootPackageJson.scripts['docker:test'], 'docker compose run --rm docker-tests');
    assert.equal(rootPackageJson.scripts['docker:down'], 'docker compose down --remove-orphans');
    assert.equal(backendPackageJson.scripts['start:worker'], 'node dist/training-worker.js');
  });
});

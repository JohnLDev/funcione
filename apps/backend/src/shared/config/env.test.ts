import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { getServerConfig, loadServerEnv } from './env.js';

test('loads monorepo root .env when backend runs from its workspace directory', async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'funcione-env-'));
  const backendDir = path.join(rootDir, 'apps', 'backend');
  const env: NodeJS.ProcessEnv = {};

  await mkdir(backendDir, { recursive: true });
  await writeFile(
    path.join(rootDir, '.env'),
    [
      'SUPABASE_URL=https://monorepo.supabase.co',
      'SUPABASE_PUBLISHABLE_KEY=publishable-key',
      '',
    ].join('\n'),
  );

  try {
    const loadedPath = loadServerEnv({ cwd: backendDir, env });

    assert.equal(loadedPath, path.join(rootDir, '.env'));
    assert.equal(env.SUPABASE_URL, 'https://monorepo.supabase.co');
    assert.equal(env.SUPABASE_PUBLISHABLE_KEY, 'publishable-key');
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

test('reads an optional positive training generation job lease from env', () => {
  assert.equal(
    getServerConfig({
      TRAINING_PLAN_JOB_LEASE_MS: '1800000',
    }).trainingPlanGenerationJobLeaseMs,
    1_800_000,
  );
  assert.equal(
    getServerConfig({
      TRAINING_PLAN_JOB_LEASE_MS: '-1',
    }).trainingPlanGenerationJobLeaseMs,
    undefined,
  );
});

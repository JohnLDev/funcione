import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getTrainingWorkerConfig,
  runTrainingGenerationWorker,
} from './training-worker.js';

describe('training generation worker', () => {
  it('uses a bounded default poll interval when env is missing or invalid', () => {
    assert.deepEqual(getTrainingWorkerConfig({}), {
      pollIntervalMs: 5_000,
      runOnce: false,
    });
    assert.deepEqual(getTrainingWorkerConfig({
      TRAINING_PLAN_WORKER_INTERVAL_MS: '-1',
      TRAINING_PLAN_WORKER_RUN_ONCE: 'false',
    }), {
      pollIntervalMs: 5_000,
      runOnce: false,
    });
  });

  it('reads worker interval and run-once mode from env', () => {
    assert.deepEqual(getTrainingWorkerConfig({
      TRAINING_PLAN_WORKER_INTERVAL_MS: '2500',
      TRAINING_PLAN_WORKER_RUN_ONCE: 'true',
    }), {
      pollIntervalMs: 2_500,
      runOnce: true,
    });
  });

  it('processes available jobs exactly once in run-once mode', async () => {
    let calls = 0;

    const result = await runTrainingGenerationWorker({
      pollIntervalMs: 1,
      processAvailableJobs: async () => {
        calls += 1;

        return [];
      },
      runOnce: true,
    });

    assert.equal(calls, 1);
    assert.deepEqual(result, { iterations: 1 });
  });
});

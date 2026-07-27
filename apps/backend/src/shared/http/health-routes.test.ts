import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from '../../app.js';

describe('health route', () => {
  it('returns a lightweight ok response', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
  });

  it('documents the health route in OpenAPI', async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/documentation/json',
    });

    assert.equal(response.statusCode, 200);
    assert.ok(response.json().paths['/healthz']);
    assert.ok(response.json().paths['/healthz'].get.responses['200']);
  });
});

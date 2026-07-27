import { expect, test } from '@playwright/test';

test.describe('Vite development server hosts', () => {
  test('allows ngrok tunnel hosts while still blocking unrelated hosts', async ({
    request,
  }) => {
    const ngrokResponse = await request.get('/', {
      headers: {
        Host: '065c-2804-14d-4037-8095-a476-dd9d-67f6-612e.ngrok-free.app',
      },
    });
    const ngrokBody = await ngrokResponse.text();

    expect(ngrokResponse.status()).toBe(200);
    expect(ngrokBody).toContain('<div id="app"></div>');
    expect(ngrokBody).not.toContain('Blocked request');

    const unrelatedHostResponse = await request.get('/', {
      headers: {
        Host: 'malicious.example.com',
      },
    });
    const unrelatedHostBody = await unrelatedHostResponse.text();

    expect(unrelatedHostResponse.status()).toBe(403);
    expect(unrelatedHostBody).toContain('Blocked request');
  });
});

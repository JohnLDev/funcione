import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const migrationUrl = new URL(
  '../../../../../../supabase/migrations/20260723220139_create_training_plan_tables.sql',
  import.meta.url,
);

async function readMigration() {
  return readFile(migrationUrl, 'utf8');
}

function getFunctionDefinition(sql: string, functionName: string) {
  const match = sql.match(
    new RegExp(
      `create or replace function public\\.${functionName}\\([\\s\\S]*?\\n\\$\\$;`,
      'i',
    ),
  );

  assert.ok(match, `Missing function public.${functionName}`);

  return match[0];
}

describe('training plan Supabase migration security', () => {
  it('keeps monthly plan and reservation tables read-only for Data API roles', async () => {
    const sql = await readMigration();

    for (const table of [
      'training_monthly_plans',
      'training_monthly_plan_generation_reservations',
    ]) {
      assert.match(
        sql,
        new RegExp(`grant\\s+select\\s+on\\s+public\\.${table}\\s+to\\s+authenticated`, 'i'),
      );
      assert.match(
        sql,
        new RegExp(
          `revoke\\s+insert,\\s*update,\\s*delete\\s+on(?:\\s+table)?\\s+public\\.${table}\\s+from\\s+public,\\s*anon,\\s*authenticated`,
          'i',
        ),
      );
      assert.doesNotMatch(
        sql,
        new RegExp(
          `grant[^;]*(?:insert|update|delete)[^;]*public\\.${table}[^;]*authenticated`,
          'i',
        ),
      );
    }
  });

  it('uses an expiring database lease and releases stale pending reservations', async () => {
    const sql = await readMigration();

    assert.match(sql, /lease_expires_at\s+timestamptz\s+not null/i);
    assert.match(sql, /lease_expires_at\s*<=\s*statement_timestamp\(\)/i);
    assert.match(sql, /interval\s+'15 minutes'/i);
  });

  it('protects every monthly write RPC with strict definer ownership', async () => {
    const sql = await readMigration();
    const functionNames = [
      'get_training_monthly_plan_generation_state',
      'reserve_training_monthly_plan_generation',
      'release_training_monthly_plan_generation',
      'complete_training_monthly_plan_generation',
    ];

    for (const functionName of functionNames) {
      const definition = getFunctionDefinition(sql, functionName);

      assert.match(definition, /security definer/i);
      assert.match(definition, /set search_path = ''/i);
      assert.match(definition, /auth\.uid\(\)/i);
    }

    for (const functionName of functionNames) {
      assert.match(
        sql,
        new RegExp(
          `revoke execute[\\s\\S]*?public\\.${functionName}\\([^;]*?from\\s+public,\\s*anon`,
          'i',
        ),
      );
      assert.match(
        sql,
        new RegExp(
          `grant execute[\\s\\S]*?public\\.${functionName}\\([^;]*?to\\s+authenticated`,
          'i',
        ),
      );
    }
  });
});

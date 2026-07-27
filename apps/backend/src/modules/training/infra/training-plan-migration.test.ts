import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const migrationsUrl = new URL(
  '../../../../../../supabase/migrations/',
  import.meta.url,
);
const baseMigrationName = '20260723220139_create_training_plan_tables.sql';
const migrationUrl = new URL(baseMigrationName, migrationsUrl);

async function readMigration() {
  return readFile(migrationUrl, 'utf8');
}

async function readForwardMigrations() {
  const fileNames = (await readdir(migrationsUrl))
    .filter((fileName) => fileName.endsWith('.sql'))
    .filter((fileName) => fileName > baseMigrationName)
    .sort();

  return Promise.all(
    fileNames.map(async (fileName) => ({
      fileName,
      sql: await readFile(new URL(fileName, migrationsUrl), 'utf8'),
    })),
  );
}

function isMonthlySecurityMigration(sql: string) {
  return /lease_expires_at\s+timestamptz/i.test(sql) &&
    /revoke\s+insert,\s*update,\s*delete/i.test(sql) &&
    /release_training_monthly_plan_generation/i.test(sql) &&
    /validate_training_monthly_plan_completion_payload/i.test(sql);
}

function isDurableGenerationJobMigration(sql: string) {
  return /training_monthly_plan_generation_jobs/i.test(sql) &&
    /claim_training_monthly_plan_generation_job/i.test(sql) &&
    /for update skip locked/i.test(sql);
}

function isDurableGenerationJobClaimHardeningMigration(sql: string) {
  return /claim_training_monthly_plan_generation_job/i.test(sql) &&
    /attempt_count\s+>=\s+job\.max_attempts/i.test(sql) &&
    /status\s*=\s*'failed'/i &&
    /released_at\s*=\s*p_claimed_at/i;
}

async function readMonthlySecurityMigrationTargets() {
  const [baseSql, forwardMigrations] = await Promise.all([
    readMigration(),
    readForwardMigrations(),
  ]);
  const securityMigration = forwardMigrations.find(({ sql }) =>
    isMonthlySecurityMigration(sql),
  );

  assert.ok(
    securityMigration,
    'Missing forward migration for existing monthly training plan deployments.',
  );

  return [
    { fileName: baseMigrationName, sql: baseSql },
    securityMigration,
  ];
}

async function readDurableGenerationJobMigration() {
  const durableMigration = (await readForwardMigrations()).find(({ sql }) =>
    isDurableGenerationJobMigration(sql),
  );

  assert.ok(
    durableMigration,
    'Missing durable monthly training generation job migration.',
  );

  return durableMigration;
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
  it('adds a forward migration for existing Supabase deployments', async () => {
    const forwardMigrations = await readForwardMigrations();
    const securityMigration = forwardMigrations.find(({ sql }) =>
      isMonthlySecurityMigration(sql),
    );

    assert.ok(
      securityMigration,
      'Missing forward migration for existing monthly training plan deployments.',
    );
  });

  it('adds a forward migration to fail exhausted durable generation jobs', async () => {
    const forwardMigrations = await readForwardMigrations();
    const hardeningMigration = forwardMigrations.find(({ sql }) =>
      isDurableGenerationJobClaimHardeningMigration(sql),
    );

    assert.ok(
      hardeningMigration,
      'Missing forward migration for exhausted durable generation jobs.',
    );
  });

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

  it('validates completion RPC payload before writing untrusted JSON', async () => {
    for (const { fileName, sql } of await readMonthlySecurityMigrationTargets()) {
      const completeDefinition = getFunctionDefinition(
        sql,
        'complete_training_monthly_plan_generation',
      );
      const validationDefinition = getFunctionDefinition(
        sql,
        'validate_training_monthly_plan_completion_payload',
      );

      assert.match(
        completeDefinition,
        /validate_training_monthly_plan_completion_payload\(/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(p_plan -> 'result'\)/i,
        fileName,
      );
      assert.match(validationDefinition, /jsonb_array_length/i, fileName);
      assert.match(validationDefinition, /duracaoTreinoMinutos/i, fileName);
      assert.match(validationDefinition, /gravidade/i, fileName);
      assert.match(validationDefinition, /p_athletic_profile/i, fileName);
    }
  });

  it('validates completion RPC enum allowlists and null-safe mirrors', async () => {
    for (const { fileName, sql } of await readMonthlySecurityMigrationTargets()) {
      const validationDefinition = getFunctionDefinition(
        sql,
        'validate_training_monthly_plan_completion_payload',
      );

      assert.match(
        validationDefinition,
        /p_plan #>> '\{snapshot,modalidade\}'[\s\S]*not in[\s\S]*'volei'[\s\S]*'beach_tenis'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /p_athletic_profile ->> 'modalidade_preferida'[\s\S]*not in[\s\S]*'volei'[\s\S]*'beach_tenis'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /p_plan #>> '\{snapshot,nivelExperiencia\}'[\s\S]*not in[\s\S]*'iniciante'[\s\S]*'profissional'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /p_plan #>> '\{snapshot,localTreino\}'[\s\S]*not in[\s\S]*'academia'[\s\S]*'ar_livre'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /objetivo\.value[\s\S]*not in[\s\S]*'performance'[\s\S]*'ganho_massa'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /equipamento\.value ->> 'tipo'[\s\S]*not in[\s\S]*'nenhum'[\s\S]*'customizado'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /lesao\.value ->> 'tipo'[\s\S]*not in[\s\S]*'joelho'[\s\S]*'customizada'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /is distinct from[\s\S]*p_athletic_profile ->> 'modalidade_preferida'/i,
        fileName,
      );
      assert.doesNotMatch(
        validationDefinition,
        /<>\s*p_athletic_profile/i,
        fileName,
      );
    }
  });

  it('validates completion RPC nested workout result item contracts', async () => {
    for (const { fileName, sql } of await readMonthlySecurityMigrationTargets()) {
      const validationDefinition = getFunctionDefinition(
        sql,
        'validate_training_monthly_plan_completion_payload',
      );

      assert.match(
        validationDefinition,
        /jsonb_array_elements\(treino\.value -> 'alongamentos'\)/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /coalesce\(trim\(alongamento\.value ->> 'nome'\), ''\) = ''/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(alongamento\.value -> 'duracaoSegundos'\) is distinct from 'number'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_array_elements\(treino\.value -> 'exercicios'\)/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /coalesce\(trim\(exercicio\.value ->> 'repeticoes'\), ''\) = ''/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(exercicio\.value -> 'series'\) is distinct from 'number'/i,
        fileName,
      );
    }
  });

  it('validates completion RPC text field types and free-text bounds', async () => {
    for (const { fileName, sql } of await readMonthlySecurityMigrationTargets()) {
      const validationDefinition = getFunctionDefinition(
        sql,
        'validate_training_monthly_plan_completion_payload',
      );

      assert.match(
        validationDefinition,
        /jsonb_typeof\(p_plan #> '\{result,resumo\}'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(treino\.value -> 'dia'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(alongamento\.value -> 'nome'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(exercicio\.value -> 'repeticoes'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(equipamento\.value -> 'descricao'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /length\(coalesce\(trim\(equipamento\.value ->> 'descricao'\), ''\)\) > 80/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(lesao\.value -> 'descricao'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /length\(coalesce\(trim\(lesao\.value ->> 'descricao'\), ''\)\) > 120/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /length\(coalesce\(trim\(lesao\.value ->> 'observacoes'\), ''\)\) > 180/i,
        fileName,
      );
    }
  });

  it('validates completion RPC metadata and model-attempt item contracts', async () => {
    for (const { fileName, sql } of await readMonthlySecurityMigrationTargets()) {
      const validationDefinition = getFunctionDefinition(
        sql,
        'validate_training_monthly_plan_completion_payload',
      );

      assert.match(
        validationDefinition,
        /jsonb_typeof\(p_plan #> '\{metadata,model\}'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(p_plan #> '\{metadata,provider\}'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_array_elements\(p_plan #> '\{metadata,attempts\}'\) as attempt\(value\)/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(attempt\.value\) is distinct from 'object'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(attempt\.value -> 'provider'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /coalesce\(trim\(attempt\.value ->> 'provider'\), ''\) = ''/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(attempt\.value -> 'model'\) is distinct from 'string'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /coalesce\(trim\(attempt\.value ->> 'model'\), ''\) = ''/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /attempt\.value ->> 'role'[\s\S]*not in \('primary', 'fallback'\)/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /attempt\.value ->> 'status'[\s\S]*not in \('success', 'error'\)/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(attempt\.value -> 'durationMs'\) is distinct from 'number'/i,
        fileName,
      );
      assert.match(
        validationDefinition,
        /jsonb_typeof\(attempt\.value -> 'error'\) is distinct from 'string'/i,
        fileName,
      );
    }
  });

  it('creates a durable monthly generation jobs table protected by RLS', async () => {
    const { sql } = await readDurableGenerationJobMigration();

    assert.match(
      sql,
      /create table if not exists public\.training_monthly_plan_generation_jobs/i,
    );
    assert.match(sql, /reservation_id\s+uuid\s+not null/i);
    assert.match(sql, /snapshot\s+jsonb\s+not null/i);
    assert.match(sql, /athletic_profile\s+jsonb\s+not null/i);
    assert.match(sql, /status\s+text\s+not null/i);
    assert.match(sql, /status[\s\S]*queued[\s\S]*running[\s\S]*completed[\s\S]*failed/i);
    assert.match(sql, /lock_expires_at\s+timestamptz/i);
    assert.match(
      sql,
      /alter table public\.training_monthly_plan_generation_jobs\s+enable row level security/i,
    );
    assert.match(
      sql,
      /grant\s+select\s+on\s+public\.training_monthly_plan_generation_jobs\s+to\s+authenticated/i,
    );
    assert.match(
      sql,
      /grant\s+all\s+on\s+public\.training_monthly_plan_generation_jobs\s+to\s+service_role/i,
    );
    assert.match(
      sql,
      /revoke\s+insert,\s*update,\s*delete\s+on(?:\s+table)?\s+public\.training_monthly_plan_generation_jobs\s+from\s+public,\s*anon,\s*authenticated/i,
    );
  });

  it('protects durable generation job RPCs with user or service-role scope', async () => {
    const { sql } = await readDurableGenerationJobMigration();
    const enqueueDefinition = getFunctionDefinition(
      sql,
      'enqueue_training_monthly_plan_generation_job',
    );
    const claimDefinition = getFunctionDefinition(
      sql,
      'claim_training_monthly_plan_generation_job',
    );
    const completeDefinition = getFunctionDefinition(
      sql,
      'complete_training_monthly_plan_generation_job',
    );
    const completeAsWorkerDefinition = getFunctionDefinition(
      sql,
      'complete_training_monthly_plan_generation_as_worker',
    );
    const failDefinition = getFunctionDefinition(
      sql,
      'fail_training_monthly_plan_generation_job',
    );

    assert.match(enqueueDefinition, /security definer/i);
    assert.match(enqueueDefinition, /auth\.uid\(\)\s+is distinct from\s+p_user_id/i);
    assert.match(claimDefinition, /for update skip locked/i);
    assert.match(claimDefinition, /status in \('queued', 'running'\)/i);
    assert.match(claimDefinition, /lock_expires_at\s+<=\s*p_claimed_at/i);
    assert.match(claimDefinition, /attempt_count\s+>=\s+job\.max_attempts/i);
    assert.match(claimDefinition, /status\s*=\s*'failed'/i);
    assert.match(claimDefinition, /released_at\s*=\s*p_claimed_at/i);
    assert.match(
      completeAsWorkerDefinition,
      /validate_training_monthly_plan_completion_payload/i,
    );
    assert.match(completeDefinition, /completed_at\s*=\s*p_completed_at/i);
    assert.match(failDefinition, /released_at\s*=\s*p_failed_at/i);

    assert.match(
      sql,
      /grant execute[\s\S]*public\.enqueue_training_monthly_plan_generation_job\([^;]*?to\s+authenticated/i,
    );

    for (const functionName of [
      'claim_training_monthly_plan_generation_job',
      'complete_training_monthly_plan_generation_job',
      'fail_training_monthly_plan_generation_job',
    ]) {
      assert.match(
        sql,
        new RegExp(
          `grant execute[\\s\\S]*public\\.${functionName}\\([^;]*?to\\s+service_role`,
          'i',
        ),
      );
      assert.match(
        sql,
        new RegExp(
          `revoke execute[\\s\\S]*public\\.${functionName}\\([^;]*?from\\s+public,\\s*anon,\\s*authenticated`,
          'i',
        ),
      );
    }
  });
});

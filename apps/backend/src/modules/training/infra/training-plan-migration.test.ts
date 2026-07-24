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
});

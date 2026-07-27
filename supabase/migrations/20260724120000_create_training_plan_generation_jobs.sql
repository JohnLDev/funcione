create table if not exists public.training_monthly_plan_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reservation_id uuid not null references public.training_monthly_plan_generation_reservations(id) on delete cascade,
  status text not null default 'queued',
  snapshot jsonb not null,
  athletic_profile jsonb not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  plan_id uuid references public.training_monthly_plans(id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint training_monthly_plan_generation_jobs_status
    check (status in ('queued', 'running', 'completed', 'failed')),
  constraint training_monthly_plan_generation_jobs_attempts
    check (attempt_count >= 0 and max_attempts > 0),
  constraint training_monthly_plan_generation_jobs_terminal_state
    check (
      (status = 'completed' and completed_at is not null and failed_at is null)
      or (status = 'failed' and failed_at is not null)
      or (status in ('queued', 'running') and completed_at is null and failed_at is null)
    )
);

create unique index if not exists training_monthly_plan_generation_jobs_reservation_key
  on public.training_monthly_plan_generation_jobs (reservation_id);

create index if not exists training_monthly_plan_generation_jobs_user_status_idx
  on public.training_monthly_plan_generation_jobs (user_id, status, created_at);

create index if not exists training_monthly_plan_generation_jobs_claim_idx
  on public.training_monthly_plan_generation_jobs (status, created_at)
  where status in ('queued', 'running');

alter table public.training_monthly_plan_generation_jobs enable row level security;

grant select on public.training_monthly_plan_generation_jobs to authenticated;
grant all on public.training_monthly_plan_generation_jobs to service_role;

revoke insert, update, delete
  on table public.training_monthly_plan_generation_jobs
  from public, anon, authenticated;

drop policy if exists "Users can select their own monthly generation jobs"
  on public.training_monthly_plan_generation_jobs;

create policy "Users can select their own monthly generation jobs"
  on public.training_monthly_plan_generation_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.enqueue_training_monthly_plan_generation_job(
  p_user_id uuid,
  p_reservation_id uuid,
  p_snapshot jsonb,
  p_athletic_profile jsonb,
  p_created_at timestamptz default statement_timestamp()
)
returns public.training_monthly_plan_generation_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  saved_job public.training_monthly_plan_generation_jobs;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'Authenticated user cannot enqueue a generation job for another user.'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.training_monthly_plan_generation_reservations as reservation
    where reservation.id = p_reservation_id
      and reservation.user_id = p_user_id
      and reservation.released_at is null
      and reservation.completed_at is null
      and reservation.lease_expires_at > p_created_at
  ) then
    return null;
  end if;

  perform public.validate_training_monthly_plan_completion_payload(
    jsonb_build_object(
      'user_id', p_user_id,
      'status', 'active',
      'generated_at', p_created_at,
      'available_for_regeneration_at', p_created_at + interval '30 days',
      'snapshot', p_snapshot,
      'result', jsonb_build_object(
        'resumo', 'validation placeholder',
        'treinos', jsonb_build_array(
          jsonb_build_object(
            'dia', 'placeholder',
            'foco', 'placeholder',
            'duracaoMinutos', p_snapshot -> 'duracaoTreinoMinutos',
            'alongamentos', jsonb_build_array(
              jsonb_build_object(
                'nome', 'placeholder',
                'duracaoSegundos', 30,
                'motivoEscolha', 'placeholder',
                'instrucoesExecucao', 'placeholder'
              )
            ),
            'exercicios', jsonb_build_array(
              jsonb_build_object(
                'nome', 'placeholder',
                'series', 1,
                'repeticoes', '1',
                'motivoEscolha', 'placeholder',
                'instrucoesExecucao', 'placeholder'
              )
            )
          ),
          jsonb_build_object(
            'dia', 'placeholder',
            'foco', 'placeholder',
            'duracaoMinutos', p_snapshot -> 'duracaoTreinoMinutos',
            'alongamentos', jsonb_build_array(
              jsonb_build_object(
                'nome', 'placeholder',
                'duracaoSegundos', 30,
                'motivoEscolha', 'placeholder',
                'instrucoesExecucao', 'placeholder'
              )
            ),
            'exercicios', jsonb_build_array(
              jsonb_build_object(
                'nome', 'placeholder',
                'series', 1,
                'repeticoes', '1',
                'motivoEscolha', 'placeholder',
                'instrucoesExecucao', 'placeholder'
              )
            )
          )
        )
      ),
      'metadata', jsonb_build_object(
        'provider', 'validation',
        'model', 'validation',
        'fallbackUsed', false,
        'durationMs', 0,
        'attempts', jsonb_build_array()
      )
    ),
    p_athletic_profile,
    p_user_id
  );

  insert into public.training_monthly_plan_generation_jobs (
    user_id,
    reservation_id,
    snapshot,
    athletic_profile,
    created_at,
    updated_at
  )
  values (
    p_user_id,
    p_reservation_id,
    p_snapshot,
    p_athletic_profile,
    p_created_at,
    p_created_at
  )
  returning * into saved_job;

  return saved_job;
end;
$$;

create or replace function public.claim_training_monthly_plan_generation_job(
  p_claimed_at timestamptz,
  p_lease_expires_at timestamptz
)
returns public.training_monthly_plan_generation_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claimed_job public.training_monthly_plan_generation_jobs;
begin
  with exhausted_jobs as (
    update public.training_monthly_plan_generation_jobs as job
    set
      status = 'failed',
      failed_at = p_claimed_at,
      error_message = 'Monthly training plan generation expired after reaching max attempts.',
      locked_at = null,
      lock_expires_at = null,
      updated_at = p_claimed_at
    where job.status = 'running'
      and job.lock_expires_at <= p_claimed_at
      and job.attempt_count >= job.max_attempts
    returning job.reservation_id
  )
  update public.training_monthly_plan_generation_reservations as reservation
  set released_at = p_claimed_at
  where reservation.id in (
      select exhausted_jobs.reservation_id
      from exhausted_jobs
    )
    and reservation.released_at is null
    and reservation.completed_at is null;

  select job.*
  into claimed_job
  from public.training_monthly_plan_generation_jobs as job
  where job.status in ('queued', 'running')
    and (
      job.status = 'queued'
      or job.lock_expires_at <= p_claimed_at
    )
    and job.attempt_count < job.max_attempts
  order by job.created_at
  for update skip locked
  limit 1;

  if claimed_job.id is null then
    return null;
  end if;

  update public.training_monthly_plan_generation_jobs
  set
    status = 'running',
    attempt_count = attempt_count + 1,
    locked_at = p_claimed_at,
    lock_expires_at = p_lease_expires_at,
    started_at = coalesce(started_at, p_claimed_at),
    updated_at = p_claimed_at
  where id = claimed_job.id
  returning * into claimed_job;

  return claimed_job;
end;
$$;

create or replace function public.complete_training_monthly_plan_generation_as_worker(
  p_reservation_id uuid,
  p_plan jsonb,
  p_athletic_profile jsonb,
  p_completed_at timestamptz default statement_timestamp()
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  reservation_user_id uuid;
  saved_plan public.training_monthly_plans;
begin
  select reservation.user_id
  into reservation_user_id
  from public.training_monthly_plan_generation_reservations as reservation
  where reservation.id = p_reservation_id
    and reservation.released_at is null
    and reservation.completed_at is null
  for update;

  if reservation_user_id is null then
    return null;
  end if;

  perform public.validate_training_monthly_plan_completion_payload(
    p_plan,
    p_athletic_profile,
    reservation_user_id
  );

  insert into public.training_athletic_profiles (
    user_id,
    modalidade_preferida,
    peso_kg,
    altura_cm,
    nivel_experiencia,
    local_treino_comum,
    equipamentos_disponiveis,
    lesoes_recorrentes,
    updated_at
  )
  values (
    reservation_user_id,
    p_athletic_profile ->> 'modalidade_preferida',
    (p_athletic_profile ->> 'peso_kg')::numeric,
    (p_athletic_profile ->> 'altura_cm')::numeric,
    p_athletic_profile ->> 'nivel_experiencia',
    p_athletic_profile ->> 'local_treino_comum',
    p_athletic_profile -> 'equipamentos_disponiveis',
    p_athletic_profile -> 'lesoes_recorrentes',
    p_completed_at
  )
  on conflict (user_id) do update set
    modalidade_preferida = excluded.modalidade_preferida,
    peso_kg = excluded.peso_kg,
    altura_cm = excluded.altura_cm,
    nivel_experiencia = excluded.nivel_experiencia,
    local_treino_comum = excluded.local_treino_comum,
    equipamentos_disponiveis = excluded.equipamentos_disponiveis,
    lesoes_recorrentes = excluded.lesoes_recorrentes,
    updated_at = excluded.updated_at;

  update public.training_monthly_plan_generation_reservations
  set completed_at = p_completed_at
  where id = p_reservation_id;

  insert into public.training_monthly_plans (
    user_id,
    status,
    generated_at,
    available_for_regeneration_at,
    snapshot,
    result,
    metadata,
    updated_at
  )
  values (
    reservation_user_id,
    'active',
    p_completed_at,
    p_completed_at + interval '30 days',
    p_plan -> 'snapshot',
    p_plan -> 'result',
    p_plan -> 'metadata',
    p_completed_at
  )
  returning * into saved_plan;

  return to_jsonb(saved_plan);
end;
$$;

create or replace function public.release_training_monthly_plan_generation_as_worker(
  p_reservation_id uuid,
  p_released_at timestamptz default statement_timestamp()
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.training_monthly_plan_generation_reservations
  set released_at = p_released_at
  where id = p_reservation_id
    and released_at is null
    and completed_at is null;
end;
$$;

create or replace function public.complete_training_monthly_plan_generation_job(
  p_generation_id uuid,
  p_plan_id uuid,
  p_completed_at timestamptz
)
returns public.training_monthly_plan_generation_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  completed_job public.training_monthly_plan_generation_jobs;
begin
  update public.training_monthly_plan_generation_jobs
  set
    status = 'completed',
    completed_at = p_completed_at,
    plan_id = p_plan_id,
    locked_at = null,
    lock_expires_at = null,
    updated_at = p_completed_at
  where id = p_generation_id
    and status = 'running'
  returning * into completed_job;

  return completed_job;
end;
$$;

create or replace function public.fail_training_monthly_plan_generation_job(
  p_generation_id uuid,
  p_error_message text,
  p_failed_at timestamptz
)
returns public.training_monthly_plan_generation_jobs
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  failed_job public.training_monthly_plan_generation_jobs;
begin
  update public.training_monthly_plan_generation_jobs
  set
    status = 'failed',
    failed_at = p_failed_at,
    error_message = p_error_message,
    locked_at = null,
    lock_expires_at = null,
    updated_at = p_failed_at
  where id = p_generation_id
    and status in ('queued', 'running')
  returning * into failed_job;

  update public.training_monthly_plan_generation_reservations
  set released_at = p_failed_at
  where id = failed_job.reservation_id
    and released_at is null
    and completed_at is null;

  return failed_job;
end;
$$;

revoke execute
  on function public.enqueue_training_monthly_plan_generation_job(uuid, uuid, jsonb, jsonb, timestamptz)
  from public, anon;

grant execute
  on function public.enqueue_training_monthly_plan_generation_job(uuid, uuid, jsonb, jsonb, timestamptz)
  to authenticated;

revoke execute
  on function public.claim_training_monthly_plan_generation_job(timestamptz, timestamptz)
  from public, anon, authenticated;

revoke execute
  on function public.complete_training_monthly_plan_generation_as_worker(uuid, jsonb, jsonb, timestamptz)
  from public, anon, authenticated;

revoke execute
  on function public.release_training_monthly_plan_generation_as_worker(uuid, timestamptz)
  from public, anon, authenticated;

revoke execute
  on function public.complete_training_monthly_plan_generation_job(uuid, uuid, timestamptz)
  from public, anon, authenticated;

revoke execute
  on function public.fail_training_monthly_plan_generation_job(uuid, text, timestamptz)
  from public, anon, authenticated;

grant execute
  on function public.claim_training_monthly_plan_generation_job(timestamptz, timestamptz)
  to service_role;

grant execute
  on function public.complete_training_monthly_plan_generation_as_worker(uuid, jsonb, jsonb, timestamptz)
  to service_role;

grant execute
  on function public.release_training_monthly_plan_generation_as_worker(uuid, timestamptz)
  to service_role;

grant execute
  on function public.complete_training_monthly_plan_generation_job(uuid, uuid, timestamptz)
  to service_role;

grant execute
  on function public.fail_training_monthly_plan_generation_job(uuid, text, timestamptz)
  to service_role;

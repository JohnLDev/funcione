create table if not exists public.training_monthly_plan_generation_attempt_logs (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.training_monthly_plan_generation_jobs(id) on delete cascade,
  attempt_number integer not null,
  provider_attempt_number integer not null,
  provider text not null,
  model text not null,
  role text not null,
  status text not null,
  duration_ms integer not null,
  error_message text,
  is_timeout boolean not null default false,
  recorded_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  constraint training_monthly_plan_generation_attempt_logs_attempts
    check (attempt_number > 0 and provider_attempt_number > 0),
  constraint training_monthly_plan_generation_attempt_logs_duration
    check (duration_ms >= 0),
  constraint training_monthly_plan_generation_attempt_logs_role
    check (role in ('primary', 'fallback')),
  constraint training_monthly_plan_generation_attempt_logs_status
    check (status in ('success', 'error')),
  constraint training_monthly_plan_generation_attempt_logs_error_state
    check (
      (status = 'success' and error_message is null)
      or status = 'error'
    )
);

create index if not exists training_monthly_plan_generation_attempt_logs_generation_idx
  on public.training_monthly_plan_generation_attempt_logs (
    generation_id,
    attempt_number,
    provider_attempt_number
  );

create index if not exists training_monthly_plan_generation_attempt_logs_status_idx
  on public.training_monthly_plan_generation_attempt_logs (
    status,
    is_timeout,
    recorded_at
  );

alter table public.training_monthly_plan_generation_attempt_logs enable row level security;

revoke all
  on table public.training_monthly_plan_generation_attempt_logs
  from public, anon, authenticated;

grant all on public.training_monthly_plan_generation_attempt_logs to service_role;

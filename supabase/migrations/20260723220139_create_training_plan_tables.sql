create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  cpf text not null,
  birth_date date not null,
  phone_number text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_athletic_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  modalidade_preferida text not null,
  peso_kg numeric not null,
  altura_cm numeric not null,
  nivel_experiencia text not null,
  local_treino_comum text not null,
  equipamentos_disponiveis jsonb not null default '[]'::jsonb,
  lesoes_recorrentes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'expired')),
  generated_at timestamptz not null,
  available_for_regeneration_at timestamptz not null,
  snapshot jsonb not null,
  result jsonb not null,
  metadata jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_monthly_plan_generation_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reserved_at timestamptz not null,
  lease_expires_at timestamptz not null,
  released_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint training_monthly_plan_generation_reservations_valid_lease
    check (lease_expires_at > reserved_at),
  constraint training_monthly_plan_generation_reservations_terminal_state
    check (released_at is null or completed_at is null)
);

create unique index if not exists training_monthly_plans_one_active_per_user
  on public.training_monthly_plans (user_id)
  where status = 'active';

create unique index if not exists training_monthly_plan_reservations_one_pending_per_user
  on public.training_monthly_plan_generation_reservations (user_id)
  where released_at is null and completed_at is null;

alter table public.user_profiles enable row level security;
alter table public.training_athletic_profiles enable row level security;
alter table public.training_monthly_plans enable row level security;
alter table public.training_monthly_plan_generation_reservations
  enable row level security;

grant select, insert, update on public.user_profiles to authenticated;
grant select, insert, update on public.training_athletic_profiles to authenticated;
grant select on public.training_monthly_plans to authenticated;
grant select on public.training_monthly_plan_generation_reservations to authenticated;

revoke insert, update, delete
  on table public.training_monthly_plans
  from public, anon, authenticated;
revoke insert, update, delete
  on table public.training_monthly_plan_generation_reservations
  from public, anon, authenticated;

create policy "Users can select their own registration profile"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own registration profile"
  on public.user_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own registration profile"
  on public.user_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can select their own athletic profile"
  on public.training_athletic_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own athletic profile"
  on public.training_athletic_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own athletic profile"
  on public.training_athletic_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can select their own monthly plans"
  on public.training_monthly_plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can select their own monthly plan reservations"
  on public.training_monthly_plan_generation_reservations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.get_training_monthly_plan_generation_state(
  p_user_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  operation_time timestamptz := statement_timestamp();
begin
  if caller_user_id is null or caller_user_id <> p_user_id then
    raise exception 'Training plan state can only be read by its owner.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  update public.training_monthly_plans
  set
    status = 'expired',
    updated_at = operation_time
  where user_id = p_user_id
    and status = 'active'
    and available_for_regeneration_at <= operation_time;

  update public.training_monthly_plan_generation_reservations
  set released_at = operation_time
  where user_id = p_user_id
    and released_at is null
    and completed_at is null
    and lease_expires_at <= statement_timestamp();

  return (
    select jsonb_build_object(
      'active_plan', (
        select to_jsonb(plan_row)
        from public.training_monthly_plans as plan_row
        where plan_row.user_id = p_user_id
          and plan_row.status = 'active'
        limit 1
      ),
      'has_pending_generation', exists (
        select 1
        from public.training_monthly_plan_generation_reservations as reservation
        where reservation.user_id = p_user_id
          and reservation.released_at is null
          and reservation.completed_at is null
      )
    )
  );
end;
$$;

drop function if exists public.reserve_training_monthly_plan_generation(
  uuid,
  timestamptz
);

create or replace function public.reserve_training_monthly_plan_generation(
  p_user_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  operation_time timestamptz := statement_timestamp();
  reservation_id uuid;
begin
  if caller_user_id is null or caller_user_id <> p_user_id then
    raise exception 'Training plan generation can only be reserved by its owner.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  update public.training_monthly_plans
  set
    status = 'expired',
    updated_at = operation_time
  where user_id = p_user_id
    and status = 'active'
    and available_for_regeneration_at <= operation_time;

  update public.training_monthly_plan_generation_reservations
  set released_at = operation_time
  where user_id = p_user_id
    and released_at is null
    and completed_at is null
    and lease_expires_at <= statement_timestamp();

  if exists (
    select 1
    from public.training_monthly_plans as plan_row
    where plan_row.user_id = p_user_id
      and plan_row.status = 'active'
  ) or exists (
    select 1
    from public.training_monthly_plan_generation_reservations as reservation
    where reservation.user_id = p_user_id
      and reservation.released_at is null
      and reservation.completed_at is null
  ) then
    return null;
  end if;

  insert into public.training_monthly_plan_generation_reservations (
    user_id,
    reserved_at,
    lease_expires_at
  )
  values (
    p_user_id,
    operation_time,
    operation_time + interval '15 minutes'
  )
  returning id into reservation_id;

  return reservation_id;
end;
$$;

create or replace function public.release_training_monthly_plan_generation(
  p_reservation_id uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  reservation_user_id uuid;
begin
  if caller_user_id is null then
    raise exception 'Authentication is required to release training plan generation.'
      using errcode = '42501';
  end if;

  select reservation.user_id
  into reservation_user_id
  from public.training_monthly_plan_generation_reservations as reservation
  where reservation.id = p_reservation_id
    and reservation.user_id = caller_user_id;

  if reservation_user_id is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(reservation_user_id::text, 0)
  );

  update public.training_monthly_plan_generation_reservations
  set released_at = statement_timestamp()
  where id = p_reservation_id
    and user_id = caller_user_id
    and released_at is null
    and completed_at is null;

  return found;
end;
$$;

create or replace function public.complete_training_monthly_plan_generation(
  p_reservation_id uuid,
  p_plan jsonb,
  p_athletic_profile jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_user_id uuid := (select auth.uid());
  reservation_user_id uuid;
  saved_plan public.training_monthly_plans;
  completion_time timestamptz := statement_timestamp();
begin
  if caller_user_id is null then
    raise exception 'Authentication is required to complete training plan generation.'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(caller_user_id::text, 0)
  );

  update public.training_monthly_plan_generation_reservations
  set released_at = completion_time
  where user_id = caller_user_id
    and released_at is null
    and completed_at is null
    and lease_expires_at <= statement_timestamp();

  select reservation.user_id
  into reservation_user_id
  from public.training_monthly_plan_generation_reservations as reservation
  where reservation.id = p_reservation_id
    and reservation.user_id = caller_user_id
    and reservation.released_at is null
    and reservation.completed_at is null
    and reservation.lease_expires_at > completion_time
  for update;

  if reservation_user_id is null then
    return null;
  end if;

  if (p_plan ->> 'user_id')::uuid <> reservation_user_id
    or p_plan ->> 'status' <> 'active'
    or p_plan #>> '{snapshot,userId}' <> reservation_user_id::text then
    raise exception 'Training plan does not match its reservation.'
      using errcode = '22023';
  end if;

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
    completion_time
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
  set completed_at = completion_time
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
    completion_time,
    completion_time + interval '30 days',
    p_plan -> 'snapshot',
    p_plan -> 'result',
    p_plan -> 'metadata',
    completion_time
  )
  returning * into saved_plan;

  return to_jsonb(saved_plan);
end;
$$;

revoke execute
  on function public.get_training_monthly_plan_generation_state(uuid)
  from public, anon;
revoke execute
  on function public.reserve_training_monthly_plan_generation(uuid)
  from public, anon;
revoke execute
  on function public.release_training_monthly_plan_generation(uuid)
  from public, anon;
revoke execute
  on function public.complete_training_monthly_plan_generation(uuid, jsonb, jsonb)
  from public, anon;

grant execute
  on function public.get_training_monthly_plan_generation_state(uuid)
  to authenticated;
grant execute
  on function public.reserve_training_monthly_plan_generation(uuid)
  to authenticated;
grant execute
  on function public.release_training_monthly_plan_generation(uuid)
  to authenticated;
grant execute
  on function public.complete_training_monthly_plan_generation(uuid, jsonb, jsonb)
  to authenticated;

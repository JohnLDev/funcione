alter table public.training_monthly_plan_generation_reservations
  add column if not exists lease_expires_at timestamptz;

update public.training_monthly_plan_generation_reservations
set lease_expires_at = reserved_at + interval '15 minutes'
where lease_expires_at is null;

alter table public.training_monthly_plan_generation_reservations
  alter column lease_expires_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'training_monthly_plan_generation_reservations_valid_lease'
      and conrelid = 'public.training_monthly_plan_generation_reservations'::regclass
  ) then
    alter table public.training_monthly_plan_generation_reservations
      add constraint training_monthly_plan_generation_reservations_valid_lease
        check (lease_expires_at > reserved_at);
  end if;
end;
$$;

drop policy if exists "Users can insert their own monthly plans"
  on public.training_monthly_plans;
drop policy if exists "Users can update their own monthly plans"
  on public.training_monthly_plans;
drop policy if exists "Users can insert their own monthly plan reservations"
  on public.training_monthly_plan_generation_reservations;
drop policy if exists "Users can update their own monthly plan reservations"
  on public.training_monthly_plan_generation_reservations;

grant select on public.training_monthly_plans to authenticated;
grant select on public.training_monthly_plan_generation_reservations to authenticated;

revoke insert, update, delete
  on table public.training_monthly_plans
  from public, anon, authenticated;
revoke insert, update, delete
  on table public.training_monthly_plan_generation_reservations
  from public, anon, authenticated;

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

create or replace function public.validate_training_monthly_plan_completion_payload(
  p_plan jsonb,
  p_athletic_profile jsonb,
  p_user_id uuid
)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  treino_count integer;
  objetivo_count integer;
  equipamento_count integer;
  lesao_count integer;
begin
  if jsonb_typeof(p_plan) is distinct from 'object'
    or jsonb_typeof(p_plan -> 'result') is distinct from 'object'
    or jsonb_typeof(p_plan -> 'snapshot') is distinct from 'object'
    or jsonb_typeof(p_plan -> 'metadata') is distinct from 'object'
    or jsonb_typeof(p_athletic_profile) is distinct from 'object' then
    raise exception 'Training plan completion payload is invalid.'
      using errcode = '22023';
  end if;

  if (p_plan ->> 'user_id')::uuid <> p_user_id
    or p_plan ->> 'status' <> 'active'
    or p_plan #>> '{snapshot,userId}' <> p_user_id::text then
    raise exception 'Training plan does not match its reservation.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_plan #> '{metadata,attempts}') is distinct from 'array'
    or jsonb_typeof(p_plan #> '{metadata,durationMs}') is distinct from 'number'
    or jsonb_typeof(p_plan #> '{metadata,fallbackUsed}') is distinct from 'boolean'
    or coalesce(trim(p_plan #>> '{metadata,model}'), '') = ''
    or coalesce(trim(p_plan #>> '{metadata,provider}'), '') = '' then
    raise exception 'Training plan metadata is invalid.'
      using errcode = '22023';
  end if;

  if coalesce(trim(p_plan #>> '{result,resumo}'), '') = ''
    or jsonb_typeof(p_plan #> '{result,treinos}') is distinct from 'array' then
    raise exception 'Training plan result is invalid.'
      using errcode = '22023';
  end if;

  treino_count := jsonb_array_length(p_plan #> '{result,treinos}');

  if treino_count < 2 or treino_count > 7 then
    raise exception 'Training plan session count is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_plan #> '{result,treinos}') as treino(value)
    where coalesce(trim(treino.value ->> 'dia'), '') = ''
      or coalesce(trim(treino.value ->> 'foco'), '') = ''
      or jsonb_typeof(treino.value -> 'duracaoMinutos') is distinct from 'number'
      or jsonb_typeof(treino.value -> 'alongamentos') is distinct from 'array'
      or jsonb_typeof(treino.value -> 'exercicios') is distinct from 'array'
  ) then
    raise exception 'Training plan sessions are invalid.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_plan #> '{snapshot,objetivos}') is distinct from 'array'
    or jsonb_typeof(p_plan #> '{snapshot,equipamentos}') is distinct from 'array'
    or jsonb_typeof(p_plan #> '{snapshot,lesoes}') is distinct from 'array'
    or (p_plan #>> '{snapshot,duracaoTreinoMinutos}')::integer
      not in (30, 45, 60, 75, 90)
    or (p_plan #>> '{snapshot,pesoKg}')::numeric
      <> (p_athletic_profile ->> 'peso_kg')::numeric
    or (p_plan #>> '{snapshot,alturaCm}')::numeric
      <> (p_athletic_profile ->> 'altura_cm')::numeric
    or p_plan #>> '{snapshot,modalidade}'
      <> p_athletic_profile ->> 'modalidade_preferida'
    or p_plan #>> '{snapshot,nivelExperiencia}'
      <> p_athletic_profile ->> 'nivel_experiencia'
    or p_plan #>> '{snapshot,localTreino}'
      <> p_athletic_profile ->> 'local_treino_comum'
    or p_plan #> '{snapshot,equipamentos}'
      <> p_athletic_profile -> 'equipamentos_disponiveis'
    or p_plan #> '{snapshot,lesoes}'
      <> p_athletic_profile -> 'lesoes_recorrentes' then
    raise exception 'Training plan snapshot is invalid.'
      using errcode = '22023';
  end if;

  objetivo_count := jsonb_array_length(p_plan #> '{snapshot,objetivos}');
  equipamento_count := jsonb_array_length(p_plan #> '{snapshot,equipamentos}');
  lesao_count := jsonb_array_length(p_plan #> '{snapshot,lesoes}');

  if objetivo_count < 1 or objetivo_count > 5
    or equipamento_count < 1 or equipamento_count > 11
    or lesao_count > 7 then
    raise exception 'Training plan snapshot collections are invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_plan #> '{snapshot,objetivos}') as objetivo(value)
    group by objetivo.value
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_plan #> '{snapshot,equipamentos}') as equipamento(value)
    group by equipamento.value ->> 'tipo'
    having count(*) > 1
  ) or exists (
    select 1
    from jsonb_array_elements(p_plan #> '{snapshot,lesoes}') as lesao(value)
    group by lesao.value ->> 'tipo'
    having count(*) > 1
  ) then
    raise exception 'Training plan snapshot collections must be unique.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_plan #> '{snapshot,equipamentos}') as equipamento(value)
    where coalesce(equipamento.value ->> 'tipo', '') = ''
      or (
        equipamento.value ->> 'tipo' = 'customizado'
        and coalesce(trim(equipamento.value ->> 'descricao'), '') = ''
      )
  ) or (
    equipamento_count > 1
    and exists (
      select 1
      from jsonb_array_elements(p_plan #> '{snapshot,equipamentos}') as equipamento(value)
      where equipamento.value ->> 'tipo' = 'nenhum'
    )
  ) then
    raise exception 'Training plan equipment is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_plan #> '{snapshot,lesoes}') as lesao(value)
    where lesao.value ->> 'gravidade' not in ('leve', 'moderada', 'alta')
      or coalesce(lesao.value ->> 'tipo', '') = ''
      or (
        lesao.value ->> 'tipo' = 'customizada'
        and coalesce(trim(lesao.value ->> 'descricao'), '') = ''
      )
  ) then
    raise exception 'Training plan injuries are invalid.'
      using errcode = '22023';
  end if;
exception
  when invalid_text_representation
    or invalid_parameter_value
    or numeric_value_out_of_range then
    raise exception 'Training plan completion payload is invalid.'
      using errcode = '22023';
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
  on function public.validate_training_monthly_plan_completion_payload(jsonb, jsonb, uuid)
  from public, anon, authenticated;
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

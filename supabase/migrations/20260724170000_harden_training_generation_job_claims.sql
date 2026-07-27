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

revoke execute
  on function public.claim_training_monthly_plan_generation_job(timestamptz, timestamptz)
  from public, anon, authenticated;

grant execute
  on function public.claim_training_monthly_plan_generation_job(timestamptz, timestamptz)
  to service_role;

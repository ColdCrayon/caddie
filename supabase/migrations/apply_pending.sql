-- =============================================================
-- Caddie — pending migrations (safe to run multiple times)
-- Covers: 002_golf_api + 003_pin_position
-- Paste this entire file into Supabase SQL Editor and run it.
-- =============================================================

-- ── 002: Golf Course API fields ───────────────────────────────
alter table public.courses
  add column if not exists slope_rating  jsonb    default '{}',
  add column if not exists course_rating jsonb    default '{}',
  add column if not exists api_course_id integer;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'courses'
      and policyname = 'courses_update'
  ) then
    execute '
      create policy courses_update on public.courses
      for update using (auth.role() = ''authenticated'')
    ';
  end if;
end;
$$;

-- ── 003: Pin position per hole ────────────────────────────────
alter table public.holes_played
  add column if not exists pin_position varchar(10);

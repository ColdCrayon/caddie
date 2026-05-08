-- Add Golf Course API fields to courses table
alter table public.courses
  add column if not exists slope_rating jsonb default '{}',
  add column if not exists course_rating jsonb default '{}',
  add column if not exists api_course_id integer;

-- Allow authenticated users to update course rows (e.g. enriching cached data)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'courses' and policyname = 'courses_update'
  ) then
    execute 'create policy courses_update on public.courses
             for update using (auth.role() = ''authenticated'')';
  end if;
end;
$$;

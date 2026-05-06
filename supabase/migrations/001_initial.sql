-- Users profile (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  handicap_index numeric(4,1),
  home_course_id uuid,
  created_at timestamptz default now()
);

-- Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text default '',
  google_place_id text unique,
  lat numeric(10,7),
  lng numeric(10,7),
  holes jsonb not null default '[]',
  tee_options jsonb default '["black","blue","white","red"]',
  created_at timestamptz default now()
);

-- Rounds
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid references public.courses(id),
  date timestamptz default now(),
  tee_color text default 'white',
  weather_conditions jsonb,
  total_score integer default 0,
  score_differential numeric(5,2),
  notes text default '',
  completed boolean default false,
  created_at timestamptz default now()
);

-- Holes played per round
create table if not exists public.holes_played (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds(id) on delete cascade,
  hole_number integer not null,
  par integer not null,
  yardage integer default 0,
  strokes integer default 0,
  putts integer default 0,
  fairway_hit boolean default false,
  gir boolean default false,
  sand_save boolean default false,
  score_label text default 'Par'
);

-- Shots
create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.rounds(id) on delete cascade,
  hole_played_id uuid references public.holes_played(id) on delete cascade,
  club text not null,
  lie text,
  distance_to_pin integer,
  wind_speed numeric(5,1) default 0,
  wind_direction numeric(5,1) default 0,
  elevation_change numeric(5,1) default 0,
  carry_distance integer,
  result text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  ai_advice text,
  created_at timestamptz default now()
);

-- Swings
create table if not exists public.swings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  video_url text,
  club text,
  date timestamptz default now(),
  ai_analysis jsonb,
  rating integer default 0 check (rating between 0 and 5),
  notes text default '',
  created_at timestamptz default now()
);

-- Groups
create table if not exists public.group_info (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_token text unique not null,
  created_by uuid references public.users(id),
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_info(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

create table if not exists public.group_round_links (
  group_id uuid references public.group_info(id) on delete cascade,
  round_id uuid references public.rounds(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (group_id, round_id)
);

create table if not exists public.group_posts (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.rounds(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- Course game plans
create table if not exists public.course_game_plans (
  id uuid primary key default gen_random_uuid(),
  course_id uuid unique references public.courses(id) on delete cascade,
  holes jsonb not null default '[]',
  generated_at timestamptz default now()
);

-- AI digests
create table if not exists public.digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  generated_at timestamptz default now()
);

-- Enable realtime
alter publication supabase_realtime add table public.rounds;
alter publication supabase_realtime add table public.holes_played;
alter publication supabase_realtime add table public.group_posts;

-- RLS
alter table public.users enable row level security;
alter table public.rounds enable row level security;
alter table public.holes_played enable row level security;
alter table public.shots enable row level security;
alter table public.swings enable row level security;
alter table public.digests enable row level security;
alter table public.courses enable row level security;
alter table public.course_game_plans enable row level security;
alter table public.group_info enable row level security;
alter table public.group_members enable row level security;
alter table public.group_round_links enable row level security;
alter table public.group_posts enable row level security;

-- Users: own data only
create policy "users_own" on public.users for all using (auth.uid() = id) with check (auth.uid() = id);

-- Rounds: own only
create policy "rounds_own" on public.rounds for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Holes played: via round ownership
create policy "holes_played_own" on public.holes_played for all
  using (round_id in (select id from public.rounds where user_id = auth.uid()))
  with check (round_id in (select id from public.rounds where user_id = auth.uid()));

-- Shots: via round ownership
create policy "shots_own" on public.shots for all
  using (round_id in (select id from public.rounds where user_id = auth.uid()));

-- Swings: own only
create policy "swings_own" on public.swings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Digests: own only
create policy "digests_own" on public.digests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Courses: readable by all authenticated, writable by anyone (community data)
create policy "courses_read" on public.courses for select using (auth.role() = 'authenticated');
create policy "courses_insert" on public.courses for insert with check (auth.role() = 'authenticated');

-- Course game plans: readable by all authenticated
create policy "game_plans_read" on public.course_game_plans for select using (auth.role() = 'authenticated');
create policy "game_plans_write" on public.course_game_plans for all with check (auth.role() = 'authenticated');

-- Group info: readable by members
create policy "group_info_read" on public.group_info for select
  using (id in (select group_id from public.group_members where user_id = auth.uid()));
create policy "group_info_insert" on public.group_info for insert with check (auth.role() = 'authenticated');

-- Group members: readable by group members
create policy "group_members_read" on public.group_members for select
  using (group_id in (select group_id from public.group_members where user_id = auth.uid()));
create policy "group_members_insert" on public.group_members for insert with check (auth.role() = 'authenticated');

-- Group posts: readable/writable by group members
create policy "group_posts_read" on public.group_posts for select using (auth.role() = 'authenticated');
create policy "group_posts_insert" on public.group_posts for insert with check (auth.uid() = user_id);

-- Group round links
create policy "group_round_links_read" on public.group_round_links for select using (auth.role() = 'authenticated');
create policy "group_round_links_write" on public.group_round_links for all with check (auth.uid() = user_id);

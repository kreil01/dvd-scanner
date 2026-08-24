-- Heimwerk Planung 1A-1D
alter table public.tasks add column if not exists estimated_hours numeric(6,2);

create table if not exists public.planning_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_tasks_per_day integer not null default 3 check (max_tasks_per_day between 1 and 20),
  max_hours_per_day numeric(6,2) not null default 4 check (max_hours_per_day > 0 and max_hours_per_day <= 24),
  updated_at timestamptz not null default now()
);
create table if not exists public.blocked_periods (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, start_date date not null, end_date date not null, created_at timestamptz not null default now(),
  constraint blocked_period_dates check (end_date >= start_date)
);
create index if not exists blocked_periods_user_dates_idx on public.blocked_periods(user_id,start_date,end_date);
alter table public.planning_settings enable row level security;
alter table public.blocked_periods enable row level security;
DO $$ BEGIN create policy "planning_settings_own_rows" on public.planning_settings for all using (auth.uid()=user_id) with check (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN create policy "blocked_periods_own_rows" on public.blocked_periods for all using (auth.uid()=user_id) with check (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Heimwerk v0.3.0: Persistenz für Vorhaben, Aufgaben, Erinnerungen/Termine und Links
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'other',
  title text not null,
  description text,
  goal text,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'new' check (status in ('new','planning','doing','done')),
  end_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','progress','done')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  due_date date,
  source text not null default 'manual' check (source in ('manual','ai')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  start_date date not null,
  time time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint reminder_exactly_one_reference check ((project_id is not null) <> (task_id is not null))
);

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  title text not null,
  url text not null,
  link_type text not null default 'other' check (link_type in ('shopping','info','video','document','other')),
  created_at timestamptz not null default now(),
  constraint link_exactly_one_reference check ((project_id is not null) <> (task_id is not null))
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists tasks_user_project_idx on public.tasks(user_id, project_id);
create index if not exists tasks_due_date_idx on public.tasks(user_id, due_date);
create index if not exists projects_end_date_idx on public.projects(user_id, end_date);
create index if not exists reminders_start_date_idx on public.reminders(user_id, start_date);
create index if not exists links_user_project_idx on public.links(user_id, project_id);
create index if not exists links_user_task_idx on public.links(user_id, task_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.links enable row level security;

-- idempotent policy creation
DO $$ BEGIN
  create policy "projects_own_rows" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "tasks_own_rows" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "reminders_own_rows" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  create policy "links_own_rows" on public.links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

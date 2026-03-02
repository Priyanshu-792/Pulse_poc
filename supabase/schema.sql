-- ============================================================
-- PULSE AI Coaching Platform - Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ---- PROFILES ----
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  role        text not null default 'EMPLOYEE' check (role in ('EMPLOYEE', 'ADMIN')),
  department  text,
  job_title   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---- SESSIONS ----
create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  phase           text not null default 'CHECKIN'
                  check (phase in ('CHECKIN','WORK_WORKLOAD','TEAM_CULTURE','GROWTH_ASPIRATIONS','CLOSING_ACTION','COMPLETED')),
  status          text not null default 'IN_PROGRESS'
                  check (status in ('IN_PROGRESS','COMPLETED','ABANDONED')),
  started_at      timestamptz default now(),
  completed_at    timestamptz,
  transcript      text,
  summary         text,
  sentiment_score float check (sentiment_score >= 0 and sentiment_score <= 1),
  mood_score      int check (mood_score >= 1 and mood_score <= 10),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---- ACTIONS ----
create table if not exists public.actions (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid references public.sessions(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  text         text not null,
  completed    boolean default false,
  due_date     timestamptz,
  completed_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ---- SESSION INSIGHTS (anonymized for admin) ----
create table if not exists public.session_insights (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions(id) on delete cascade not null,
  theme       text not null,
  sentiment   text not null check (sentiment in ('positive','neutral','negative')),
  department  text,
  week        int not null,
  year        int not null,
  created_at  timestamptz default now()
);

-- ---- DOCUMENTS ----
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade not null,
  name         text not null,
  storage_path text not null,
  content_type text,
  size         bigint,
  created_at   timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.sessions        enable row level security;
alter table public.actions         enable row level security;
alter table public.session_insights enable row level security;
alter table public.documents       enable row level security;

-- Helper function: checks current user's role WITHOUT triggering RLS (security definer)
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Profiles
create policy "Own profile full access"
  on public.profiles for all using (auth.uid() = id);

create policy "Admin view all profiles"
  on public.profiles for select
  using (public.get_my_role() = 'ADMIN');

-- Sessions
create policy "Users manage own sessions"
  on public.sessions for all using (auth.uid() = user_id);

create policy "Admin view all sessions"
  on public.sessions for select
  using (public.get_my_role() = 'ADMIN');

-- Actions
create policy "Users manage own actions"
  on public.actions for all using (auth.uid() = user_id);

-- Session Insights
create policy "Users insert own insights"
  on public.session_insights for insert
  with check (exists (select 1 from public.sessions where id = session_id and user_id = auth.uid()));

create policy "Admin view all insights"
  on public.session_insights for select
  using (public.get_my_role() = 'ADMIN');

-- Documents
create policy "Users manage own documents"
  on public.documents for all using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- Run in Supabase Dashboard > Storage > New Bucket
-- ============================================================
-- Bucket: 'documents' (private, 10MB max)
-- Bucket: 'transcripts' (private, 5MB max)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 10485760,
   array['application/pdf','image/png','image/jpeg','text/plain',
         'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('transcripts', 'transcripts', false, 5242880, array['text/plain'])
on conflict (id) do nothing;

-- Storage RLS
create policy "Users access own documents"
  on storage.objects for all
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users access own transcripts"
  on storage.objects for all
  using (bucket_id = 'transcripts' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- HELPER VIEWS FOR ADMIN (fully anonymized)
-- ============================================================
create or replace view public.admin_session_stats as
select
  p.department,
  date_trunc('week', s.started_at) as week,
  count(*)                          as session_count,
  avg(s.mood_score)                 as avg_mood,
  avg(s.sentiment_score)            as avg_sentiment
from public.sessions s
join public.profiles p on p.id = s.user_id
where s.status = 'COMPLETED'
group by p.department, date_trunc('week', s.started_at);

-- Seed: Make a user admin (run after signup)
-- update public.profiles set role = 'ADMIN' where id = '<user-uuid>';

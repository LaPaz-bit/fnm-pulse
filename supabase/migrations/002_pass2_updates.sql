-- ============================================================
-- FNM Pulse — Pass 2 Migration
-- Run this AFTER 001_pass1_updates.sql in the Supabase SQL Editor.
-- ============================================================

-- ── goals: link back to the original proposal post ──────────
alter table public.goals
  add column if not exists post_id uuid references public.posts(id) on delete set null;

create index if not exists goals_post_id_idx on public.goals(post_id);

-- ── goal_updates: mark completion + support challenge updates ─
alter table public.goal_updates
  add column if not exists is_completion boolean not null default false,
  add column if not exists challenge_id  uuid references public.challenges(id) on delete cascade;

-- challenge_id is required OR goal_id is required (not both null)
alter table public.goal_updates
  drop constraint if exists goal_updates_requires_target;

alter table public.goal_updates
  add constraint goal_updates_requires_target
  check (goal_id is not null or challenge_id is not null);

create index if not exists goal_updates_challenge_id_idx on public.goal_updates(challenge_id);

-- ── challenge_members ────────────────────────────────────────
create table if not exists public.challenge_members (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id)   on delete cascade,
  joined_at    timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists challenge_members_user_id_idx on public.challenge_members(user_id);

alter table public.challenge_members enable row level security;

create policy "Challenge members viewable by everyone"
  on public.challenge_members for select using (true);

create policy "Authenticated users can join challenges"
  on public.challenge_members for insert with check (auth.uid() = user_id);

create policy "Members can leave challenges"
  on public.challenge_members for delete using (auth.uid() = user_id);

-- ── goal_updates RLS (add if not already present) ────────────
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'goal_updates' and policyname = 'Authenticated users can log goal updates'
  ) then
    create policy "Authenticated users can log goal updates"
      on public.goal_updates for insert with check (auth.uid() = user_id);
  end if;
end $$;

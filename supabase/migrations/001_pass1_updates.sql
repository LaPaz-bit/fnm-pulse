-- ============================================================
-- FNM Pulse — Pass 1 Migration
-- Run this AFTER schema.sql in the Supabase SQL Editor.
-- ============================================================

-- ── profiles: track onboarding status ───────────────────────
alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- ── posts: goal proposal, wins wall, pinned, link preview ───
alter table public.posts
  add column if not exists is_goal_proposal boolean not null default false,
  add column if not exists is_win          boolean not null default false,
  add column if not exists is_pinned       boolean not null default false,
  add column if not exists link_preview    jsonb;

-- Indexes for common query patterns
create index if not exists posts_is_pinned_idx     on public.posts(is_pinned) where is_pinned = true;
create index if not exists posts_is_goal_proposal_idx on public.posts(is_goal_proposal) where is_goal_proposal = true;
create index if not exists posts_is_win_idx        on public.posts(is_win) where is_win = true;

-- ── encouragement_badges: add post_id + unique per user/post ─
alter table public.encouragement_badges
  add column if not exists post_id uuid references public.posts(id) on delete cascade;

create index if not exists enc_badges_post_id_idx on public.encouragement_badges(post_id);

-- One encouragement badge per user per post
create unique index if not exists enc_badges_unique_user_post
  on public.encouragement_badges(from_user_id, post_id)
  where post_id is not null;

-- ── RLS policy update for encouragement_badges ──────────────
-- Allow reading all badges (for counts on posts)
drop policy if exists "Encouragement badges viewable by sender and recipient" on public.encouragement_badges;

create policy "Encouragement badges viewable by everyone"
  on public.encouragement_badges for select using (true);


-- ============================================================
-- STORAGE SETUP
-- Run these in Supabase Dashboard → Storage, OR via SQL below.
-- ============================================================

-- Create storage buckets (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Storage RLS: avatars
create policy "Avatar images are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: post-media
create policy "Post media is publicly viewable"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "Users can upload post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own post media"
  on storage.objects for delete
  using (
    bucket_id = 'post-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

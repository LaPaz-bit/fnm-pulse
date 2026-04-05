-- ============================================================
-- FNM Pulse — Pass 3 Migration
-- Run this AFTER 002_pass2_updates.sql in the Supabase SQL Editor.
-- ============================================================

-- ── Seed milestone badges ────────────────────────────────────
insert into public.badges (name, description, criteria) values
  ('first_post',      'First Post',        'Create your first post in the community'),
  ('first_win',       'First Win',         'Share your first win on the Wins Wall'),
  ('goal_joiner',     'Team Player',       'Join 3 goals or challenges'),
  ('goal_completer',  'Finisher',          'Complete a goal or challenge'),
  ('milestone_25',    '25 Posts Strong',   'Reach 25 total posts'),
  ('top_encourager',  'Top Encourager',    'Be the community''s top encourager this week')
on conflict (name) do nothing;

-- ── Leaderboard RPC functions ────────────────────────────────

-- 1. Most posts
create or replace function public.get_top_posters(lim int default 20)
returns table(
  user_id      uuid,
  display_name text,
  avatar_url   text,
  username     text,
  score        bigint
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id          as user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    count(posts.id) as score
  from public.profiles p
  left join public.posts on posts.author_id = p.id
  group by p.id, p.display_name, p.avatar_url, p.username
  order by score desc
  limit lim;
$$;

-- 2. Most goal/challenge completions
create or replace function public.get_top_completers(lim int default 20)
returns table(
  user_id      uuid,
  display_name text,
  avatar_url   text,
  username     text,
  score        bigint
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id          as user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    count(gu.id) as score
  from public.profiles p
  left join public.goal_updates gu
    on gu.user_id = p.id and gu.is_completion = true
  group by p.id, p.display_name, p.avatar_url, p.username
  order by score desc
  limit lim;
$$;

-- 3. Most encouraging (reactions given + encouragement badges sent)
create or replace function public.get_top_encouragers(lim int default 20)
returns table(
  user_id      uuid,
  display_name text,
  avatar_url   text,
  username     text,
  score        bigint
)
language sql stable security definer
set search_path = public
as $$
  select
    p.id          as user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    (coalesce(r.cnt, 0) + coalesce(eb.cnt, 0)) as score
  from public.profiles p
  left join (
    select user_id, count(*) as cnt from public.reactions group by user_id
  ) r on r.user_id = p.id
  left join (
    select from_user_id, count(*) as cnt from public.encouragement_badges group by from_user_id
  ) eb on eb.from_user_id = p.id
  order by score desc
  limit lim;
$$;

-- 4. Consistency score (% of last 30 days with at least one post)
create or replace function public.get_top_consistent(lim int default 20)
returns table(
  user_id      uuid,
  display_name text,
  avatar_url   text,
  username     text,
  score        numeric
)
language sql stable security definer
set search_path = public
as $$
  with active_days as (
    select distinct author_id, date(created_at at time zone 'utc') as post_date
    from public.posts
    where created_at > now() - interval '30 days'
  )
  select
    p.id          as user_id,
    p.display_name,
    p.avatar_url,
    p.username,
    round(
      (count(ad.post_date)::numeric / 30) * 100,
      1
    ) as score
  from public.profiles p
  left join active_days ad on ad.author_id = p.id
  group by p.id, p.display_name, p.avatar_url, p.username
  order by score desc
  limit lim;
$$;

-- Grant execute to authenticated users
grant execute on function public.get_top_posters(int)    to authenticated;
grant execute on function public.get_top_completers(int) to authenticated;
grant execute on function public.get_top_encouragers(int) to authenticated;
grant execute on function public.get_top_consistent(int) to authenticated;

-- ── Profile stats helper ─────────────────────────────────────
create or replace function public.get_profile_stats(target_user_id uuid)
returns table(
  post_count        bigint,
  win_count         bigint,
  goals_joined      bigint,
  goals_completed   bigint,
  badges_earned     bigint
)
language sql stable security definer
set search_path = public
as $$
  select
    (select count(*) from public.posts where author_id = target_user_id) as post_count,
    (select count(*) from public.posts where author_id = target_user_id and is_win = true) as win_count,
    (select count(*) from public.goal_members where user_id = target_user_id)
      + (select count(*) from public.challenge_members where user_id = target_user_id) as goals_joined,
    (select count(*) from public.goal_updates where user_id = target_user_id and is_completion = true) as goals_completed,
    (select count(*) from public.member_badges where user_id = target_user_id) as badges_earned;
$$;

grant execute on function public.get_profile_stats(uuid) to authenticated;

-- ── Account deletion (security definer so user can delete own auth row) ──
create or replace function public.delete_my_account()
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- Cascade deletes handle profiles, posts, etc. via FK constraints
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

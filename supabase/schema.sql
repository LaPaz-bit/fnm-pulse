-- ============================================================
-- FNM Pulse — Supabase Schema
-- Run this in the Supabase SQL Editor to initialize your database.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  display_name  text,
  avatar_url    text,
  bio           text,
  role          text not null default 'member' check (role in ('member', 'coach', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);


-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  content     text not null,
  media_urls  text[] default '{}',
  post_type   text not null default 'general' check (post_type in ('general', 'win', 'check_in', 'goal_update')),
  visibility  text not null default 'public' check (visibility in ('public', 'private')),
  is_flagged  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index posts_author_id_idx on public.posts(author_id);
create index posts_created_at_idx on public.posts(created_at desc);

create trigger posts_updated_at
  before update on public.posts
  for each row execute procedure public.set_updated_at();

alter table public.posts enable row level security;

create policy "Public posts are viewable by everyone"
  on public.posts for select using (visibility = 'public' or auth.uid() = author_id);

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = author_id);

create policy "Authors can update their own posts"
  on public.posts for update using (auth.uid() = author_id);

create policy "Authors can delete their own posts"
  on public.posts for delete using (auth.uid() = author_id);


-- ============================================================
-- REACTIONS
-- ============================================================
create table if not exists public.reactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null,
  target_type  text not null check (target_type in ('post', 'comment')),
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, target_id, emoji)
);

create index reactions_target_idx on public.reactions(target_id, target_type);

alter table public.reactions enable row level security;

create policy "Reactions are viewable by everyone"
  on public.reactions for select using (true);

create policy "Authenticated users can react"
  on public.reactions for insert with check (auth.uid() = user_id);

create policy "Users can remove their own reactions"
  on public.reactions for delete using (auth.uid() = user_id);


-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  content     text not null,
  is_flagged  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index comments_post_id_idx on public.comments(post_id);
create index comments_parent_id_idx on public.comments(parent_id);

create trigger comments_updated_at
  before update on public.comments
  for each row execute procedure public.set_updated_at();

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = author_id);

create policy "Authors can update their own comments"
  on public.comments for update using (auth.uid() = author_id);

create policy "Authors can delete their own comments"
  on public.comments for delete using (auth.uid() = author_id);


-- ============================================================
-- ENCOURAGEMENT BADGES (peer-to-peer shoutouts)
-- ============================================================
create table if not exists public.encouragement_badges (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid not null references public.profiles(id) on delete cascade,
  to_user_id    uuid not null references public.profiles(id) on delete cascade,
  message       text,
  badge_type    text not null,
  created_at    timestamptz not null default now()
);

create index enc_badges_to_user_idx on public.encouragement_badges(to_user_id);

alter table public.encouragement_badges enable row level security;

create policy "Encouragement badges viewable by sender and recipient"
  on public.encouragement_badges for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Authenticated users can send encouragement badges"
  on public.encouragement_badges for insert with check (auth.uid() = from_user_id);


-- ============================================================
-- GOALS
-- ============================================================
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  goal_type     text not null default 'personal' check (goal_type in ('personal', 'group')),
  target_value  numeric,
  target_unit   text,
  start_date    date,
  end_date      date,
  status        text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at    timestamptz not null default now()
);

create index goals_owner_id_idx on public.goals(owner_id);
create index goals_status_idx on public.goals(status);

alter table public.goals enable row level security;

create policy "Goals are viewable by everyone"
  on public.goals for select using (true);

create policy "Authenticated users can create goals"
  on public.goals for insert with check (auth.uid() = owner_id);

create policy "Owners can update their goals"
  on public.goals for update using (auth.uid() = owner_id);

create policy "Owners can delete their goals"
  on public.goals for delete using (auth.uid() = owner_id);


-- ============================================================
-- CHALLENGES
-- ============================================================
create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  rules        text,
  start_date   date,
  end_date     date,
  status       text not null default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  created_at   timestamptz not null default now()
);

create index challenges_status_idx on public.challenges(status);

alter table public.challenges enable row level security;

create policy "Challenges are viewable by everyone"
  on public.challenges for select using (true);

create policy "Coaches and admins can create challenges"
  on public.challenges for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  );

create policy "Creators can update their challenges"
  on public.challenges for update using (auth.uid() = created_by);

create policy "Creators can delete their challenges"
  on public.challenges for delete using (auth.uid() = created_by);


-- ============================================================
-- GOAL MEMBERS
-- ============================================================
create table if not exists public.goal_members (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  unique (goal_id, user_id)
);

create index goal_members_user_id_idx on public.goal_members(user_id);

alter table public.goal_members enable row level security;

create policy "Goal members viewable by everyone"
  on public.goal_members for select using (true);

create policy "Authenticated users can join goals"
  on public.goal_members for insert with check (auth.uid() = user_id);

create policy "Members can leave goals"
  on public.goal_members for delete using (auth.uid() = user_id);


-- ============================================================
-- GOAL UPDATES (progress check-ins)
-- ============================================================
create table if not exists public.goal_updates (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  note       text,
  value      numeric,
  created_at timestamptz not null default now()
);

create index goal_updates_goal_id_idx on public.goal_updates(goal_id);
create index goal_updates_user_id_idx on public.goal_updates(user_id);

alter table public.goal_updates enable row level security;

create policy "Goal updates viewable by everyone"
  on public.goal_updates for select using (true);

create policy "Authenticated users can log goal updates"
  on public.goal_updates for insert with check (auth.uid() = user_id);

create policy "Users can delete their own goal updates"
  on public.goal_updates for delete using (auth.uid() = user_id);


-- ============================================================
-- WINS
-- ============================================================
create table if not exists public.wins (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  post_id      uuid references public.posts(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index wins_user_id_idx on public.wins(user_id);

alter table public.wins enable row level security;

create policy "Wins are viewable by everyone"
  on public.wins for select using (true);

create policy "Authenticated users can create wins"
  on public.wins for insert with check (auth.uid() = user_id);

create policy "Users can delete their own wins"
  on public.wins for delete using (auth.uid() = user_id);


-- ============================================================
-- BADGES (system-level definitions)
-- ============================================================
create table if not exists public.badges (
  id           uuid primary key default gen_random_uuid(),
  name         text unique not null,
  description  text,
  icon_url     text,
  criteria     text,
  created_at   timestamptz not null default now()
);

alter table public.badges enable row level security;

create policy "Badges are viewable by everyone"
  on public.badges for select using (true);

create policy "Only admins can manage badges"
  on public.badges for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- ============================================================
-- MEMBER BADGES (earned badges)
-- ============================================================
create table if not exists public.member_badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    uuid not null references public.badges(id) on delete cascade,
  awarded_at  timestamptz not null default now(),
  awarded_by  uuid references public.profiles(id) on delete set null,
  unique (user_id, badge_id)
);

create index member_badges_user_id_idx on public.member_badges(user_id);

alter table public.member_badges enable row level security;

create policy "Member badges are viewable by everyone"
  on public.member_badges for select using (true);

create policy "Admins and coaches can award badges"
  on public.member_badges for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('coach', 'admin')
    )
  );


-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  actor_id        uuid references public.profiles(id) on delete set null,
  type            text not null check (type in (
                    'reaction', 'comment', 'badge', 'goal_invite',
                    'challenge', 'encouragement', 'win', 'follow'
                  )),
  reference_id    uuid,
  reference_type  text check (reference_type in (
                    'post', 'comment', 'goal', 'challenge',
                    'badge', 'win', 'profile'
                  )),
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id, is_read);
create index notifications_created_at_idx on public.notifications(created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Users can mark their own notifications as read"
  on public.notifications for update using (auth.uid() = user_id);

create policy "System can insert notifications"
  on public.notifications for insert with check (true);


-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
create table if not exists public.direct_messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  content       text not null,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index dm_sender_idx on public.direct_messages(sender_id);
create index dm_recipient_idx on public.direct_messages(recipient_id);
create index dm_conversation_idx on public.direct_messages(
  least(sender_id::text, recipient_id::text),
  greatest(sender_id::text, recipient_id::text),
  created_at desc
);

alter table public.direct_messages enable row level security;

create policy "Users can view their own messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Authenticated users can send messages"
  on public.direct_messages for insert with check (auth.uid() = sender_id);

create policy "Recipients can mark messages as read"
  on public.direct_messages for update using (auth.uid() = recipient_id);


-- ============================================================
-- REPORTED POSTS (content moderation)
-- ============================================================
create table if not exists public.reported_posts (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null,
  target_type  text not null check (target_type in ('post', 'comment')),
  reason       text,
  status       text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (reporter_id, target_id)
);

create index reported_posts_status_idx on public.reported_posts(status);

alter table public.reported_posts enable row level security;

create policy "Reporters can view their own reports"
  on public.reported_posts for select using (auth.uid() = reporter_id);

create policy "Admins can view all reports"
  on public.reported_posts for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Authenticated users can submit reports"
  on public.reported_posts for insert with check (auth.uid() = reporter_id);

create policy "Admins can update report status"
  on public.reported_posts for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

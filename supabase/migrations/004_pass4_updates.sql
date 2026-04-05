-- ============================================================
-- Pass 4: DMs, Push Notifications, Admin Panel
-- ============================================================

-- ── Direct Messages ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS direct_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_read       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dm_sender    ON direct_messages(sender_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON direct_messages(recipient_id, created_at DESC);
CREATE INDEX idx_dm_convo     ON direct_messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Members can only see their own messages
CREATE POLICY "dm_select" ON direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Members can send messages
CREATE POLICY "dm_insert" ON direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Only recipient can mark read
CREATE POLICY "dm_update_read" ON direct_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ── Push Subscriptions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- ── Community Guidelines ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS community_guidelines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text NOT NULL,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_guidelines ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "guidelines_select" ON community_guidelines
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can write
CREATE POLICY "guidelines_insert_admin" ON community_guidelines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "guidelines_update_admin" ON community_guidelines
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed a default row
INSERT INTO community_guidelines (content)
VALUES ('Be kind, be real, and support each other. This is a safe space for the FNM Community to grow together. No spam, no hate, no negativity. Report anything that doesn''t belong here.')
ON CONFLICT DO NOTHING;

-- ── Notifications: add dm_received type ──────────────────────

-- Drop and recreate the type constraint to allow new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'reaction', 'comment', 'encouragement', 'badge', 'goal_join',
    'goal_complete', 'report_received', 'dm_received'
  ));

-- ── Notify admins when a post is reported ────────────────────

CREATE OR REPLACE FUNCTION notify_admins_of_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  FOR admin_rec IN
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, actor_id, post_id, body)
    VALUES (
      admin_rec.id,
      'report_received',
      NEW.reporter_id,
      NEW.target_id,
      'A post was reported by a member.'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_report ON reported_posts;
CREATE TRIGGER trg_notify_admins_report
  AFTER INSERT ON reported_posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_report();

-- ── Notify recipient of a DM ──────────────────────────────────

CREATE OR REPLACE FUNCTION notify_dm_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, body)
  VALUES (
    NEW.recipient_id,
    'dm_received',
    NEW.sender_id,
    'You have a new message.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dm ON direct_messages;
CREATE TRIGGER trg_notify_dm
  AFTER INSERT ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_dm_received();

-- ── RPC: get_conversations ────────────────────────────────────
-- Returns one row per conversation partner with last message + unread count

CREATE OR REPLACE FUNCTION get_conversations(p_user_id uuid)
RETURNS TABLE (
  partner_id       uuid,
  display_name     text,
  username         text,
  avatar_url       text,
  last_message     text,
  last_message_at  timestamptz,
  unread_count     bigint
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    partner_id,
    p.display_name,
    p.username,
    p.avatar_url,
    last_message,
    last_message_at,
    unread_count
  FROM (
    SELECT
      CASE
        WHEN sender_id = p_user_id THEN recipient_id
        ELSE sender_id
      END AS partner_id,
      content  AS last_message,
      created_at AS last_message_at,
      ROW_NUMBER() OVER (
        PARTITION BY
          LEAST(sender_id, recipient_id),
          GREATEST(sender_id, recipient_id)
        ORDER BY created_at DESC
      ) AS rn,
      SUM(CASE WHEN recipient_id = p_user_id AND is_read = false THEN 1 ELSE 0 END)
        OVER (
          PARTITION BY
            LEAST(sender_id, recipient_id),
            GREATEST(sender_id, recipient_id)
        ) AS unread_count
    FROM direct_messages
    WHERE sender_id = p_user_id OR recipient_id = p_user_id
  ) sub
  JOIN profiles p ON p.id = sub.partner_id
  WHERE rn = 1
  ORDER BY last_message_at DESC;
$$;

-- ── RPC: get_admin_stats ──────────────────────────────────────

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'total_members',   (SELECT COUNT(*) FROM profiles),
    'total_posts',     (SELECT COUNT(*) FROM posts),
    'total_goals',     (SELECT COUNT(*) FROM goals),
    'total_challenges',(SELECT COUNT(*) FROM challenges),
    'total_wins',      (SELECT COUNT(*) FROM posts WHERE is_win = true),
    'open_reports',    (SELECT COUNT(*) FROM reported_posts WHERE status = 'open'),
    'new_members_7d',  (
      SELECT COUNT(*) FROM profiles
      WHERE created_at > now() - interval '7 days'
    )
  );
$$;

-- ── RPC: get_member_emails (admin only) ───────────────────────

CREATE OR REPLACE FUNCTION get_member_emails()
RETURNS TABLE (display_name text, email text) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT p.display_name, u.email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.display_name;
$$;

-- ── RPC: admin_remove_member ──────────────────────────────────

CREATE OR REPLACE FUNCTION admin_remove_member(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- ── RPC: admin_dismiss_report ─────────────────────────────────

CREATE OR REPLACE FUNCTION admin_dismiss_report(report_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE reported_posts SET status = 'dismissed' WHERE id = report_id;
END;
$$;

-- ── RPC: admin_remove_post ────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_remove_post(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  DELETE FROM posts WHERE id = p_post_id;
  UPDATE reported_posts SET status = 'actioned' WHERE target_id = p_post_id AND target_type = 'post';
END;
$$;

-- ── Add status column to reported_posts (if not present) ──────

ALTER TABLE reported_posts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open'
  CHECK (status IN ('open', 'dismissed', 'actioned'));

-- ============================================================
-- Pass 5: Audit fixes — triggers, validation, integrity
-- ============================================================

-- ── Fix #1: notify_admins_of_report uses non-existent columns ──

CREATE OR REPLACE FUNCTION notify_admins_of_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  FOR admin_rec IN
    SELECT id FROM profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type)
    VALUES (
      admin_rec.id,
      'report_received',
      NEW.reporter_id,
      NEW.target_id,
      NEW.target_type
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  RETURN NEW;
END;
$$;

-- ── Fix #1b: notify_dm_received uses non-existent columns ──

CREATE OR REPLACE FUNCTION notify_dm_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, actor_id, reference_id, reference_type)
  VALUES (
    NEW.recipient_id,
    'dm_received',
    NEW.sender_id,
    NEW.id,
    'profile'
  );
  RETURN NEW;
END;
$$;

-- ── Fix #2: Validation trigger for reactions.target_id ──

CREATE OR REPLACE FUNCTION validate_reaction_target()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.target_type = 'post' THEN
    IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'Referenced post does not exist';
    END IF;
  ELSIF NEW.target_type = 'comment' THEN
    IF NOT EXISTS (SELECT 1 FROM comments WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'Referenced comment does not exist';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reaction_target ON reactions;
CREATE TRIGGER trg_validate_reaction_target
  BEFORE INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_reaction_target();

-- ── Fix #2b: Validation trigger for reported_posts.target_id ──

CREATE OR REPLACE FUNCTION validate_report_target()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.target_type = 'post' THEN
    IF NOT EXISTS (SELECT 1 FROM posts WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'Referenced post does not exist';
    END IF;
  ELSIF NEW.target_type = 'comment' THEN
    IF NOT EXISTS (SELECT 1 FROM comments WHERE id = NEW.target_id) THEN
      RAISE EXCEPTION 'Referenced comment does not exist';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_target ON reported_posts;
CREATE TRIGGER trg_validate_report_target
  BEFORE INSERT ON reported_posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_report_target();

-- ── Fix #3: Clean up orphaned goal-proposal posts when goal is deleted ──

CREATE OR REPLACE FUNCTION clean_goal_post_on_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.post_id IS NOT NULL THEN
    UPDATE posts SET is_goal_proposal = false WHERE id = OLD.post_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_goal_post ON goals;
CREATE TRIGGER trg_clean_goal_post
  BEFORE DELETE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION clean_goal_post_on_delete();

-- ── Fix #13: admin_remove_post validates post matches a report ──

CREATE OR REPLACE FUNCTION admin_remove_post(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- Verify this post has been reported
  IF NOT EXISTS (
    SELECT 1 FROM reported_posts
    WHERE target_id = p_post_id AND target_type = 'post' AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Post has no open report';
  END IF;

  DELETE FROM posts WHERE id = p_post_id;
  UPDATE reported_posts SET status = 'actioned' WHERE target_id = p_post_id AND target_type = 'post';
END;
$$;

-- =============================================================================
-- KinsMap — Invites table + RLS + helper functions
-- Run this in the Supabase SQL Editor after the main schema.
-- =============================================================================

CREATE TABLE invites (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id     UUID        NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
  token       UUID        UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  role        member_role NOT NULL DEFAULT 'viewer',
  created_by  UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  used_by     UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  is_used     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT invites_role_check CHECK (role IN ('contributor', 'viewer'))
);

CREATE INDEX invites_tree_id_idx ON invites (tree_id);
CREATE INDEX invites_token_idx   ON invites (token);

-- Public invite validation (no auth required to preview an invite)
CREATE OR REPLACE FUNCTION get_invite_by_token(invite_token UUID)
RETURNS TABLE (
  invite_id   UUID,
  tree_id     UUID,
  tree_name   TEXT,
  role        member_role,
  expires_at  TIMESTAMPTZ,
  is_valid    BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id,
    i.tree_id,
    t.name,
    i.role,
    i.expires_at,
    (NOT i.is_used AND i.expires_at > NOW()) AS is_valid
  FROM invites i
  JOIN trees t ON t.id = i.tree_id
  WHERE i.token = invite_token
  LIMIT 1;
$$;

-- Accept an invite after authentication
CREATE OR REPLACE FUNCTION accept_invite(invite_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv invites%ROWTYPE;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv
  FROM invites
  WHERE token = invite_token
    AND is_used = FALSE
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  IF EXISTS (
    SELECT 1 FROM tree_members
    WHERE tree_id = inv.tree_id AND user_id = uid
  ) THEN
    UPDATE invites
    SET is_used = TRUE, used_by = uid, used_at = NOW()
    WHERE id = inv.id AND is_used = FALSE;

    RETURN jsonb_build_object(
      'tree_id', inv.tree_id,
      'role', inv.role,
      'already_member', TRUE
    );
  END IF;

  INSERT INTO tree_members (tree_id, user_id, role)
  VALUES (inv.tree_id, uid, inv.role);

  UPDATE invites
  SET is_used = TRUE, used_by = uid, used_at = NOW()
  WHERE id = inv.id;

  RETURN jsonb_build_object(
    'tree_id', inv.tree_id,
    'role', inv.role,
    'already_member', FALSE
  );
END;
$$;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_select_admin"
  ON invites FOR SELECT
  TO authenticated
  USING (get_user_role(tree_id) IN ('owner', 'admin'));

CREATE POLICY "invites_insert_admin"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role(tree_id) IN ('owner', 'admin')
    AND role IN ('contributor', 'viewer')
  );

CREATE POLICY "invites_delete_admin"
  ON invites FOR DELETE
  TO authenticated
  USING (
    get_user_role(tree_id) IN ('owner', 'admin')
    AND is_used = FALSE
  );

-- Allow members to link their own person node after joining
CREATE POLICY "tree_members_link_own_person"
  ON tree_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON invites TO authenticated;
GRANT EXECUTE ON FUNCTION get_invite_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite(UUID) TO authenticated;

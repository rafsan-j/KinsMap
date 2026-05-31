-- ============================================================
-- KinsMap — Onboarding Fix
-- ============================================================

-- 1. Drop the broken trigger and its function
DROP TRIGGER IF EXISTS trees_after_insert_add_owner ON trees;
DROP FUNCTION IF EXISTS handle_new_tree();

-- 2. Fix tree_members policies (drop and recreate cleanly)
DROP POLICY IF EXISTS "tree_members_insert" ON tree_members;
DROP POLICY IF EXISTS "tree_members_update" ON tree_members;
DROP POLICY IF EXISTS "tree_members_link_own_person" ON tree_members;

-- Allow owner/admin to add members to an existing tree
-- OR allow a user to add themselves as owner when the tree has zero members yet
CREATE POLICY "tree_members_insert"
  ON tree_members FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(tree_id) IN ('owner', 'admin')
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM tree_members tm
        WHERE tm.tree_id = tree_members.tree_id
      )
    )
  );

-- Allow owner/admin to manage roles, OR any user to update their own record
-- (needed for linking their person node to their account)
CREATE POLICY "tree_members_update"
  ON tree_members FOR UPDATE TO authenticated
  USING (
    get_user_role(tree_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  )
  WITH CHECK (
    get_user_role(tree_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- 3. Fix trees INSERT policy (drop all variants and make one clean one)
DROP POLICY IF EXISTS "trees_insert" ON trees;
DROP POLICY IF EXISTS "Authenticated users can create trees" ON trees;
DROP POLICY IF EXISTS "Users can insert trees" ON trees;

CREATE POLICY "trees_insert"
  ON trees FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 4. Create the all-in-one onboarding function
-- This runs as postgres (superuser), bypassing all RLS.
-- The frontend calls this ONCE instead of doing separate inserts.
CREATE OR REPLACE FUNCTION create_tree_and_owner(
  p_tree_name   TEXT,
  p_first_name  TEXT,
  p_last_name   TEXT        DEFAULT NULL,
  p_gender      gender_type DEFAULT 'unspecified',
  p_birth_date  DATE        DEFAULT NULL,
  p_phone       TEXT        DEFAULT NULL,
  p_city        TEXT        DEFAULT NULL,
  p_country     TEXT        DEFAULT NULL,
  p_nickname    TEXT        DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tree_id   UUID;
  v_person_id UUID;
  v_uid       UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the tree
  INSERT INTO trees (name, created_by)
  VALUES (p_tree_name, v_uid)
  RETURNING id INTO v_tree_id;

  -- Create the owner's person node
  INSERT INTO persons (
    tree_id, first_name, last_name, gender,
    birth_date, phone, city, country, nickname,
    created_by, last_updated_by
  )
  VALUES (
    v_tree_id, p_first_name, p_last_name, p_gender,
    p_birth_date, p_phone, p_city, p_country, p_nickname,
    v_uid, v_uid
  )
  RETURNING id INTO v_person_id;

  -- Create the tree_members owner record
  INSERT INTO tree_members (tree_id, user_id, person_id, role)
  VALUES (v_tree_id, v_uid, v_person_id, 'owner');

  RETURN jsonb_build_object(
    'tree_id',   v_tree_id,
    'person_id', v_person_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_tree_and_owner(
  TEXT, TEXT, TEXT, gender_type, DATE, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
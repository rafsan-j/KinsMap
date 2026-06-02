-- =============================================================================
-- KinsMap — Complete Database Schema
-- Paste this entire file into the Supabase SQL Editor and run once.
-- =============================================================================

-- 1. Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'unspecified');
CREATE TYPE union_type AS ENUM ('marriage', 'civil_union', 'partnership');
CREATE TYPE union_status AS ENUM ('active', 'divorced', 'widowed', 'separated');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'contributor', 'viewer');

-- =============================================================================
-- 3. Tables (dependency order)
-- =============================================================================

-- trees
CREATE TABLE trees (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT        NOT NULL,
  description   TEXT,
  is_deleted    BOOLEAN     NOT NULL DEFAULT false,
  created_by    UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- persons
CREATE TABLE persons (
  id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id               UUID         NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
  first_name            TEXT,
  last_name             TEXT,
  birth_name            TEXT,
  nickname              TEXT,
  gender                gender_type  NOT NULL DEFAULT 'unspecified',
  birth_date            DATE,
  death_date            DATE,
  is_alive              BOOLEAN      NOT NULL DEFAULT true,
  birth_date_approx     BOOLEAN      NOT NULL DEFAULT false,
  death_date_approx     BOOLEAN      NOT NULL DEFAULT false,
  father_id             UUID         REFERENCES persons (id) ON DELETE SET NULL,
  mother_id             UUID         REFERENCES persons (id) ON DELETE SET NULL,
  father_rel_type       TEXT         CHECK (father_rel_type IN ('biological', 'adoptive', 'step')),
  mother_rel_type       TEXT         CHECK (mother_rel_type IN ('biological', 'adoptive', 'step')),
  profile_picture_url   TEXT,
  phone                 TEXT,
  address_line          TEXT,
  city                  TEXT,
  country               TEXT,
  current_occupation    JSONB,
  education_history     JSONB        NOT NULL DEFAULT '[]'::jsonb,
  notes                 TEXT,
  is_deleted            BOOLEAN      NOT NULL DEFAULT false,
  created_by            UUID         REFERENCES auth.users (id) ON DELETE SET NULL,
  last_updated_by       UUID         REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT persons_father_rel_type_required CHECK (
    father_id IS NULL OR father_rel_type IS NOT NULL
  ),
  CONSTRAINT persons_mother_rel_type_required CHECK (
    mother_id IS NULL OR mother_rel_type IS NOT NULL
  )
);

CREATE INDEX persons_tree_id_idx   ON persons (tree_id);
CREATE INDEX persons_father_id_idx ON persons (father_id);
CREATE INDEX persons_mother_id_idx ON persons (mother_id);

-- unions
CREATE TABLE unions (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id         UUID          NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
  partner_1_id    UUID          NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  partner_2_id    UUID          NOT NULL REFERENCES persons (id) ON DELETE CASCADE,
  union_type      union_type    NOT NULL DEFAULT 'marriage',
  union_status    union_status  NOT NULL DEFAULT 'active',
  start_date      DATE,
  end_date        DATE,
  notes           TEXT,
  is_deleted      BOOLEAN       NOT NULL DEFAULT false,
  created_by      UUID          REFERENCES auth.users (id) ON DELETE SET NULL,
  last_updated_by UUID          REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT unions_distinct_partners CHECK (partner_1_id <> partner_2_id)
);

CREATE INDEX unions_tree_id_idx      ON unions (tree_id);
CREATE INDEX unions_partner_1_id_idx ON unions (partner_1_id);
CREATE INDEX unions_partner_2_id_idx ON unions (partner_2_id);

-- tree_members
CREATE TABLE tree_members (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id     UUID         NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  person_id   UUID         REFERENCES persons (id) ON DELETE SET NULL,
  role        member_role  NOT NULL DEFAULT 'viewer',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT tree_members_unique_user_per_tree UNIQUE (tree_id, user_id)
);

CREATE INDEX tree_members_user_id_idx ON tree_members (user_id);
CREATE INDEX tree_members_tree_id_idx ON tree_members (tree_id);

-- audit_log (immutable — no UPDATE/DELETE policies)
CREATE TABLE audit_log (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id         UUID        NOT NULL REFERENCES trees (id) ON DELETE CASCADE,
  table_name      TEXT        NOT NULL,
  record_id       UUID        NOT NULL,
  action          TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  before_snapshot JSONB,
  after_snapshot  JSONB,
  changed_by      UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_tree_id_idx   ON audit_log (tree_id);
CREATE INDEX audit_log_record_id_idx ON audit_log (record_id);

-- =============================================================================
-- 4. Helper functions (used by RLS)
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_role(tree_uuid UUID)
RETURNS member_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.role
  FROM tree_members tm
  WHERE tm.tree_id = tree_uuid
    AND tm.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION user_is_tree_member(tree_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM tree_members tm
    WHERE tm.tree_id = tree_uuid
      AND tm.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION can_write_tree(tree_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(tree_uuid) IN ('owner', 'admin', 'contributor');
$$;

CREATE OR REPLACE FUNCTION can_see_deleted_row(tree_uuid UUID, deleted BOOLEAN)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT deleted OR get_user_role(tree_uuid) = 'owner';
$$;

-- =============================================================================
-- 5. Triggers — updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER persons_set_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER unions_set_updated_at
  BEFORE UPDATE ON unions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- 6. Triggers — audit_log (BEFORE UPDATE, capture old row)
-- =============================================================================

CREATE OR REPLACE FUNCTION audit_log_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (
    tree_id,
    table_name,
    record_id,
    action,
    before_snapshot,
    after_snapshot,
    changed_by
  )
  VALUES (
    OLD.tree_id,
    TG_TABLE_NAME,
    OLD.id,
    'UPDATE',
    to_jsonb(OLD),
    to_jsonb(NEW),
    auth.uid()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER persons_audit_before_update
  BEFORE UPDATE ON persons
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_before_update();

CREATE TRIGGER unions_audit_before_update
  BEFORE UPDATE ON unions
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_before_update();

-- Auto-add creator as owner when a new tree is created
CREATE OR REPLACE FUNCTION handle_new_tree()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO tree_members (tree_id, user_id, role)
    VALUES (NEW.id, auth.uid(), 'owner');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trees_after_insert_add_owner
  AFTER INSERT ON trees
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_tree();

-- =============================================================================
-- 7. Row Level Security
-- =============================================================================

ALTER TABLE trees        ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE unions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- trees
-- ---------------------------------------------------------------------------

CREATE POLICY "trees_select"
  ON trees FOR SELECT
  TO authenticated
  USING (
    user_is_tree_member(id)
    AND can_see_deleted_row(id, is_deleted)
  );

CREATE POLICY "trees_insert"
  ON trees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "trees_update"
  ON trees FOR UPDATE
  TO authenticated
  USING (
    user_is_tree_member(id)
    AND get_user_role(id) IN ('owner', 'admin')
    AND can_see_deleted_row(id, is_deleted)
  )
  WITH CHECK (
    user_is_tree_member(id)
    AND get_user_role(id) IN ('owner', 'admin')
  );

-- ---------------------------------------------------------------------------
-- persons
-- ---------------------------------------------------------------------------

CREATE POLICY "persons_select"
  ON persons FOR SELECT
  TO authenticated
  USING (
    user_is_tree_member(tree_id)
    AND can_see_deleted_row(tree_id, is_deleted)
  );

CREATE POLICY "persons_insert"
  ON persons FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_tree_member(tree_id)
    AND can_write_tree(tree_id)
  );

CREATE POLICY "persons_update"
  ON persons FOR UPDATE
  TO authenticated
  USING (
    user_is_tree_member(tree_id)
    AND can_write_tree(tree_id)
    AND can_see_deleted_row(tree_id, is_deleted)
  )
  WITH CHECK (
    user_is_tree_member(tree_id)
    AND can_write_tree(tree_id)
  );

-- ---------------------------------------------------------------------------
-- unions
-- ---------------------------------------------------------------------------

CREATE POLICY "unions_select"
  ON unions FOR SELECT
  TO authenticated
  USING (
    user_is_tree_member(tree_id)
    AND can_see_deleted_row(tree_id, is_deleted)
  );

CREATE POLICY "unions_insert"
  ON unions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_is_tree_member(tree_id)
    AND can_write_tree(tree_id)
  );

CREATE POLICY "unions_update"
  ON unions FOR UPDATE
  TO authenticated
  USING (
    user_is_tree_member(tree_id)
    AND can_write_tree(tree_id)
    AND can_see_deleted_row(tree_id, is_deleted)
  )
  WITH CHECK (
    user_is_tree_member(tree_id)
    AND can_write_tree(tree_id)
  );

-- ---------------------------------------------------------------------------
-- tree_members
-- ---------------------------------------------------------------------------

CREATE POLICY "tree_members_select"
  ON tree_members FOR SELECT
  TO authenticated
  USING (user_is_tree_member(tree_id));

CREATE POLICY "tree_members_insert"
  ON tree_members FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(tree_id) IN ('owner', 'admin'));

CREATE POLICY "tree_members_update"
  ON tree_members FOR UPDATE
  TO authenticated
  USING (get_user_role(tree_id) IN ('owner', 'admin'))
  WITH CHECK (get_user_role(tree_id) IN ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- audit_log (INSERT only for authenticated; SELECT owner only; no UPDATE/DELETE)
-- ---------------------------------------------------------------------------

CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_is_tree_member(tree_id)
  );

CREATE POLICY "audit_log_select"
  ON audit_log FOR SELECT
  TO authenticated
  USING (get_user_role(tree_id) = 'owner');

-- =============================================================================
-- 8. Grants
-- =============================================================================

GRANT USAGE ON TYPE gender_type   TO authenticated;
GRANT USAGE ON TYPE union_type    TO authenticated;
GRANT USAGE ON TYPE union_status  TO authenticated;
GRANT USAGE ON TYPE member_role   TO authenticated;

GRANT SELECT, INSERT, UPDATE ON trees        TO authenticated;
GRANT SELECT, INSERT, UPDATE ON persons      TO authenticated;
GRANT SELECT, INSERT, UPDATE ON unions       TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tree_members TO authenticated;
GRANT SELECT, INSERT          ON audit_log    TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_role(UUID)        TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_tree_member(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION can_write_tree(UUID)      TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_deleted_row(UUID, BOOLEAN) TO authenticated;

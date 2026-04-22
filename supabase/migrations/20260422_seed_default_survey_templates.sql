-- Seed default survey templates for every organization.
--
-- Before this migration, new orgs had NO rows in survey_templates — the web
-- silently fell back to a hardcoded constant in `lib/config/survey-field-
-- definitions.ts`, but the mobile app queries the DB directly and only showed
-- Relevé (hardcoded locally). This made every new org look broken on mobile.
--
-- Approach: mark one organization as the "template catalog" (Dulra Org).
-- Every new org gets a copy of its templates via an after-insert trigger on
-- organizations. Existing template-less orgs are backfilled in this migration.
-- Custom templates (`custom_*`) stay with the catalog org only.

-- 1. Catalog flag on organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS is_template_catalog BOOLEAN NOT NULL DEFAULT false;

-- Only one org can be catalog at a time
CREATE UNIQUE INDEX IF NOT EXISTS organizations_one_catalog
  ON organizations (is_template_catalog)
  WHERE is_template_catalog = true;

-- Mark Dulra Org as catalog
UPDATE organizations
  SET is_template_catalog = true
  WHERE id = 'ed8bfeab-0d99-4940-8e1c-9854707905ea';

-- 2. Reusable seed function — clones active, non-custom rows from catalog org
CREATE OR REPLACE FUNCTION public.seed_default_survey_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  catalog_id uuid;
BEGIN
  SELECT id INTO catalog_id
  FROM organizations
  WHERE is_template_catalog = true
  LIMIT 1;

  IF catalog_id IS NULL OR catalog_id = p_org_id THEN
    RETURN;
  END IF;

  INSERT INTO survey_templates
    (organization_id, survey_type, name, description, is_active, default_fields)
  SELECT
    p_org_id, survey_type, name, description, is_active, default_fields
  FROM survey_templates
  WHERE organization_id = catalog_id
    AND survey_type NOT LIKE 'custom_%'
  ON CONFLICT (organization_id, survey_type) DO NOTHING;
END;
$$;

-- 3. Replace handle_new_user trigger function — keep existing behavior,
--    add PERFORM call after new org creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
  invite_record record;
  user_full_name text;
  user_org_name text;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  user_org_name := COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization');

  SELECT * INTO invite_record
  FROM invites
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    INSERT INTO profiles (id, organization_id, email, full_name, role)
    VALUES (
      NEW.id,
      invite_record.organization_id,
      NEW.email,
      user_full_name,
      invite_record.role
    );

    UPDATE invites
    SET accepted_at = now()
    WHERE id = invite_record.id;
  ELSE
    INSERT INTO organizations (name)
    VALUES (user_org_name)
    RETURNING id INTO org_id;

    INSERT INTO profiles (id, organization_id, email, full_name, role)
    VALUES (
      NEW.id,
      org_id,
      NEW.email,
      user_full_name,
      'admin'
    );

    -- NEW: clone default survey templates for the new organization
    PERFORM public.seed_default_survey_templates(org_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Backfill existing template-less orgs
DO $$
DECLARE
  o record;
BEGIN
  FOR o IN
    SELECT id FROM organizations
    WHERE is_template_catalog = false
      AND NOT EXISTS (
        SELECT 1 FROM survey_templates st WHERE st.organization_id = organizations.id
      )
  LOOP
    PERFORM public.seed_default_survey_templates(o.id);
  END LOOP;
END
$$;

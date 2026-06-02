-- Soft-delete for team members.
--
-- Why: /api/team/remove-member used to hard-delete the auth user, which
-- cascades (profiles_id_fkey ON DELETE CASCADE) into deleting the profile
-- row. But many tables reference profiles(id) via NO ACTION foreign keys
-- (projects.created_by, desk_research_findings.created_by, surveys.surveyor_id,
-- photos.created_by, target_notes.created_by, survey_assignments.assigned_by …).
-- Any member who has ever created data therefore cannot be deleted: the
-- cascade is blocked, auth.admin.deleteUser fails, and the API returns 500 —
-- the member silently stays on the team. This affects every active user, not
-- just one. (See the 2026-06-02 "can't remove Ben" incident.)
--
-- Fix: stop hard-deleting. A removed member is "deactivated" instead —
-- hidden from the team UI and banned from signing in (handled in the API
-- route via auth.admin.updateUserById ban_duration). This preserves the
-- member's data attribution, which matters for CIEEM report provenance
-- ("generated_by" / "reviewed_by" / survey authorship).

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

-- Active-member listings filter by (organization_id, is_active = true).
-- Partial index keeps the common path cheap and stays small (deactivated
-- rows are the rare case).
create index if not exists profiles_org_active_idx
  on public.profiles (organization_id)
  where is_active;

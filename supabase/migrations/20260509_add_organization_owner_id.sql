-- Add an immutable "owner" concept to organizations so the founding admin
-- (or whoever currently holds ownership) cannot be silently removed by a
-- later-invited admin. Today every admin in an org has identical power: any
-- admin can call /api/team/remove-member on any other admin, including the
-- person who created the workspace.
--
-- Approach mirrors WhatsApp / Slack semantics:
--   - Each organization has exactly one owner at any time.
--   - The owner cannot be removed or have their role changed by anyone else.
--   - The owner can hand ownership to another admin via a dedicated transfer
--     endpoint (added in a separate change); only then can the previous owner
--     be removed.
--
-- Schema choice: a single `owner_id` column on `organizations` (FK to
-- profiles, ON DELETE SET NULL). Storing ownership on the organization keeps
-- the "exactly one owner" invariant trivially enforceable and avoids a
-- separate join table for a 1:1 relationship.
--
-- ON DELETE SET NULL rather than CASCADE/RESTRICT: if an owner profile ever
-- does get deleted out-of-band (e.g. via direct service-role action), the
-- organization survives in a recoverable state instead of being torn down.
-- The application-level guard prevents the normal path from ever getting
-- here; this is a safety net.

-- 1. Column
alter table public.organizations
  add column if not exists owner_id uuid
    references public.profiles(id) on delete set null;

create index if not exists organizations_owner_id_idx
  on public.organizations(owner_id);

-- 2. Backfill: each org's earliest admin becomes owner. Tie-break by
-- created_at ascending so the founder wins. If an org has no admin we leave
-- owner_id null and surface that via /api/team rather than guess.
update public.organizations o
set owner_id = sub.id
from (
  select distinct on (p.organization_id)
    p.organization_id, p.id, p.created_at
  from public.profiles p
  where p.role = 'admin'
  order by p.organization_id, p.created_at asc
) sub
where sub.organization_id = o.id
  and o.owner_id is null;

-- 3. Trigger update: when a brand-new org is created (no invite path), the
-- creating user becomes both the first admin AND the owner. Existing logic
-- inserted the org first, then the profile, then seeded templates. Now we
-- add a final UPDATE on organizations to set owner_id once the profile row
-- exists (FK requires the profile to be present first).
--
-- The invite path leaves owner_id alone — invitees join an existing org
-- whose owner is already established.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  org_id uuid;
  invite_record record;
  user_full_name text;
  user_org_name text;
begin
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  user_org_name := coalesce(new.raw_user_meta_data->>'organization_name', 'My Organization');

  select * into invite_record
  from invites
  where email = new.email
    and accepted_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if invite_record is not null then
    insert into profiles (id, organization_id, email, full_name, role)
    values (
      new.id,
      invite_record.organization_id,
      new.email,
      user_full_name,
      invite_record.role
    );

    update invites
    set accepted_at = now()
    where id = invite_record.id;
  else
    insert into organizations (name)
    values (user_org_name)
    returning id into org_id;

    insert into profiles (id, organization_id, email, full_name, role)
    values (
      new.id,
      org_id,
      new.email,
      user_full_name,
      'admin'
    );

    -- NEW: mark the creating admin as the organization owner.
    update organizations
    set owner_id = new.id
    where id = org_id;

    -- Existing: clone default survey templates for the new organization
    perform public.seed_default_survey_templates(org_id);
  end if;

  return new;
end;
$function$;

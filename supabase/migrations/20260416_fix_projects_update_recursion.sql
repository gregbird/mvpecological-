-- Fix infinite recursion in projects UPDATE policy.
-- The old policy referenced project_members, whose own SELECT policy
-- referenced projects, causing a policy evaluation loop.
-- Replace with a SECURITY DEFINER helper that reads project_members
-- with RLS bypassed for the membership check.

CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id AND user_id = p_user_id
  );
$$;

DROP POLICY IF EXISTS "Project members and admins can update projects" ON public.projects;

CREATE POLICY "Project members and admins can update projects" ON public.projects
FOR UPDATE
USING (
  organization_id = (SELECT public.get_user_organization_id((SELECT auth.uid())))
  AND (
    public.is_project_member(id, (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = ANY (ARRAY['admin'::public.user_role, 'project_manager'::public.user_role])
    )
  )
);

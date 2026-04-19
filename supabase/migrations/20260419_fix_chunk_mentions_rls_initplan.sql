-- Wrap auth.uid() calls with (SELECT ...) in document_chunk_mentions RLS
-- policies so Postgres evaluates them once per query instead of once per row.
-- Logic is unchanged; this is an optimizer hint recommended by the Supabase
-- database linter (0003_auth_rls_initplan).

DROP POLICY IF EXISTS "Admins can manage org chunk mentions (delete)" ON public.document_chunk_mentions;
DROP POLICY IF EXISTS "Admins can manage org chunk mentions (insert)" ON public.document_chunk_mentions;
DROP POLICY IF EXISTS "Admins can manage org chunk mentions (update)" ON public.document_chunk_mentions;
DROP POLICY IF EXISTS "Users can view own org chunk mentions" ON public.document_chunk_mentions;

CREATE POLICY "Admins can manage org chunk mentions (delete)"
  ON public.document_chunk_mentions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM document_chunks dc
      JOIN indexed_documents d ON d.id = dc.document_id
      WHERE dc.id = document_chunk_mentions.chunk_id
        AND d.organization_id = (SELECT get_user_organization_id((SELECT auth.uid())))
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can manage org chunk mentions (insert)"
  ON public.document_chunk_mentions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM document_chunks dc
      JOIN indexed_documents d ON d.id = dc.document_id
      WHERE dc.id = document_chunk_mentions.chunk_id
        AND d.organization_id = (SELECT get_user_organization_id((SELECT auth.uid())))
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "Admins can manage org chunk mentions (update)"
  ON public.document_chunk_mentions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM document_chunks dc
      JOIN indexed_documents d ON d.id = dc.document_id
      WHERE dc.id = document_chunk_mentions.chunk_id
        AND d.organization_id = (SELECT get_user_organization_id((SELECT auth.uid())))
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'::user_role
    )
  );

CREATE POLICY "Users can view own org chunk mentions"
  ON public.document_chunk_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_chunks dc
      JOIN indexed_documents d ON d.id = dc.document_id
      WHERE dc.id = document_chunk_mentions.chunk_id
        AND d.organization_id = (SELECT get_user_organization_id((SELECT auth.uid())))
    )
  );

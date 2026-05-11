-- Disable RLS for local development
-- Backend uses service-role key for all queries, so RLS is not needed for local integration.
-- Re-enable with proper policies before production deployment.

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
  END LOOP;
END $$;

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

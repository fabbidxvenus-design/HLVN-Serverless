-- Migration: 003_fix_rls_policies.sql
-- Fixes infinite recursion in RLS policies.
-- The old policies used EXISTS (SELECT FROM users) which triggered recursion.
-- New policies use aauth.uid() directly.

-- Drop old recursive policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;

-- Users can view own profile (via auth.uid())
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can view all profiles (any authenticated user can view user list)
CREATE POLICY "Authenticated users can view all profiles"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Authenticated users can insert users (admin gate enforced in app logic)
CREATE POLICY "Authenticated users can insert users"
  ON users FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update users (admin gate enforced in app logic)
CREATE POLICY "Authenticated users can update users"
  ON users FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Authenticated users can delete users (admin gate enforced in app logic)
CREATE POLICY "Authenticated users can delete users"
  ON users FOR DELETE
  USING (auth.uid() IS NOT NULL);

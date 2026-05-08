-- Migration: 002_rls_policies.sql
-- Enables RLS and creates policies for users, scans, and analytics_cache tables.

-- ── Enable RLS ────────────────────────────────────────────────────────────
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans            ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- ── Users policies ─────────────────────────────────────────────────────────

-- Anyone can view own profile (via auth.uid())
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can insert new users (profile row created by service-role after auth.user)
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can update any user
CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Admins can delete users
CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ── Scans policies ─────────────────────────────────────────────────────────

-- Users can view own scans; admins can view all
CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Users can insert own scans
CREATE POLICY "Users can insert own scans"
  ON scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own scans; admins can update any
CREATE POLICY "Users can update own scans"
  ON scans FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Only admins can delete scans
CREATE POLICY "Admins can delete scans"
  ON scans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ── Analytics cache policies ──────────────────────────────────────────────

-- Only admins can read analytics
CREATE POLICY "Admins can view analytics"
  ON analytics_cache FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Analytics cache is written by service-role / cron only (no user INSERT/UPDATE/DELETE via RLS needed).
-- Service-role bypasses RLS, so cron jobs and admin API calls work via supabaseAdmin.
CREATE POLICY "Service role can manage analytics"
  ON analytics_cache FOR ALL
  USING (false);  -- All user-level DML is blocked; only service role can write.

COMMENT ON POLICY "Service role can manage analytics"
  ON analytics_cache IS 'Service-role bypasses RLS for cron job writes; user INSERT/UPDATE/DELETE blocked.';
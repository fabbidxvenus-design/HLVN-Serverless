-- Migration: 003_search_indexes.sql
-- Creates GIN indexes for full-text search and JSONB queries.
-- Also adds useful composite indexes for common access patterns.

-- ── Scans indexes ──────────────────────────────────────────────────────────

-- B-tree index on user_id for fast owner lookups
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);

-- B-tree index on timestamp for time-range queries and ordering
CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp DESC);

-- GIN index for full-text search on ocr_raw and title
CREATE INDEX IF NOT EXISTS idx_scans_search_vector ON scans USING GIN(search_vector);

-- GIN index for JSONB containment queries on ocr_structured
CREATE INDEX IF NOT EXISTS idx_scans_ocr_structured ON scans USING GIN(ocr_structured);

-- Composite index for user + timestamp (common access: own scan list sorted by date)
CREATE INDEX IF NOT EXISTS idx_scans_user_timestamp ON scans(user_id, timestamp DESC);

-- ── Users indexes ──────────────────────────────────────────────────────────

-- Unique index on email (enforced, not just UNIQUE constraint — faster lookups)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- B-tree index on role for role-filtered queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ── Analytics cache indexes ───────────────────────────────────────────────

-- B-tree on date descending for range queries
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_cache(date DESC);

-- ── Token usage index (JSONB on token_usage) ───────────────────────────────

-- GIN index for filtering scans by API cost/token usage
CREATE INDEX IF NOT EXISTS idx_scans_token_usage ON scans USING GIN(token_usage);
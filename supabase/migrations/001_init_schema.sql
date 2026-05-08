-- Migration: 001_init_schema.sql
-- Creates the core tables: users, scans, analytics_cache.
-- RLS is enabled in migration 002.

-- ── Users profile table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        UNIQUE NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  last_login   TIMESTAMPTZ
);

COMMENT ON TABLE users IS 'App-level profile linked 1:1 to auth.users. Role controls RBAC.';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at_trigger
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION users_updated_at();

-- ── Scans table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  image_url        TEXT,
  ocr_raw          TEXT        NOT NULL,
  ocr_structured   JSONB       NOT NULL DEFAULT '{"fields":[],"sizes":[]}'::jsonb,
  token_usage      JSONB       NOT NULL DEFAULT '{"input":0,"output":0,"cost":0}'::jsonb,
  api_key_index    INTEGER     NOT NULL DEFAULT 0,
  edited           BOOLEAN     DEFAULT FALSE,
  search_vector    TSVECTOR
);

COMMENT ON TABLE scans IS 'OCR scan records with JSONB structured data and full-text search.';

-- Trigger to populate search_vector automatically
CREATE OR REPLACE FUNCTION scans_search_vector_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.ocr_raw, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.ocr_structured->>'title', '')), 'B');
  RETURN NEW;
END;
$$;

CREATE TRIGGER scans_search_vector_trigger
  BEFORE INSERT OR UPDATE ON scans
  FOR EACH ROW EXECUTE FUNCTION scans_search_vector_update();

-- ── Analytics cache table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_cache (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date          DATE        UNIQUE NOT NULL,
  total_scans   INTEGER     NOT NULL DEFAULT 0,
  active_users  INTEGER     NOT NULL DEFAULT 0,
  top_products  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  api_usage     JSONB       NOT NULL DEFAULT '{"keys":[]}'::jsonb,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_cache IS 'Daily aggregate cache for analytics queries.';

CREATE OR REPLACE FUNCTION analytics_cache_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER analytics_cache_updated_at_trigger
  BEFORE UPDATE ON analytics_cache
  FOR EACH ROW EXECUTE FUNCTION analytics_cache_updated_at();
# PostgreSQL Schema with JSONB

## Rule

Use **PostgreSQL** for relational data with **JSONB** columns for flexible OCR structured data. Enable full-text search on OCR content. Use proper indexes for performance.

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Scans table
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT, -- S3/Supabase Storage URL
  ocr_raw TEXT NOT NULL, -- Full OCR text
  ocr_structured JSONB NOT NULL, -- Structured fields
  token_usage JSONB NOT NULL, -- {input, output, cost}
  api_key_index INTEGER NOT NULL,
  edited BOOLEAN DEFAULT FALSE,
  search_vector TSVECTOR -- Full-text search
);

-- Analytics cache table
CREATE TABLE analytics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_scans INTEGER NOT NULL,
  active_users INTEGER NOT NULL,
  top_products JSONB NOT NULL,
  api_usage JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_timestamp ON scans(timestamp DESC);
CREATE INDEX idx_scans_search_vector ON scans USING GIN(search_vector);
CREATE INDEX idx_scans_ocr_structured ON scans USING GIN(ocr_structured);
CREATE INDEX idx_analytics_date ON analytics_cache(date DESC);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION scans_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.ocr_raw, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.ocr_structured->>'title', '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scans_search_vector_trigger
  BEFORE INSERT OR UPDATE ON scans
  FOR EACH ROW
  EXECUTE FUNCTION scans_search_vector_update();
```

## JSONB Structure

```typescript
// ocr_structured JSONB format
interface OCRStructured {
  title: string;
  fields: Array<{
    field: string;
    value: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  sizes: Array<{
    size: string;
    quantity: number;
  }>;
  notes: string[];
}

// token_usage JSONB format
interface TokenUsage {
  input: number;
  output: number;
  cost: number;
}

// top_products JSONB format (analytics_cache)
interface TopProduct {
  name: string;
  count: number;
}
```

## Queries

```typescript
// Query: Search scans by text
const { data } = await supabase
  .from('scans')
  .select('*')
  .textSearch('search_vector', 'cargo box', {
    type: 'websearch',
    config: 'simple',
  });

// Query: Filter by JSONB field
const { data } = await supabase
  .from('scans')
  .select('*')
  .contains('ocr_structured', { title: 'Cargo Box' });

// Query: Extract JSONB field
const { data } = await supabase
  .from('scans')
  .select('id, timestamp, ocr_structured->title as title')
  .order('timestamp', { ascending: false });

// Query: Aggregate by date
const { data } = await supabase
  .rpc('get_scans_by_date', {
    start_date: '2026-05-01',
    end_date: '2026-05-08',
  });
```

## Why

**Problem**: NoSQL (DynamoDB) requires complex queries for filtering/sorting. Rigid schema doesn't fit flexible OCR data. No full-text search.

**Solution**: PostgreSQL provides SQL queries (easy filtering/joins), JSONB for flexible OCR data, and full-text search built-in.

**Benefits**:
- SQL queries easier than NoSQL for admin dashboard
- JSONB allows flexible OCR structure (fields vary per scan)
- Full-text search on OCR content (fast, built-in)
- GIN indexes on JSONB for fast queries
- Relations (foreign keys, referential integrity)
- Supabase provides managed PostgreSQL (no ops)

## How to Apply

### Schema Setup
1. Run SQL schema in Supabase SQL Editor
2. Enable RLS on all tables
3. Create indexes for performance
4. Test full-text search with sample data

### Frontend Queries
1. Use Supabase client for queries
2. Use `.textSearch()` for full-text search
3. Use `.contains()` for JSONB filtering
4. Use `.select()` with JSONB operators (`->`, `->>`)

### Backend Queries
1. Use service role client for admin operations
2. Use raw SQL for complex aggregations
3. Cache analytics in `analytics_cache` table
4. Update cache daily via cron job

## Performance Notes

- **GIN indexes**: Fast JSONB queries but slower writes (acceptable for read-heavy dashboard)
- **Full-text search**: Use `simple` config for Vietnamese (no stemming)
- **Pagination**: Always use `.range()` or `.limit()` for large result sets
- **Aggregations**: Cache in `analytics_cache` table, update daily

## Exceptions

- **Development**: Can use smaller indexes for faster writes
- **Large exports**: Stream results instead of loading all into memory

---

**Source**: Supabase PostgreSQL best practices  
**Recommended for**: HLVN Serverless (Vercel + Supabase stack)  
**Last updated**: 2026-05-08

# Scan Update — HLVN Serverless (Dashboard Context)

> Vibecode Kit v5.0 — Scan update from dashboard source  
> Date: 2026-05-08  
> Source: `D:\scripts\HLVN\HLVN-dashboard\coding-packs\`

---

## Update Summary

Đã scan lại `HLVN-dashboard` để lấy context build cho serverless backend. Phát hiện quan trọng:

**Dashboard là frontend-only** — không có `app/api/*` routes, không import Supabase, không có OpenRouter logic.

→ **Toàn bộ backend logic phải nằm trong `HLVN-serverless`**

---

## Key Findings from Dashboard Scan

### 1. Architecture Clarification

**Dashboard** (`D:\scripts\HLVN\HLVN-dashboard`):
- ✅ Frontend-only Next.js 15 app
- ✅ UI pages, components, forms, tables, charts
- ✅ Calls external backend API
- ❌ NO `app/api/*` routes
- ❌ NO Supabase client imports
- ❌ NO OpenRouter integration

**Serverless** (`D:\scripts\HLVN\HLVN-serverless`):
- ✅ All API endpoints
- ✅ Supabase Auth/PostgreSQL/Storage/RLS
- ✅ OpenRouter integration
- ✅ Business logic and data persistence

### 2. Requirements Matrix Seeded

Đã tạo `01-REQUIREMENTS-MATRIX.md` với 9 domains từ dashboard RRI:

1. **Authentication & Authorization** (6 requirements)
2. **User Management API** (9 requirements)
3. **Scan History API** (9 requirements)
4. **Analytics API** (8 requirements)
5. **OCR API Integration** (7 requirements)
6. **Data Sync** (6 requirements)
7. **Database Schema** (7 requirements)
8. **API Contract** (5 requirements)
9. **Testing & Quality** (5 requirements)

**Total**: 62 backend requirements seeded from dashboard

### 3. Updated Files

✅ **`00-PROJECT-CONTEXT.md`**:
- Updated tech stack table (Vercel Functions + Supabase confirmed)
- Updated dashboard module status (requirements complete, not "design phase")
- Added frontend-only clarification

✅ **`01-REQUIREMENTS-MATRIX.md`**:
- Seeded 62 backend requirements from dashboard RRI
- Cross-referenced 6 applicable standards
- Listed 6 open questions for RRI

---

## Backend API Endpoints Required

Based on dashboard requirements:

### Auth
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/logout` — Revoke session
- `GET /api/auth/me` — Current user

### Users (Admin-only)
- `GET /api/users` — List with pagination/search/filter
- `POST /api/users` — Create user
- `PATCH /api/users/:id/role` — Edit role
- `DELETE /api/users/:id` — Delete user

### Scans
- `GET /api/scans` — List (admin sees all, users see own)
- `GET /api/scans/:id` — Detail
- `POST /api/scans` — Create scan
- `PATCH /api/scans/:id` — Update scan
- `DELETE /api/scans/:id` — Delete scan (admin-only)

### Analytics (Admin-only)
- `GET /api/analytics/summary` — KPI cards
- `GET /api/analytics/trends` — Scan volume chart
- `GET /api/analytics/top-products` — Top products table
- `GET /api/analytics/top-users` — Top users table
- `GET /api/analytics/api-usage` — API usage by key

### OCR
- `POST /api/ocr/process` — Process image (mobile app)

### Export (Admin-only)
- `POST /api/export/excel` — Bulk Excel export

---

## Database Schema Required

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Scans table
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT,
  ocr_structured JSONB NOT NULL,
  token_usage JSONB NOT NULL,
  api_key_index INTEGER NOT NULL,
  edited BOOLEAN DEFAULT FALSE,
  search_vector TSVECTOR
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

-- Indexes
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_timestamp ON scans(timestamp DESC);
CREATE INDEX idx_scans_search_vector ON scans USING GIN(search_vector);
CREATE INDEX idx_analytics_date ON analytics_cache(date DESC);
```

---

## Open Questions for RRI

1. **Serverless architecture**: Standalone Next.js API app on Vercel, or non-Next serverless API?
2. **Image upload**: Mobile uploads directly to Supabase Storage (signed URL), or sends to backend?
3. **CORS origins**: What exact origins for local/staging/production?
4. **Data migration**: Auto-migrate IndexedDB scans, or only new scans sync?
5. **Retention policy**: How long to keep scan images and OCR records?
6. **Manager role**: Dashboard access later, or mobile-only for MVP?

---

## Next Steps

1. ✅ **Scan update complete** — Dashboard context integrated
2. ⏳ **Run `/vibecode:rri`** — Resolve open backend decisions
3. ⏳ **Design API contract** — Request/response types, error codes
4. ⏳ **Implement Supabase setup** — Database schema, RLS policies, Auth config
5. ⏳ **Implement API endpoints** — Auth, Users, Scans, Analytics, OCR, Export

---

## Quality Gate: Scan Update Self-Review

- [x] Dashboard frontend-only constraint captured
- [x] Backend-owned responsibilities identified
- [x] Requirements matrix seeded (62 requirements)
- [x] API endpoints listed (17 endpoints)
- [x] Database schema defined (3 tables + indexes)
- [x] Open questions documented (6 questions)
- [x] Standards cross-referenced (6 standards)

---

**Scan update completed**: 2026-05-08  
**Framework**: Vibecode Kit v5.0  
**Project**: HLVN Serverless Backend  
**Next step**: `/vibecode:rri` to finalize backend API contract

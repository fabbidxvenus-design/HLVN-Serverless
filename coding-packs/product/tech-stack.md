# Tech Stack

> **Decision**: Vercel + Supabase stack (matches dashboard architecture)

## Backend (Serverless)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Hosting** | Vercel | - | Auto-deploy from Git, Edge Network, zero config |
| **API** | Next.js API Routes | 15.x | File-based routing, TypeScript, serverless functions |
| **Database** | Supabase PostgreSQL | - | SQL queries, relations, full-text search, JSONB support |
| **Auth** | Supabase Auth | 2.x | Built-in JWT, auto-refresh, email/password, OAuth |
| **Storage** | Supabase Storage | - | S3-compatible, image uploads |
| **Real-time** | Supabase Realtime | - | Optional: live updates via WebSocket (Phase 2) |
| **ORM** | Supabase JS Client | 2.x | Type-safe queries, auto-generated types |
| **Password Hashing** | Supabase Auth | - | Built-in bcrypt hashing |
| **Secrets** | Vercel Environment Variables | - | Secure env vars, per-environment |
| **Testing** | Vitest | 4.1+ | Unit tests for API routes |

## External Services

| Service | Purpose | Rationale |
|---------|---------|-----------|
| **OpenRouter** | OCR API proxy | Multi-model support, cost-effective |
| **Vercel Analytics** | Performance monitoring | Built-in, free on Pro plan |
| **Supabase Logs** | Database logs | Built-in query logs |

## Development Tools

| Tool | Purpose |
|------|---------|
| **Vercel CLI** | Local dev server, deployment |
| **Supabase CLI** | Local database, migrations |
| **ESLint** | Linting (Next.js config) |
| **Prettier** | Code formatting |
| **Husky** | Git hooks for pre-commit checks |

## Architecture Decisions

### Why Vercel + Supabase over AWS Lambda?

**Pros**:
- Simpler deployment (Git push → auto deploy, no Serverless Framework)
- Zero config (Next.js works out of the box)
- PostgreSQL easier than DynamoDB for admin queries (joins, filters)
- Built-in auth + storage reduces code
- Free tier generous for MVP (500MB DB, 1GB storage)
- Matches dashboard tech stack (consistency)

**Cons**:
- Vendor lock-in (acceptable for faster MVP)
- Less control than AWS (acceptable for MVP)
- Function timeout limits (10s Hobby, 60s Pro)

**Decision**: Use Vercel + Supabase for MVP, can migrate to AWS later if needed

### Why PostgreSQL over DynamoDB?

**Pros**:
- SQL queries easier for admin dashboard (complex filters, joins)
- JSONB for flexible OCR data (best of both worlds)
- Full-text search built-in
- Row Level Security at database level
- Familiar to most developers

**Cons**:
- Slightly more expensive than DynamoDB at scale (acceptable for MVP)
- Requires connection pooling (Supabase handles this)

**Decision**: Use PostgreSQL with JSONB for flexible OCR data

### Why Next.js API Routes over Express?

**Pros**:
- File-based routing (no manual route registration)
- TypeScript built-in
- Vercel-optimized (best performance)
- Can share types between frontend and backend
- Serverless by default

**Cons**:
- Slightly different from traditional Express (acceptable)
- Tied to Next.js framework (acceptable for MVP)

**Decision**: Use Next.js API Routes for backend API

## Database Schema

See [standards/database/postgresql-jsonb-schema.md](../standards/database/postgresql-jsonb-schema.md) for full schema.

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
  edited BOOLEAN DEFAULT FALSE
);
```

## API Endpoints

```
POST   /api/auth/login          # Login with email/password
POST   /api/auth/logout         # Logout (revoke refresh token)
GET    /api/auth/me             # Get current user

POST   /api/users               # Create user (admin only)
GET    /api/users               # List users (admin only)
GET    /api/users/:id           # Get user details (admin only)
PUT    /api/users/:id           # Update user (admin only)
DELETE /api/users/:id           # Delete user (admin only)

POST   /api/ocr/process         # Process OCR (proxy to OpenRouter)
POST   /api/scans               # Create scan
GET    /api/scans               # List scans (own or all if admin)
GET    /api/scans/:id           # Get scan details
PUT    /api/scans/:id           # Update scan
DELETE /api/scans/:id           # Delete scan (admin only)

GET    /api/analytics/summary   # Get analytics summary (admin only)
GET    /api/analytics/trends    # Get trends (admin only)

POST   /api/export/excel        # Bulk export to Excel (admin only)
```

## Deployment

### Vercel Deployment

```bash
# 1. Connect GitHub repo to Vercel
# 2. Add environment variables in Vercel dashboard:
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - SUPABASE_SERVICE_ROLE_KEY (for admin operations)
#    - OPENROUTER_KEY_1, OPENROUTER_KEY_2, OPENROUTER_KEY_3
# 3. Push to main branch → auto deploy

git push origin main
# Vercel automatically builds and deploys
```

### Supabase Setup

```bash
# 1. Create project at supabase.com
# 2. Run SQL schema in SQL Editor
# 3. Enable Auth providers (email/password)
# 4. Configure RLS policies
# 5. Get API keys from Settings → API
```

## Cost Estimate

### Free Tier (MVP)

| Service | Free Tier | Sufficient For |
|---------|-----------|----------------|
| **Vercel** | 100GB bandwidth, unlimited requests | MVP + early production |
| **Supabase** | 500MB DB, 1GB storage, 2GB bandwidth | ~10,000 scans |

**Total**: $0/month for MVP

### Paid Tier (Production)

| Service | Plan | Cost | When Needed |
|---------|------|------|-------------|
| **Vercel Pro** | 1TB bandwidth, analytics | $20/month | >100GB bandwidth |
| **Supabase Pro** | 8GB DB, 100GB storage | $25/month | >500MB DB or >1GB storage |

**Total**: $45/month for production

---

**Created**: 2026-05-08  
**Last updated**: 2026-05-08  
**Matches**: Dashboard tech stack (Vercel + Supabase)

# Phase 01: Foundation — Project Setup + Supabase Schema

## Overview
Setup project foundation: Next.js 15 API app, TypeScript strict, shared utilities, Supabase schema + auth/RLS.

## Source TIPs
- `coding-packs/tips/TIP-001-project-setup-api-foundation.md`
- `coding-packs/tips/TIP-002-supabase-schema-auth-rls.md`

## Requirements

### Project Structure
```
HLVN-serverless/
├── app/api/
│   └── health/route.ts
├── lib/api/
│   ├── errors.ts
│   ├── response.ts
│   ├── validation.ts
│   └── cors.ts
├── lib/auth/
│   ├── session.ts
│   ├── rbac.ts
│   └── supabase-auth.ts
├── lib/supabase/
│   ├── admin.ts
│   ├── user-client.ts
│   └── storage.ts
├── types/
│   ├── api.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── scan.ts
│   ├── ocr.ts
│   └── analytics.ts
├── supabase/migrations/
│   ├── 001_init_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_search_indexes.sql
├── tests/
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── .env.example
└── .gitignore
```

### Core Types (from BUILDER-HANDOFF.md)
```typescript
// UserRole
export type UserRole = 'admin' | 'manager' | 'user';

// ApiResponse envelope
export type ApiResponse<T> =
  | { success: true; data: T; meta?: ApiMeta }
  | { success: false; error: string; code: ApiErrorCode; meta?: ApiMeta };

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export type ApiErrorCode =
  | 'AUTH_FAILED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// UserProfile
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  lastLogin: string | null;
}

// ScanRecord
export interface OCRField {
  field: string;
  value: string;
  confidence?: 'high' | 'medium' | 'low';
  category?: 'main' | 'other';
}

export interface OCRSize {
  size: string;
  quantity: number;
}

export interface OCRStructured {
  title?: string;
  fields: OCRField[];
  sizes: OCRSize[];
  rawText?: string;
  notes?: string[];
}

export interface TokenUsage {
  input: number;
  output: number;
  cost: number;
  model?: string;
}

export interface ScanRecord {
  id: string;
  userId: string;
  userEmail?: string;
  timestamp: string;
  imageUrl: string | null;
  ocrRaw: string;
  ocrStructured: OCRStructured;
  tokenUsage: TokenUsage;
  apiKeyIndex: number;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Database Schema (Supabase PostgreSQL)
```sql
-- Users table linked to auth.users
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
  image_url TEXT,
  ocr_raw TEXT NOT NULL,
  ocr_structured JSONB NOT NULL,
  token_usage JSONB NOT NULL,
  api_key_index INTEGER NOT NULL,
  edited BOOLEAN DEFAULT FALSE,
  search_vector TSVECTOR
);

-- Analytics cache
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
CREATE INDEX idx_scans_ocr_structured ON scans USING GIN(ocr_structured);
CREATE INDEX idx_analytics_date ON analytics_cache(date DESC);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Users: admins can manage all
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can manage users" ON users FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Scans: owner or admin can access
CREATE POLICY "Users can view own scans" ON scans FOR SELECT USING (
  auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can insert own scans" ON scans FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "Users can update own scans" ON scans FOR UPDATE USING (
  auth.uid() = user_id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Admins can delete scans" ON scans FOR DELETE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

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

### RBAC Rules
```typescript
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: { canAccessDashboard: true, canManageUsers: true, canViewAllHistory: true, ... },
  manager: { canAccessDashboard: false, ... },
  user: { canAccessDashboard: false, ... },
};
```

### Validation Helpers Required
- `isRequiredString(value, minLength?, maxLength?)`
- `isEmail(value)`
- `isPositiveInt(value, min?, max?)`
- `isISODateString(value)`
- `isEnum(value, enumValues)`
- `isFileContentType(value, allowedTypes)`
- `isFileSizeBytes(value, maxBytes)`

## Implementation Steps

### STEP 1: Project Foundation
1. Create `package.json` with dependencies: next@15, typescript, @supabase/supabase-js, exceljs, vitest
2. Create `next.config.ts`
3. Create `tsconfig.json` with strict mode
4. Create `vitest.config.ts`
5. Create `.env.example` with placeholder vars
6. Create `.gitignore`

### STEP 2: API Utilities
1. Create `types/api.ts` — ApiResponse, ApiMeta, ApiErrorCode
2. Create `lib/api/response.ts` — ok(), fail() helpers
3. Create `lib/api/errors.ts` — typed error classes
4. Create `lib/api/validation.ts` — validation helpers
5. Create `lib/api/cors.ts` — CORS helper

### STEP 3: Domain Types
1. Create `types/auth.ts` — RouteContext, SessionTokens
2. Create `types/user.ts` — UserProfile, UserRole
3. Create `types/scan.ts` — ScanRecord, OCRStructured, TokenUsage
4. Create `types/ocr.ts` — OCR request/response types
5. Create `types/analytics.ts` — analytics response types

### STEP 4: Supabase Clients
1. Create `lib/supabase/admin.ts` — service role client
2. Create `lib/supabase/user-client.ts` — user-scoped client
3. Create `lib/supabase/storage.ts` — storage helpers

### STEP 5: Auth Helpers
1. Create `lib/auth/session.ts` — extractBearerToken, getCurrentUser
2. Create `lib/auth/rbac.ts` — requireAdmin, requireRole, ROLE_PERMISSIONS
3. Create `lib/auth/supabase-auth.ts` — Supabase auth helpers

### STEP 6: Database Migrations
1. Create `supabase/migrations/001_init_schema.sql`
2. Create `supabase/migrations/002_rls_policies.sql`
3. Create `supabase/migrations/003_search_indexes.sql`

### STEP 7: Tests
1. Create `tests/api/response.test.ts`
2. Create `tests/api/validation.test.ts`
3. Create `tests/api/cors.test.ts`
4. Create `tests/services/rbac.test.ts`
5. Create `tests/services/session.test.ts`

## Acceptance Criteria
- [ ] Project initializes with `npm install` + typecheck passes
- [ ] Health endpoint returns safe success envelope
- [ ] ApiResponse envelope matches BUILDER-HANDOFF exactly
- [ ] Validation helpers return deterministic errors
- [ ] CORS headers work for allowed origins
- [ ] Migrations create schema with correct columns/indexes
- [ ] RLS policies enforced: users see own scans, admins see all
- [ ] RBAC: manager/user denied dashboard access
- [ ] All unit tests pass

## Todo
- [ ] Initialize project structure
- [ ] Implement API utilities
- [ ] Implement Supabase clients + auth helpers
- [ ] Create database migrations
- [ ] Write and run unit tests
- [ ] Run quality gates

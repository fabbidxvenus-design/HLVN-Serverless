# TIP-002: Supabase Schema + Auth/RLS

## HEADER
- TIP-ID: TIP-002
- Project: HLVN Serverless Backend
- Module: Supabase Schema + Auth/RLS
- Priority: P0
- Depends on: TIP-001
- Estimated: L (8h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Supabase PostgreSQL, Supabase Auth v2, Supabase Storage, Supabase JS Client v2, TypeScript strict.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/standards/auth/supabase-auth-rls.md`
  - `coding-packs/standards/auth/rbac-admin-gate.md`
  - `coding-packs/standards/database/postgresql-jsonb-schema.md`
- Patterns to follow:
  - Database relationships and schema from Builder Handoff.
  - Service-role key is server-only.
  - RLS remains enabled on user data tables.

## APPLICABLE STANDARDS
Builder MUST conform.
- [auth/supabase-auth-rls](../standards/auth/supabase-auth-rls.md) — Supabase Auth + RLS authorization.
- [auth/rbac-admin-gate](../standards/auth/rbac-admin-gate.md) — roles and admin-only dashboard access.
- [database/postgresql-jsonb-schema](../standards/database/postgresql-jsonb-schema.md) — PostgreSQL schema, JSONB, full-text search indexes.

## TASK
Create Supabase migrations and backend auth primitives. Implement database schema, RLS policies, Supabase admin/user clients, session extraction, current-user loading, and RBAC helpers that later endpoint TIPs will reuse.

## SPECIFICATIONS

### Files to Create or Modify
- `supabase/migrations/001_init_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_search_indexes.sql`
- `lib/supabase/admin.ts`
- `lib/supabase/user-client.ts`
- `lib/supabase/storage.ts`
- `lib/auth/session.ts`
- `lib/auth/rbac.ts`
- `lib/auth/supabase-auth.ts`
- `tests/services/rbac.test.ts`
- `tests/services/session.test.ts`
- `tests/integration/rls-policies.test.ts` or a documented integration-test harness if local Supabase is not yet available.

### Business Rules
1. Create `users` table linked 1:1 to `auth.users(id)`.
2. Create `scans` table linked many-to-one to `users(id)` with JSONB columns for `ocr_structured` and `token_usage`.
3. Create `analytics_cache` table for daily aggregate data.
4. Use roles exactly: `admin`, `manager`, `user`.
5. Dashboard/API admin operations require `admin` role.
6. Mobile-capable authenticated operations allow all roles unless endpoint says admin-only.
7. Prevent service-role helper imports from client-exposed modules.

### Validation
1. Migration must enforce role check constraint.
2. `users.email` must be unique and non-null.
3. `scans.user_id`, `ocr_raw`, `ocr_structured`, `token_usage`, and `api_key_index` must be non-null.
4. Add indexes for `scans.user_id`, `scans.timestamp`, `scans.search_vector`, `scans.ocr_structured`, and `analytics_cache.date`.
5. Auth helpers must validate Bearer token presence and format.

### Error Handling
1. Missing or invalid token maps to `AUTH_FAILED`.
2. Missing profile row after valid Supabase auth maps to `AUTH_FAILED` or `FORBIDDEN` with safe message.
3. Insufficient role maps to `FORBIDDEN`.
4. Supabase admin client initialization must fail fast if required env vars are absent.
5. Do not expose Supabase raw auth/database messages to clients.

## ACCEPTANCE CRITERIA
- Given migrations are applied When tables are inspected Then `users`, `scans`, and `analytics_cache` exist with required columns and indexes.
- Given RLS policies are active When a normal user queries scans Then only their own scans are visible.
- Given RLS policies are active When an admin queries scans Then all scans are visible.
- Given a manager logs in for dashboard audience When RBAC is checked Then access is denied.
- Given a valid admin token When `requireAdmin` runs Then it returns the loaded `UserProfile`.
- Given a missing Bearer token When session helper runs Then it returns `AUTH_FAILED`.

## CONSTRAINTS
- DO NOT implement login/logout/users route handlers in this TIP; only shared auth/RLS infrastructure.
- DO NOT disable RLS in production migrations.
- DO NOT expose `SUPABASE_SERVICE_ROLE_KEY` in public config or `NEXT_PUBLIC_*` variables.
- DO NOT add OAuth/password reset flows; Supabase can support them later but they are out of MVP scope.
- REUSE shared API error utilities from TIP-001.
- SKIP analytics aggregation logic; only create schema foundation.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to schema/auth/RLS foundation.
- [x] Files to create/modify are explicit.
- [x] Acceptance criteria cover RLS, RBAC, and env safety.
- [x] Applicable auth/database standards are listed.
- [x] Scope excludes feature endpoint implementation.

**Verdict**: PASSED — Ready for implementation after TIP-001.

# TIP-003: Auth + User Management APIs

## HEADER
- TIP-ID: TIP-003
- Project: HLVN Serverless Backend
- Module: Auth + User Management APIs
- Priority: P0
- Depends on: TIP-002
- Estimated: L (10h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Next.js 15 API Routes, Supabase Auth v2, Supabase PostgreSQL, TypeScript strict, Vitest.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/standards/auth/rbac-admin-gate.md`
  - `coding-packs/standards/auth/supabase-auth-rls.md`
- Patterns to follow:
  - API envelope contract from Builder Handoff.
  - `Route Handler → auth helper → service → repository` layering.

## APPLICABLE STANDARDS
Builder MUST conform.
- [auth/rbac-admin-gate](../standards/auth/rbac-admin-gate.md) — admin-only dashboard and last-admin protection.
- [auth/supabase-auth-rls](../standards/auth/supabase-auth-rls.md) — Supabase Auth, service-role safety, RLS-backed access.

## TASK
Implement authentication endpoints and admin user management endpoints. This TIP exposes login/logout/me/refresh and user CRUD/role management APIs using Supabase Auth and the users profile table created in TIP-002.

## SPECIFICATIONS

### Files to Create or Modify
- `app/api/auth/login/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/refresh/route.ts`
- `app/api/users/route.ts`
- `app/api/users/[id]/route.ts`
- `app/api/users/[id]/role/route.ts`
- `lib/users/repository.ts`
- `lib/users/service.ts`
- `tests/api/auth.test.ts`
- `tests/api/users.test.ts`
- `tests/services/users.test.ts`

### Business Rules
1. `POST /api/auth/login` accepts `{ email, password, audience? }`.
2. If `audience === 'dashboard'`, only `admin` users may log in successfully.
3. `POST /api/auth/logout` revokes or signs out the current session where Supabase supports it.
4. `GET /api/auth/me` returns current `UserProfile`.
5. `POST /api/auth/refresh` accepts `{ refreshToken }` and returns fresh session tokens.
6. `GET /api/users` is admin-only and supports `page`, `limit`, `search`, and `role` filters.
7. `POST /api/users` is admin-only and creates both Supabase auth user and profile row.
8. `PATCH /api/users/:id/role` is admin-only and cannot demote the last admin.
9. `DELETE /api/users/:id` is admin-only and cannot delete the last admin.
10. Deleted users cascade scans by database policy; image cleanup can be best-effort only with explicit errors logged.

### Validation
1. Email must be valid format.
2. Password must meet the MVP minimum length used in RRI/Blueprint, default minimum 8 characters if not otherwise specified.
3. Role must be exactly `admin`, `manager`, or `user`.
4. Pagination must clamp to safe limits; default page 1 and limit 20, maximum 100.
5. User ID path params must be UUIDs.
6. Search input must be trimmed and bounded.

### Error Handling
1. Invalid credentials return `401 AUTH_FAILED` with safe message.
2. Non-admin dashboard login returns `403 FORBIDDEN`.
3. Non-admin user-management access returns `403 FORBIDDEN`.
4. Invalid request body returns `400 VALIDATION_ERROR`.
5. Missing user returns `404 NOT_FOUND`.
6. Last-admin demotion/deletion returns `400 VALIDATION_ERROR` or `403 FORBIDDEN` with clear safe message.
7. Supabase failures map to safe typed errors; never return raw Supabase error bodies.

## ACCEPTANCE CRITERIA
- Given valid admin credentials When logging in with `audience: 'dashboard'` Then response includes `user`, `accessToken`, `refreshToken`, and `expiresAt`.
- Given valid manager credentials When logging in with `audience: 'dashboard'` Then response is `FORBIDDEN`.
- Given a valid Bearer token When `/api/auth/me` is called Then current `UserProfile` is returned.
- Given a non-admin token When `/api/users` is called Then response is `FORBIDDEN`.
- Given admin token and valid user payload When `POST /api/users` is called Then auth user and profile are created.
- Given only one admin exists When attempting to demote or delete that admin Then the request is rejected.
- Given users exist When `GET /api/users?page=1&limit=20` is called Then response meta includes `page`, `limit`, `total`, and `hasMore`.

## CONSTRAINTS
- DO NOT implement scans, OCR, analytics, or export endpoints in this TIP.
- DO NOT create dashboard frontend code.
- DO NOT bypass last-admin protection for tests or convenience.
- DO NOT leak whether an email exists beyond safe auth/user-management contexts.
- REUSE auth/RBAC/session helpers from TIP-002 and envelope utilities from TIP-001.
- SKIP password reset and email invitation flows; defer to Phase 2 unless user requests otherwise.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to auth/users APIs.
- [x] Files and endpoint contracts are explicit.
- [x] Acceptance criteria cover admin gate, pagination, and last-admin guard.
- [x] Applicable standards are listed.
- [x] Scope excludes scan/OCR/analytics work.

**Verdict**: PASSED — Ready for implementation after TIP-002.

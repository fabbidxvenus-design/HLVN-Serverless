# Vibecode Kit v5.0 — HLVN Serverless Builder Handoff

> Paste this into Claude Code at the START of each build session.
> Then paste the specific TIP(s) for that session.

---

## VAI TRO

Bạn là Builder cho HLVN Serverless. Nhiệm vụ là implement standalone Next.js API backend trên Vercel để phục vụ `HLVN-dashboard` frontend-only và `ocr-mobile-web`.

Ưu tiên theo thứ tự:
1. Correctness và security trước tốc độ.
2. Backend API là nguồn sự thật cho auth/authorization/data.
3. Không để dashboard hoặc mobile giữ OpenRouter secrets hoặc Supabase service-role logic.
4. API contract phải typed, ổn định, và không silent failure.
5. Database authorization phải có cả service-layer RBAC và Supabase RLS.

---

## QUY TAC TUYET DOI

1. **Không hardcode secrets** — OpenRouter keys, Supabase service role key, JWT secrets chỉ nằm trong env vars.
2. **Không expose Supabase service role key ra client** — chỉ dùng trong server-side routes/services.
3. **Không để dashboard import Supabase hoặc implement API routes** — dashboard gọi external API của repo này.
4. **Không để mobile gọi OpenRouter trực tiếp** — mobile phải gọi `/api/ocr/process`.
5. **Không bypass RLS/RBAC bằng convenience code** — admin-only endpoints phải enforce role rõ ràng.
6. **Không swallow errors** — mọi lỗi trả response envelope có typed code và message an toàn.
7. **Không mark complete nếu chưa chạy checks/tests liên quan** — tối thiểu typecheck + unit tests cho module vừa sửa.

---

## PROJECT CONTEXT

### Product Mission

Current OCR mobile app is client-only and exposes critical limitations: OpenRouter API keys in browser bundle, no multi-user accounts, no central sync, no admin management, and no audit/cost tracking. HLVN Serverless moves secrets and persistence into a managed backend so warehouse workers can scan from mobile while admins manage users, scans, costs, and analytics centrally.

Target users:
- **Warehouse workers**: scan labels, review own history, edit OCR results, export own data.
- **System administrators**: manage users, view all scans, monitor costs, export bulk data, operate the system.

Success metrics:
- Zero API key exposure in client bundles.
- 10+ active users in first month.
- 99.9% API uptime target.
- <500ms average non-OCR API response time.
- <$50/month for early production on Vercel + Supabase.

### Roadmap Priorities

**MVP**:
1. Supabase Auth and JWT sessions.
2. RLS + RBAC for admin/manager/user roles.
3. Admin user management APIs.
4. OpenRouter OCR proxy with retry + multi-key fallback.
5. Scan CRUD with signed Supabase image upload.
6. Basic analytics and API cost tracking.
7. Direct XLSX export.
8. Unit/integration tests.

**Phase 2+**:
- Password reset flow, API key management UI, manager dashboard access, advanced analytics, audit log UI, notifications, error-rate dashboard, automated retention, real-time updates, multi-tenancy.

### Tech Stack

| Layer | Technology | Version/Notes | Purpose |
|-------|------------|---------------|---------|
| Hosting | Vercel | Managed serverless | Deploy standalone backend project |
| Framework | Next.js API Routes | 15.x | File-based API routes on Vercel Functions |
| Language | TypeScript | strict | Shared API types and service code |
| Database | Supabase PostgreSQL | managed | Users, scans, analytics cache, RLS, JSONB, full-text search |
| Auth | Supabase Auth | v2 | Email/password, JWT, refresh sessions |
| Storage | Supabase Storage | managed | Scan image uploads and signed access URLs |
| DB Client | Supabase JS Client | v2 | Server-side service role/admin and user-scoped queries |
| OCR Provider | OpenRouter | env keys | Backend-only OCR proxy |
| Testing | Vitest | current | Unit tests for routes/services |
| Tooling | ESLint + Prettier | project local | Linting and formatting |

### Applicable Standards

- [api/multi-key-fallback](standards/api/multi-key-fallback.md) — OpenRouter keys are server env only; retry next key for provider/quota failures.
- [api/retry-backoff](standards/api/retry-backoff.md) — transient 429/503/timeouts use exponential backoff.
- [auth/rbac-admin-gate](standards/auth/rbac-admin-gate.md) — dashboard APIs are admin-only; mobile APIs allow authenticated roles.
- [auth/supabase-auth-rls](standards/auth/supabase-auth-rls.md) — enforce data access at database layer with RLS policies.
- [database/postgresql-jsonb-schema](standards/database/postgresql-jsonb-schema.md) — scans use JSONB OCR/token payloads plus indexes.
- [export/excel-multi-sheet](standards/export/excel-multi-sheet.md) — exports produce multi-sheet XLSX workbooks.

---

## MODULE ARCHITECTURE

### Workspace Structure

```text
HLVN-serverless/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── me/route.ts
│       │   └── refresh/route.ts
│       ├── users/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── role/route.ts
│       ├── scans/
│       │   ├── route.ts
│       │   ├── upload-url/route.ts
│       │   └── [id]/route.ts
│       ├── ocr/
│       │   └── process/route.ts
│       ├── analytics/
│       │   ├── summary/route.ts
│       │   ├── trends/route.ts
│       │   ├── top-products/route.ts
│       │   ├── top-users/route.ts
│       │   └── api-usage/route.ts
│       └── export/
│           └── excel/route.ts
├── lib/
│   ├── api/
│   │   ├── errors.ts
│   │   ├── response.ts
│   │   ├── validation.ts
│   │   └── cors.ts
│   ├── auth/
│   │   ├── session.ts
│   │   ├── rbac.ts
│   │   └── supabase-auth.ts
│   ├── supabase/
│   │   ├── admin.ts
│   │   ├── user-client.ts
│   │   └── storage.ts
│   ├── users/
│   │   ├── repository.ts
│   │   └── service.ts
│   ├── scans/
│   │   ├── repository.ts
│   │   ├── service.ts
│   │   └── search.ts
│   ├── ocr/
│   │   ├── openrouter.ts
│   │   ├── retry.ts
│   │   ├── key-fallback.ts
│   │   ├── parse.ts
│   │   └── token-usage.ts
│   ├── analytics/
│   │   ├── repository.ts
│   │   └── service.ts
│   └── export/
│       └── excel.ts
├── types/
│   ├── api.ts
│   ├── auth.ts
│   ├── user.ts
│   ├── scan.ts
│   ├── ocr.ts
│   └── analytics.ts
├── supabase/
│   └── migrations/
│       ├── 001_init_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_search_indexes.sql
├── tests/
│   ├── api/
│   ├── services/
│   ├── integration/
│   └── fixtures/
├── next.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Entry Points and Routing

| Route | File | Auth | Purpose |
|-------|------|------|---------|
| `POST /api/auth/login` | `app/api/auth/login/route.ts` | Public | Email/password login; dashboard requires admin role |
| `POST /api/auth/logout` | `app/api/auth/logout/route.ts` | Required | Revoke session |
| `GET /api/auth/me` | `app/api/auth/me/route.ts` | Required | Current user profile |
| `POST /api/auth/refresh` | `app/api/auth/refresh/route.ts` | Refresh token | Refresh access token |
| `GET /api/users` | `app/api/users/route.ts` | Admin | List users with pagination/search/filter |
| `POST /api/users` | `app/api/users/route.ts` | Admin | Create user |
| `PATCH /api/users/:id/role` | `app/api/users/[id]/role/route.ts` | Admin | Update role with last-admin protection |
| `DELETE /api/users/:id` | `app/api/users/[id]/route.ts` | Admin | Delete user and related data |
| `GET /api/scans` | `app/api/scans/route.ts` | Required | List scans; admin all, users own |
| `POST /api/scans` | `app/api/scans/route.ts` | Required | Save completed scan metadata/OCR result |
| `GET /api/scans/:id` | `app/api/scans/[id]/route.ts` | Required | Scan detail |
| `PATCH /api/scans/:id` | `app/api/scans/[id]/route.ts` | Owner/Admin | Update edited OCR data |
| `DELETE /api/scans/:id` | `app/api/scans/[id]/route.ts` | Admin | Delete scan and image |
| `POST /api/scans/upload-url` | `app/api/scans/upload-url/route.ts` | Required | Generate signed upload URL |
| `POST /api/ocr/process` | `app/api/ocr/process/route.ts` | Required | Process image through OpenRouter |
| `GET /api/analytics/*` | `app/api/analytics/**/route.ts` | Admin | Analytics queries |
| `POST /api/export/excel` | `app/api/export/excel/route.ts` | Admin | Direct XLSX export |

---

## DATA MODELS

### Core Types

```ts
export type UserRole = 'admin' | 'manager' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
  lastLogin: string | null;
}

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

### API Envelope

```ts
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
```

### Database Relationships

```text
auth.users (Supabase managed)
  1 ── 1 users
users
  1 ── N scans
analytics_cache
  independent daily aggregate table from scans/users
```

### Database Schema

Migrations must create:
- `users`: profile table linked to `auth.users(id)`.
- `scans`: scan records linked to `users(id)`, with JSONB OCR/token columns.
- `analytics_cache`: daily aggregate cache.
- GIN indexes for JSONB and full-text search.
- RLS policies for users/scans.

---

## API CONTRACTS

### Auth

```text
POST /api/auth/login
Request: { email: string; password: string; audience?: 'dashboard' | 'mobile' }
Response: { user: UserProfile; accessToken: string; refreshToken: string; expiresAt: string }
Auth: public
Rules: If audience='dashboard', user.role must be 'admin'; otherwise return FORBIDDEN.
```

```text
POST /api/auth/logout
Request: { refreshToken?: string }
Response: { ok: true }
Auth: required
```

```text
GET /api/auth/me
Request: none
Response: UserProfile
Auth: required
```

```text
POST /api/auth/refresh
Request: { refreshToken: string }
Response: { accessToken: string; refreshToken: string; expiresAt: string }
Auth: public with refresh token
```

### Users

```text
GET /api/users?page=&limit=&search=&role=
Response: UserProfile[] with meta { page, limit, total, hasMore }
Auth: admin
```

```text
POST /api/users
Request: { email: string; password: string; role: UserRole }
Response: UserProfile
Auth: admin
Rules: validate email/password/role; create auth user then profile row.
```

```text
PATCH /api/users/:id/role
Request: { role: UserRole }
Response: UserProfile
Auth: admin
Rules: reject if this would demote the last admin.
```

```text
DELETE /api/users/:id
Request: none
Response: { deleted: true; id: string }
Auth: admin
Rules: reject deleting last admin; cascade scans; cleanup scan images best-effort with explicit error handling.
```

### Scans

```text
GET /api/scans?page=&limit=&search=&userId=&from=&to=
Response: ScanRecord[] with meta { page, limit, total, hasMore }
Auth: required
Rules: admin can filter by any user; non-admin only own scans.
```

```text
POST /api/scans
Request: { imageUrl?: string | null; ocrRaw: string; ocrStructured: OCRStructured; tokenUsage: TokenUsage; apiKeyIndex: number; timestamp?: string }
Response: ScanRecord
Auth: required
```

```text
GET /api/scans/:id
Response: ScanRecord
Auth: required
Rules: admin or owner only.
```

```text
PATCH /api/scans/:id
Request: { ocrStructured: OCRStructured; edited: true }
Response: ScanRecord
Auth: owner or admin
```

```text
DELETE /api/scans/:id
Response: { deleted: true; id: string }
Auth: admin
```

```text
POST /api/scans/upload-url
Request: { fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; sizeBytes: number }
Response: { uploadUrl: string; storagePath: string; publicUrl?: string; expiresAt: string }
Auth: required
Rules: validate content type and size; path includes user id and generated uuid.
```

### OCR

```text
POST /api/ocr/process
Request: { imageBase64?: string; imageUrl?: string; modelTier?: 'free' | 'default' | 'high' }
Response: { ocrRaw: string; ocrStructured: OCRStructured; tokenUsage: TokenUsage; apiKeyIndex: number; model: string }
Auth: required
Rules: one of imageBase64/imageUrl required; call OpenRouter with retry/backoff and key fallback.
```

### Analytics

```text
GET /api/analytics/summary?from=&to=
Response: { totalScans: number; activeUsers: number; apiCost: number; successRate: number }
Auth: admin
```

```text
GET /api/analytics/trends?from=&to=&bucket=day|week|month
Response: { points: Array<{ label: string; scans: number; cost: number }> }
Auth: admin
```

```text
GET /api/analytics/top-products?from=&to=&limit=
Response: { products: Array<{ name: string; count: number; lastSeen: string }> }
Auth: admin
```

```text
GET /api/analytics/top-users?from=&to=&limit=
Response: { users: Array<{ userId: string; email: string; scanCount: number; cost: number }> }
Auth: admin
```

```text
GET /api/analytics/api-usage?from=&to=
Response: { keys: Array<{ apiKeyIndex: number; calls: number; inputTokens: number; outputTokens: number; cost: number }> }
Auth: admin
```

### Export

```text
POST /api/export/excel
Request: { search?: string; userId?: string; from?: string; to?: string }
Response: XLSX binary file
Auth: admin
Rules: Content-Type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; Content-Disposition attachment.
```

---

## COMPONENT TREE

This is a backend project; components are API modules rather than React UI components.

```text
Route Handler
├── parse request
├── validate input
├── authenticate session
├── authorize role/ownership
├── call service
├── map service result to ApiResponse or binary response
└── map errors through safe typed error response

Service
├── enforce business rule
├── call repository/provider/storage
├── transform database/provider payloads
└── return typed domain model

Repository / Provider
├── Supabase database query
├── Supabase Storage operation
└── OpenRouter external call
```

### Shared Module Interfaces

```ts
interface RouteContext {
  user: UserProfile;
  accessToken: string;
}

interface PaginationParams {
  page: number;
  limit: number;
}

interface DateRangeParams {
  from?: string;
  to?: string;
}
```

---

## INTEGRATION POINTS

### Supabase Auth

Flow:
1. Client calls `POST /api/auth/login`.
2. Backend calls Supabase Auth sign-in.
3. Backend loads `users` profile row.
4. If dashboard audience and role is not admin, return 403.
5. Backend returns session tokens and profile.

### Supabase PostgreSQL

Rules:
- Use service role only in server-side admin operations.
- Use user-scoped client or explicit user filters for owner-scoped operations.
- RLS must remain enabled on `users` and `scans`.
- Repository layer returns domain models, not raw Supabase rows.

### Supabase Storage

Rules:
- Generate signed upload URLs through backend.
- Store object paths in `scans.image_url` or `image_path` if implemented separately.
- Generate short-lived signed read URLs for dashboard/mobile access.
- Delete associated storage object when scan/user is deleted.

### OpenRouter OCR

Rules:
- Read keys from `OPENROUTER_KEY_1..N` env vars.
- Retry transient 429/503/timeouts with exponential backoff.
- Fall back to next key for quota/provider failures.
- Persist `api_key_index`, token counts, model, and cost with scan metadata.
- Never expose provider raw errors to clients.

### CORS

Allowed origins:
- Local: `http://localhost:3000`, `http://localhost:5173`
- Staging: `https://dashboard-staging.vercel.app`, `https://mobile-staging.vercel.app`
- Production placeholders: `https://dashboard.yourdomain.com`, `https://mobile.yourdomain.com`

---

## NON-FUNCTIONAL REQUIREMENTS

### Performance Budgets

| Surface | Target |
|---------|--------|
| Auth/users/scans list p95 | <500ms for 50 rows |
| Analytics p95 | <1000ms with indexed range queries |
| OCR process | Within Vercel function timeout; fail safely on provider timeout |
| Excel export | Synchronous MVP export for filtered data; revisit async jobs if >10k scans |
| Cold start | Keep server modules small; avoid heavyweight imports in non-export routes |

### Error Handling Strategy

- Convert all expected errors to typed `ApiResponse` errors.
- Validation failures return `400 VALIDATION_ERROR`.
- Missing/invalid token returns `401 AUTH_FAILED`.
- Insufficient role/ownership returns `403 FORBIDDEN`.
- Missing records return `404 NOT_FOUND`.
- OpenRouter quota/provider failures return `502 PROVIDER_ERROR` or `429 QUOTA_EXCEEDED`.
- Unexpected server failures return `500 INTERNAL_ERROR` without internals.

### Loading / Empty States Required in Clients

Backend must provide enough metadata for clients to render:
- Empty users list.
- Empty scans list.
- No analytics for date range.
- No search results.
- Export progress/loading state on dashboard button.

### Security Requirements

- Validate all external input at route boundaries.
- Enforce RBAC in every protected route.
- Keep RLS policies enabled and tested.
- Use parameterized Supabase queries only.
- Never return secrets, stack traces, SQL errors, provider request payloads, or raw auth errors.
- Add rate limiting in Phase 2; design route boundaries so it can be added cleanly.

### Testing Strategy

Required test coverage:
- Unit tests for response envelope, validation, RBAC helpers, retry/backoff, key fallback, OCR parsing, token usage calculation.
- API route tests for auth/users/scans/analytics/export happy paths and auth failures.
- Integration tests for RLS boundaries: admin all scans, user own scans only, manager mobile-only.
- Excel tests that assert workbook sheets and required columns.
- Coverage target: 80%+ for core modules.

---

## EXECUTION ORDER

### Week 1 — Foundation

1. **TIP-001: Project Setup + API Foundation**
   - Initialize Next.js API app, TypeScript, lint/test config.
   - Add response envelope, errors, validation, CORS helpers.
   - Add shared API/domain types.

2. **TIP-002: Supabase Schema + Auth/RLS**
   - Create migrations for users/scans/analytics_cache.
   - Add RLS policies and Supabase clients.
   - Implement auth session helpers and RBAC.

### Week 2 — Core APIs

3. **TIP-003: Auth + User Management APIs**
   - Implement login/logout/me/refresh.
   - Implement users CRUD and last-admin protection.

4. **TIP-004: Storage + Scan APIs**
   - Implement signed upload URL.
   - Implement scan create/list/detail/update/delete.
   - Implement full-text search/filter/pagination.

5. **TIP-005: OCR Proxy**
   - Implement OpenRouter provider.
   - Implement retry/backoff + multi-key fallback.
   - Implement token/cost tracking and OCR parsing.

### Week 3 — Admin Data + Hardening

6. **TIP-006: Analytics + Export APIs**
   - Implement summary/trends/top-products/top-users/api-usage.
   - Implement direct XLSX export.

7. **TIP-007: Tests + Deployment Hardening**
   - Add unit/integration tests.
   - Add env validation, CORS verification, deployment docs.
   - Run quality gates.

---

## HOW TO USE TIPs

For each build session:
1. Paste this Builder Handoff first.
2. Paste only the TIP for that session.
3. Implement only files listed in the TIP unless a dependency requires a small support file.
4. Follow TDD where possible: write failing tests, implement, refactor.
5. Run the TIP's required checks before marking complete.
6. Report using the Completion Report Format below.

Do not combine unrelated TIPs unless dependencies are already complete and tests are passing.

---

## COMPLETION REPORT FORMAT

```markdown
## Completion Report — TIP-XXX

### Implemented
- [file] — change summary

### Checks Run
- [command] — pass/fail

### Requirements Covered
- REQ-...

### Notes / Deviations
- None, or explain why deviation was needed

### Remaining Work
- Next TIP or blockers
```

---

## ESCALATION RULES

### Level 1 — Local Fix
Use when implementation detail is unclear but scope is unchanged.
- Read relevant coding-packs docs.
- Choose simplest implementation aligned with standards.
- Document deviation in Completion Report.

### Level 2 — Architecture Decision Needed
Use when a choice changes data model, API contract, auth behavior, or MVP scope.
- Stop implementation.
- Propose 2-3 options with tradeoffs.
- Ask user for decision before proceeding.

### Level 3 — Security / Data Risk
Use when there is possible secret exposure, auth bypass, data loss, destructive operation, or RLS bypass.
- Stop immediately.
- Use security-reviewer if code exists.
- Do not proceed until risk is resolved and user is informed.

---

## QUALITY GATE: Blueprint Self-Review

- [x] Module architecture defines folder structure, entry points, and responsibilities.
- [x] Data models include entity fields, relationships, and API response schemas.
- [x] API contracts define method, endpoint, request, response, and auth for each route.
- [x] Backend component tree defines route → service → repository/provider hierarchy.
- [x] Integration points cover Supabase Auth, PostgreSQL, Storage, OpenRouter, and CORS.
- [x] Non-functional requirements include performance budgets, error handling, client states, security, and testing.
- [x] Product mission and roadmap priorities injected from product docs.
- [x] Applicable standards injected and referenced.
- [x] Execution order maps to 7 TIPs with dependencies.
- [x] Scope matches Vision and RRI: standalone Next.js API on Vercel, dashboard frontend-only, Supabase/OpenRouter backend-owned.
- [x] Declared gap: production CORS custom domains remain placeholders until deployment planning.

**Verdict**: PASSED — Builder can proceed to TIP generation after user approval.

---

*Builder Handoff revised: 2026-05-08 | Framework: Vibecode Kit v5.0 | Project: HLVN Serverless Backend*

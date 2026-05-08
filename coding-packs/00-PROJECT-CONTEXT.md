# HLVN Serverless — Project Context (Scan Report)

> Vibecode Kit v5.0 — BƯỚC 1 (SCAN)
> Coding workspace: D:\scripts\HLVN\HLVN-serverless
> Source bases scanned: 
>   - D:\scripts\HLVN\ocr-mobile-web (OCR Mobile Web App)
>   - D:\scripts\HLVN\HLVN-dashboard (Admin Dashboard - Design Phase)
> Scanned: 2026-05-08

---

## SCAN REPORT

### TECH_STACK

| Component | Technology | Version/Notes |
|-----------|------------|---------------|
| **Source Apps** | | |
| Mobile Frontend | React 19.2.5 + TypeScript 6.0.2 | Mobile-first OCR capture app |
| Dashboard Frontend | Next.js 15.x + TypeScript 6.0+ | Admin dashboard (design phase) |
| Build Tool | Vite 8.0.10 (mobile) / Next.js (dashboard) | Fast dev experience |
| Styling | Tailwind CSS 3.4.19 | Utility-first CSS |
| State Management | Zustand 5.0.13 | Lightweight client state |
| Local Storage | Dexie 4.4.2 (IndexedDB) | Mobile app local-first storage |
| **Current Backend (Mobile App)** | | |
| OCR API | OpenRouter | Multi-model proxy (Free/Default/High tiers) |
| Auth | bcryptjs 3.0.3 | Client-side PIN hashing (POC only) |
| Storage | IndexedDB | Local-only, no sync |
| **Target Backend (Serverless)** | | |
| Runtime | Vercel Functions / standalone serverless API | External backend consumed by dashboard + mobile app |
| API Surface | REST endpoints | Dashboard is frontend-only and calls this API |
| Database | Supabase PostgreSQL | Users, scans, analytics, audit logs with JSONB OCR payloads |
| Auth | Supabase Auth + RLS | Multi-user auth, token refresh, admin/manager/user roles |
| Storage | Supabase Storage | Uploaded scan images and signed URLs |
| OCR Provider | OpenRouter | Backend-only API keys with multi-key fallback |

### EXISTING_MODULES (Source Apps)

#### OCR Mobile Web (D:\scripts\HLVN\ocr-mobile-web)

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **Auth System** | PIN-based authentication | `store/authStore.ts`, `lib/auth.ts` |
| **Camera Capture** | Image capture + preview | `hooks/useCamera.ts`, `components/camera/` |
| **OCR Processing** | OpenRouter API integration | `lib/gemini.ts`, `lib/models.ts` |
| **Data Storage** | IndexedDB schema + operations | `db/schema.ts`, `hooks/useScans.ts` |
| **Export** | Excel + Clipboard + Share | `lib/excel.ts`, `hooks/useExport.ts`, `lib/share.ts` |
| **History** | Scan list + detail view | `pages/HistoryPage.tsx`, `pages/HistoryDetailPage.tsx` |
| **Analytics** | KPI cards + top products | `pages/AnalyticsPage.tsx` |
| **Settings** | Model tier selection | `pages/SettingsPage.tsx`, `hooks/useSettings.ts` |

#### Dashboard (D:\scripts\HLVN\HLVN-dashboard)

**Architecture**: Frontend-only Next.js 15 app (no `app/api/*` routes, no Supabase imports, no OpenRouter logic)

| Module | Status | Purpose |
|--------|--------|---------|
| **Auth Flow UI** | Requirements complete | Login page, admin gate, token storage, logout |
| **User Management UI** | Requirements complete | Table, search, filter, create/edit/delete dialogs |
| **Scan History UI** | Requirements complete | Table, filters, detail dialog, export button |
| **Analytics UI** | Requirements complete | KPI cards, charts, top tables |
| **Backend API Client** | Requirements complete | Fetch wrapper with auth, typed endpoints |

### PATTERNS_DETECTED (Source Apps)

| Pattern | Where Used | Notes |
|---------|------------|-------|
| **API retry with exponential backoff** | `ocr-mobile-web/lib/gemini.ts` | Handles 503/429 errors, reusable for serverless |
| **Multi-API-key fallback** | `ocr-mobile-web/lib/gemini.ts` | Try keys sequentially, good for rate limits |
| **JSON extraction from markdown** | `ocr-mobile-web/lib/gemini.ts` | Parse JSON from code blocks, robust parsing |
| **Excel multi-sheet export** | `ocr-mobile-web/lib/excel.ts` | Summary + Sizes + Raw OCR + Image + Billing |
| **Image compression** | `ocr-mobile-web/lib/compression.ts` | Reduce token cost before API call |
| **Field categorization** | `ocr-mobile-web/lib/fieldCategories.ts` | Group OCR fields into main/other |
| **Scan filters** | `ocr-mobile-web/lib/scanFilters.ts` | Date range + search query |
| **Protected routes** | `ocr-mobile-web/components/layout/ProtectedRoute.tsx` | Auth guard pattern |
| **Custom hooks** | `ocr-mobile-web/hooks/` | Encapsulate logic (camera, export, scans) |
| **Zustand store** | `ocr-mobile-web/store/authStore.ts` | Lightweight state management |
| **Row Level Security** | `HLVN-dashboard/coding-packs/standards/auth/supabase-auth-rls.md` | Database-level authorization |
| **JWT refresh tokens** | `HLVN-dashboard/coding-packs/standards/auth/jwt-refresh-tokens.md` | Session management pattern |
| **RBAC admin gate** | `HLVN-dashboard/coding-packs/standards/auth/rbac-admin-gate.md` | Role-based access control |
| **Password hashing** | `HLVN-dashboard/coding-packs/standards/auth/password-hashing.md` | bcrypt for passwords |

### REUSABLE_COMPONENTS (Source Apps)

| Component | Path | Purpose | Reusable for Serverless? |
|-----------|------|---------|--------------------------|
| **Retry logic** | `ocr-mobile-web/lib/gemini.ts::retryWithBackoff()` | Exponential backoff | ✅ Yes - Lambda error handling |
| **JSON extraction** | `ocr-mobile-web/lib/gemini.ts::extractJSON()` | Parse JSON from text | ✅ Yes - API response parsing |
| **Image compression** | `ocr-mobile-web/lib/compression.ts` | Reduce file size | ✅ Yes - Lambda image processing |
| **Field categorization** | `ocr-mobile-web/lib/fieldCategories.ts` | Group OCR fields | ✅ Yes - API response formatting |
| **Excel export** | `ocr-mobile-web/lib/excel.ts` | Multi-sheet workbook | ✅ Yes - Lambda bulk export |
| **Token counting** | `ocr-mobile-web/lib/gemini.ts` | Billing calculation | ✅ Yes - Cost tracking |
| **Error handling** | `ocr-mobile-web/lib/gemini.ts` | API error parsing | ✅ Yes - Lambda error responses |

### GAPS_DETECTED (Current State)

| Gap | Severity | Impact |
|-----|----------|--------|
| **No backend server** | CRITICAL | Mobile app is client-only, no multi-user support |
| **API keys in client** | CRITICAL | Exposed in browser bundle, security risk |
| **No user management** | CRITICAL | Cannot create/manage user accounts |
| **No data sync** | CRITICAL | IndexedDB is local-only, no cross-device sync |
| **No role-based access** | HIGH | No admin/manager/user distinction |
| **No audit trail** | HIGH | No tracking of who did what |
| **No backup/restore** | HIGH | Data loss if browser storage cleared |
| **No session management** | MEDIUM | Simple expiry, no refresh tokens |
| **No image storage** | MEDIUM | Images stored in IndexedDB, not scalable |
| **Limited analytics** | MEDIUM | Basic KPIs only, no trends/charts |

### CODE_HEALTH (Source Apps)

| Metric | OCR Mobile Web | Dashboard | Notes |
|--------|----------------|-----------|-------|
| TypeScript Strict | ✅ Enabled | ✅ Planned | Good type safety |
| ESLint | ✅ Configured | ✅ Planned | React rules |
| Testing | ✅ 18 test files | ⚠️ TBD | Vitest + Testing Library |
| Test Coverage | Unknown | Unknown | No coverage reports |
| Console.logs | ⚠️ Present | N/A | Debug logs in `lib/gemini.ts` |
| Hardcoded secrets | ✅ Env vars | ✅ Planned | Uses `VITE_OPENROUTER_API_KEY_*` |
| Component size | ✅ Good | N/A | Most <200 lines |
| File organization | ✅ Clear | ✅ Planned | Feature-based structure |

### ESTIMATED_SIZE (Source Apps)

| Metric | OCR Mobile Web | Dashboard |
|--------|----------------|-----------|
| Source Files | ~60 TypeScript files | Design phase |
| Pages | 9 pages | 5-7 pages (planned) |
| Components | ~20 reusable | TBD |
| Hooks | 6 custom hooks | TBD |
| Tests | 18 test files | TBD |
| LoC | ~3000-4000 | TBD |

---

## SERVERLESS BACKEND REQUIREMENTS

**IMPORTANT CLARIFICATION** (from dashboard scan 2026-05-08):
- **Dashboard is frontend-only** — Next.js 15 app with UI pages, components, forms, tables, charts
- **Dashboard has NO `app/api/*` routes** — all API endpoints live in this serverless project
- **Dashboard has NO Supabase imports** — this serverless project owns Supabase integration
- **Dashboard has NO OpenRouter logic** — this serverless project owns OCR processing
- **Dashboard calls external backend API** — this serverless project exposes REST endpoints

Based on the source apps, the serverless backend needs to provide:

### Core Features

1. **Authentication & Authorization**
   - User registration (email + password)
   - Login with JWT tokens
   - Refresh token mechanism
   - Role-based access control (admin, manager, user)
   - Session management
   - Password reset flow

2. **User Management**
   - Create/edit/delete user accounts
   - Assign roles
   - View user activity
   - User profile management

3. **OCR Processing**
   - Proxy to OpenRouter API (hide API keys from client)
   - Multi-key fallback logic
   - Retry with exponential backoff
   - Token usage tracking
   - Cost calculation

4. **Scan Management**
   - Save scan records (image + OCR + metadata)
   - List scans (with pagination, filters, search)
   - Get scan details
   - Update scan (edit fields)
   - Delete scan
   - Bulk export to Excel

5. **Image Storage**
   - Upload images to S3/Supabase Storage
   - Generate signed URLs for access
   - Image compression/optimization
   - Thumbnail generation (optional)

6. **Analytics**
   - User activity metrics
   - Scan volume trends (daily/weekly/monthly)
   - Top products across all users
   - API usage + cost tracking
   - Error rate monitoring

7. **Audit Logging**
   - Track all user actions
   - Log API calls
   - Monitor errors
   - Compliance reporting

### Technical Requirements

1. **API Endpoints**
   - RESTful API design
   - JSON request/response
   - Error handling with standard codes
   - Rate limiting
   - CORS configuration

2. **Database Schema**
   - Users table (id, email, password_hash, role, created_at, last_login)
   - Scans table (id, user_id, timestamp, image_url, ocr_structured, token_usage, edited)
   - Sessions table (id, user_id, refresh_token, expires_at)
   - Audit_logs table (id, user_id, action, resource, timestamp)
   - Analytics_cache table (id, date, metrics, updated_at)

3. **Security**
   - JWT authentication
   - Password hashing (bcrypt)
   - API key rotation
   - Rate limiting
   - Input validation
   - SQL injection prevention
   - XSS prevention

4. **Performance**
   - Lambda cold start optimization
   - Database connection pooling
   - Caching (Redis/ElastiCache optional)
   - Image CDN (CloudFront/Vercel Edge)

---

## Auto-Answered Requirements (for RRI)

These are obvious from the source apps — skip in requirements interview:

1. **Purpose**: Serverless backend for OCR mobile app + admin dashboard
2. **Source apps**: React mobile web (client-only) + Next.js dashboard (design phase)
3. **Auth**: Multi-user with JWT + refresh tokens + RBAC
4. **Data**: User accounts + scan history + analytics + audit logs
5. **OCR**: Proxy to OpenRouter API (hide keys from client)
6. **Storage**: Images in S3/Supabase Storage
7. **Database**: SQL (PostgreSQL/RDS) or NoSQL (DynamoDB)
8. **Export**: Bulk Excel export for admin

## Constraints

1. Must integrate with existing OCR mobile web app (React + TypeScript)
2. Must support admin dashboard (Next.js + TypeScript)
3. Must use serverless architecture (AWS Lambda or Vercel Functions)
4. Must support role-based access control (admin, manager, user)
5. Must track API usage + costs across users
6. Must provide audit trail for compliance
7. Must handle Vietnamese language content (OCR data)
8. Must hide OpenRouter API keys from client (security requirement)

## Risks / Tech Debt

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Lambda cold starts** | MEDIUM | Use provisioned concurrency or keep-warm strategy |
| **Database choice** | HIGH | Decide: DynamoDB (serverless) vs RDS (relational) vs Supabase (managed) |
| **Data migration** | HIGH | Design sync strategy from IndexedDB to backend |
| **API key security** | CRITICAL | Move keys to backend, implement key rotation |
| **Scalability** | MEDIUM | Design for 10-100 users initially, plan for growth |
| **Real-time sync** | MEDIUM | Start with polling, add WebSocket later if needed |
| **Image storage costs** | MEDIUM | Monitor S3/Supabase Storage usage, implement cleanup |
| **Testing strategy** | MEDIUM | Need integration tests for Lambda functions |

---

## ARCHITECTURE OPTIONS

### Option 1: AWS Lambda + DynamoDB + S3

**Pros**:
- True serverless, pay-per-use
- DynamoDB scales automatically
- S3 for image storage
- Full control over infrastructure

**Cons**:
- More complex setup (Serverless Framework, SAM, or CDK)
- DynamoDB learning curve (NoSQL)
- Cold start issues
- More DevOps overhead

### Option 2: Vercel Functions + Supabase (Recommended by Dashboard)

**Pros**:
- Simpler deployment (Git push → auto deploy)
- PostgreSQL (easier than DynamoDB for admin queries)
- Built-in auth + storage + real-time
- Free tier generous for MVP
- Row Level Security at database level

**Cons**:
- Vendor lock-in (Vercel + Supabase)
- Less control than AWS
- Function timeout limits (10s on Hobby, 60s on Pro)

### Option 3: Hybrid (AWS Lambda + Supabase)

**Pros**:
- Lambda for compute flexibility
- Supabase for database + auth + storage
- Best of both worlds

**Cons**:
- More complex networking (VPC, security groups)
- Two platforms to manage

---

## RECOMMENDED APPROACH

Based on the dashboard's tech stack decision (Vercel + Supabase), recommend:

**Option 2: Vercel Functions + Supabase**

**Rationale**:
1. Dashboard already uses Next.js + Supabase
2. Simpler deployment and maintenance
3. PostgreSQL easier for admin queries (joins, filters)
4. Built-in auth + storage reduces code
5. Free tier sufficient for MVP
6. Faster time to market

**Migration Path**:
1. Set up Supabase project (database + auth + storage)
2. Create Next.js API routes in dashboard project
3. Migrate mobile app to call backend API instead of OpenRouter directly
4. Implement JWT auth in mobile app
5. Sync IndexedDB data to Supabase (one-time migration)

---

## NEXT STEPS

1. **Confirm architecture choice** with user (Vercel + Supabase vs AWS Lambda)
2. **Run `/vibecode:rri`** to capture detailed requirements
3. **Design API schema** (endpoints, request/response formats)
4. **Design database schema** (tables, relations, indexes)
5. **Plan data migration** from IndexedDB to backend
6. **Set up Supabase project** (if chosen)
7. **Implement authentication** (JWT + refresh tokens)
8. **Implement OCR proxy** (hide API keys)
9. **Implement scan management** (CRUD operations)
10. **Implement analytics** (aggregation queries)

---

*Scan completed: 2026-05-08 | Framework: Vibecode Kit v5.0 | Project: HLVN Serverless Backend*

---

## VISION

### PROJECT TYPE: Pattern F — Enterprise Module / Internal Tool

HLVN Serverless is a secure backend control plane for warehouse OCR operations, serving both the existing mobile OCR web app and the frontend-only admin dashboard. It centralizes authentication, scan persistence, image storage, OCR proxying, analytics, and operational governance while keeping dashboard and mobile clients free of Supabase service logic and OpenRouter secrets.

### ARCHITECTURE VISION

```text
┌──────────────────────────────┐        ┌──────────────────────────────┐
│ HLVN Dashboard               │        │ OCR Mobile Web App           │
│ Next.js 15 frontend-only     │        │ React + Vite mobile-first    │
│ No app/api, no Supabase      │        │ Camera + OCR capture UX      │
└──────────────┬───────────────┘        └──────────────┬───────────────┘
               │ HTTPS REST + Bearer JWT                │ HTTPS REST + Bearer JWT
               └──────────────────┬─────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ HLVN Serverless                                                     │
│ Standalone Next.js API app on Vercel Functions                      │
│                                                                     │
│  /api/auth/*       Supabase Auth session facade                     │
│  /api/users/*      Admin user management + lockout protection       │
│  /api/scans/*      Scan CRUD, signed image URLs, full-text search   │
│  /api/ocr/process  OpenRouter OCR proxy + multi-key fallback        │
│  /api/analytics/*  KPI, trend, top products/users, API usage        │
│  /api/export/*     Direct XLSX export                               │
└──────────────┬──────────────────────┬──────────────────────┬────────┘
               │                      │                      │
               ▼                      ▼                      ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Supabase Auth        │   │ Supabase PostgreSQL  │   │ Supabase Storage     │
│ users + sessions     │   │ users/scans/cache    │   │ scan images          │
│ JWT + refresh        │   │ RLS + JSONB + FTS    │   │ signed upload/access │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ OpenRouter                                                          │
│ Backend-only API keys, retry/backoff, key fallback, token tracking  │
└─────────────────────────────────────────────────────────────────────┘
```

### UI VISION

This project is backend-first, so no primary UI is implemented in `HLVN-serverless`. The user-facing experience is expressed through stable API behavior consumed by two clients:

- **Dashboard UI**: desktop-first admin interface in `HLVN-dashboard`, with authentication, users, scans, analytics, and export surfaces.
- **Mobile UI**: capture-first OCR workflow in `ocr-mobile-web`, with backend-backed OCR processing and scan sync for new records.

For any backend-generated user-facing messages, use concise Vietnamese-friendly copy, avoid leaking provider/internal errors, and map failures to typed error codes that dashboard/mobile can render consistently.

**Design system guidance for consuming clients**:
- **Theme**: operational warehouse dashboard — clear hierarchy, high contrast, low ambiguity.
- **Color semantics**: success for completed scans, warning for provider quota/retry states, danger for delete/auth failures, neutral for metadata.
- **Typography**: dashboard should keep its selected Next.js/shadcn typography; backend exports only contract types and error messages, not UI styles.
- **Spacing/layout**: API data should support table-first dashboard layouts with pagination, filters, and detail dialogs.

### API DESIGN

**Base architecture**:
- Standalone Next.js API app deployed as separate Vercel project.
- Dashboard and mobile call this backend via `NEXT_PUBLIC_BACKEND_API_URL` / client env equivalent.
- All protected endpoints require `Authorization: Bearer <accessToken>`.

**Endpoint shape**:

```text
/api/auth/login
/api/auth/logout
/api/auth/me
/api/auth/refresh
/api/users
/api/users/:id/role
/api/scans
/api/scans/:id
/api/scans/upload-url
/api/ocr/process
/api/analytics/summary
/api/analytics/trends
/api/analytics/top-products
/api/analytics/top-users
/api/analytics/api-usage
/api/export/excel
```

**Response envelope**:

```ts
type ApiResponse<T> =
  | { success: true; data: T; meta?: ApiMeta }
  | { success: false; error: string; code: ApiErrorCode; meta?: ApiMeta };

interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}
```

**Core API rules**:
- Use typed error codes: `AUTH_FAILED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `QUOTA_EXCEEDED`, `PROVIDER_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR`.
- Validate all request bodies and query params at API boundaries.
- Enforce RBAC in service layer and RLS in database layer.
- Never expose OpenRouter keys, Supabase service role keys, raw provider payloads, stack traces, or SQL errors.
- Use TypeScript types first as the source of API contract for dashboard/mobile.
- Use direct XLSX response for MVP export.
- Use signed Supabase Storage upload URLs for scan images.

### MVP SCOPE

#### IN

| Domain | Screens / API Surfaces | Priority |
|--------|-------------------------|----------|
| Auth & RBAC | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/refresh` | P0 |
| User Management | `/api/users`, `/api/users/:id/role`, delete user | P0 |
| OCR Proxy | `/api/ocr/process`, OpenRouter fallback, token/cost tracking | P0 |
| Scan Management | `/api/scans`, `/api/scans/:id`, signed upload URL, search/filter/pagination | P0 |
| Analytics | summary, trends, top products, top users, API usage | P0/P1 |
| Export | `/api/export/excel` direct XLSX response | P0 |
| Database | users, scans, analytics_cache, JSONB, RLS, indexes, full-text search | P0 |
| Operations | Vercel env vars, Supabase setup, CORS local/staging/prod | P0 |
| Testing | unit tests, OCR proxy mocks, RLS integration tests, Excel shape tests | P0/P1 |

#### OUT (Post-MVP)

| Domain | Phase |
|--------|-------|
| Password reset flow | Phase 2 |
| API key management UI / rotation workflow | Phase 2 |
| Manager dashboard access | Phase 2 |
| Advanced analytics filters | Phase 2 |
| Bulk user operations | Phase 2 |
| Audit log UI | Phase 2 |
| Notifications | Phase 2 |
| Error rate monitoring dashboard | Phase 2 |
| Automated retention / soft-delete policy | Phase 2 |
| Real-time dashboard updates | Phase 3 |
| Multi-tenancy | Phase 3 |
| Backup / restore UI | Phase 3 |
| i18n toggle | Phase 3 |
| Dark mode / mobile dashboard | Phase 3 |

### KEY DECISIONS

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use Pattern F — Enterprise Module / Internal Tool | Backend is an internal operational control plane for warehouse OCR workflows, not a public marketing/product UI. |
| 2 | Deploy `HLVN-serverless` as standalone Next.js API app on Vercel | Matches dashboard ecosystem, keeps backend separate from frontend-only dashboard, and minimizes deployment complexity for MVP. |
| 3 | Use Supabase Auth, PostgreSQL, Storage, and RLS | Provides managed auth, relational admin queries, JSONB OCR payloads, signed image storage, and database-level authorization. |
| 4 | Keep dashboard frontend-only | Prevents duplicated backend logic, Supabase service leakage, and OpenRouter key exposure in the dashboard. |
| 5 | Use backend-only OpenRouter proxy with multi-key fallback | Removes API keys from client bundles and supports quota/provider failure resilience. |
| 6 | Use signed Supabase upload URLs for scan images | Reduces serverless payload/time pressure while keeping access controlled by backend-issued signatures. |
| 7 | Sync only new mobile scans in MVP | Avoids risky IndexedDB auto-migration complexity and keeps legacy scans local. |
| 8 | Manager role is mobile-only in MVP | Preserves simple admin-only dashboard authorization boundary; manager dashboard access can be designed later. |
| 9 | Use direct XLSX export response for MVP | Simpler than async jobs and sufficient for expected MVP data volume. |
| 10 | Use TypeScript types first for API contract | Keeps dashboard/mobile/backend aligned without requiring OpenAPI generation in MVP. |

### QUALITY GATE: Vision Self-Review

- [x] Project classified against Vibecode patterns: Pattern F — Enterprise Module / Internal Tool
- [x] Architecture vision matches RRI decisions: standalone Next.js API on Vercel + Supabase + OpenRouter
- [x] Dashboard frontend-only boundary explicitly preserved
- [x] Mobile app integration included
- [x] API design includes endpoint prefix, auth strategy, response envelope, typed errors, and validation rules
- [x] MVP scope maps to RRI domains and P0/P1 requirements
- [x] Post-MVP scope separates Phase 2 and Phase 3 work
- [x] Key decisions include rationale and match RRI decisions log
- [x] Security-critical constraints included: no client secrets, RBAC, RLS, no raw internal errors
- [x] Storage strategy included: signed Supabase upload URLs
- [x] Export strategy included: direct XLSX response
- [x] Contract strategy included: TypeScript types first
- [x] Gaps declared: exact production custom domains remain placeholders until deployment planning (`dashboard.yourdomain.com`, `mobile.yourdomain.com`)

**Verdict**: PASSED — Vision is ready for user approval before Blueprint generation.

---

*Vision completed: 2026-05-08 | Framework: Vibecode Kit v5.0 | Project: HLVN Serverless Backend | Next step after approval: `/vibecode:blueprint`*

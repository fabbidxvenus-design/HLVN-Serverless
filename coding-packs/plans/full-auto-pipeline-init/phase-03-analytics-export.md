# Phase 03: Analytics + Export + Deployment Hardening

## Overview
Implement admin analytics endpoints, direct Excel export, tests coverage, env validation, CORS verification, and deployment docs.

## Source TIPs
- `coding-packs/tips/TIP-006-analytics-export-apis.md`
- `coding-packs/tips/TIP-007-tests-deployment-hardening.md`

## Requirements

### API Endpoints Required

#### Analytics Endpoints
```text
GET /api/analytics/summary?from=&to=
Response: { totalScans: number; activeUsers: number; apiCost: number; successRate: number }
Auth: admin

GET /api/analytics/trends?from=&to=&bucket=day|week|month
Response: { points: Array<{ label: string; scans: number; cost: number }> }
Auth: admin

GET /api/analytics/top-products?from=&to=&limit=
Response: { products: Array<{ name: string; count: number; lastSeen: string }> }
Auth: admin

GET /api/analytics/top-users?from=&to=&limit=
Response: { users: Array<{ userId: string; email: string; scanCount: number; cost: number }> }
Auth: admin

GET /api/analytics/api-usage?from=&to=
Response: { keys: Array<{ apiKeyIndex: number; calls: number; inputTokens: number; outputTokens: number; cost: number }> }
Auth: admin
```

#### Export Endpoint
```text
POST /api/export/excel
Request: { search?: string; userId?: string; from?: string; to?: string }
Response: XLSX binary file
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment
Auth: admin
Rules: Direct XLSX response, row cap for MVP.
```

### File Structure
```
app/api/
├── analytics/
│   ├── summary/route.ts
│   ├── trends/route.ts
│   ├── top-products/route.ts
│   ├── top-users/route.ts
│   └── api-usage/route.ts
└── export/
    └── excel/route.ts

lib/
├── analytics/
│   ├── repository.ts
│   └── service.ts
└── export/
    └── excel.ts

tests/
├── api/
│   ├── analytics.test.ts
│   └── export-excel.test.ts
├── services/
│   ├── analytics.test.ts
│   └── excel.test.ts
├── integration/
│   ├── auth-boundaries.test.ts
│   ├── scan-boundaries.test.ts
│   ├── rls-boundaries.test.ts
│   └── export-boundaries.test.ts
└── fixtures/
    ├── users.ts
    ├── scans.ts
    └── ocr.ts

lib/
└── env.ts  ← env validation
```

### Excel Export Structure
Multi-sheet workbook format:
1. **Summary** — Metadata + main fields table
2. **Sizes** — Size | Quantity table
3. **Raw OCR** — Full OCR text
4. **Image** — Embedded image (if available)
5. **Billing** — Token usage + cost per scan

### Analytics Business Rules
1. All analytics endpoints are admin-only
2. Date range filters use `from` and `to` (ISO format)
3. Empty ranges return zero/empty datasets, not errors
4. Bucket options: 'day', 'week', 'month' (default 'day')
5. Limit defaults to 10, max configurable

### Env Validation Requirements
```typescript
interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENROUTER_KEY_1: string;  // At minimum 1 key required
  CORS_ORIGINS: string;     // Comma-separated
}
```

### CORS Configuration
Allowed origins:
- Local: `http://localhost:3000`, `http://localhost:5173`
- Staging: `https://dashboard-staging.vercel.app`, `https://mobile-staging.vercel.app`
- Production: placeholders until domain confirmed

## Implementation Steps

### STEP 1: Analytics Endpoints
1. `app/api/analytics/summary/route.ts`
2. `app/api/analytics/trends/route.ts`
3. `app/api/analytics/top-products/route.ts`
4. `app/api/analytics/top-users/route.ts`
5. `app/api/analytics/api-usage/route.ts`
6. `lib/analytics/repository.ts`
7. `lib/analytics/service.ts`

### STEP 2: Excel Export
1. `app/api/export/excel/route.ts`
2. `lib/export/excel.ts`

### STEP 3: Env Validation
1. `lib/env.ts`

### STEP 4: Integration Tests
1. `tests/integration/auth-boundaries.test.ts`
2. `tests/integration/scan-boundaries.test.ts`
3. `tests/integration/rls-boundaries.test.ts`
4. `tests/integration/export-boundaries.test.ts`

### STEP 5: Fixtures
1. `tests/fixtures/users.ts`
2. `tests/fixtures/scans.ts`
3. `tests/fixtures/ocr.ts`

### STEP 6: Documentation
1. `README.md` — Local setup, migration workflow, env vars, test commands, deployment
2. Update `.env.example`

## Acceptance Criteria
- [ ] Analytics endpoints return aggregated data
- [ ] Excel export produces multi-sheet workbook
- [ ] Admin-only access enforced on analytics/export
- [ ] Empty date ranges return zero/empty datasets
- [ ] Env validation fails fast with clear messages
- [ ] CORS works for allowed origins, rejects unknown
- [ ] Integration tests cover RBAC/RLS boundaries
- [ ] Unit tests meet 80%+ coverage target
- [ ] Build passes with no TypeScript/lint errors
- [ ] README documents deployment workflow

## Todo
- [ ] Implement analytics endpoints
- [ ] Implement Excel export
- [ ] Add env validation
- [ ] Write integration tests
- [ ] Create test fixtures
- [ ] Write README documentation
- [ ] Run quality gates
- [ ] Final build verification

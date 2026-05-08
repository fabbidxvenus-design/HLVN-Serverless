# HLVN Serverless — Auto Pipeline Plan

> zflow plan-supervised mode: run all 7 TIPs via 3 phases

## Pipeline Overview

| Phase | Name | TIPs | Status | Estimated |
|-------|------|------|--------|-----------|
| 01 | Foundation | TIP-001, TIP-002 | ⏳ Pending | 14h |
| 02 | Core APIs | TIP-003, TIP-004, TIP-005 | ⏳ Pending | 30h |
| 03 | Analytics + Export | TIP-006, TIP-007 | ⏳ Pending | 20h |

**Total**: 64h (~8 days)

## Source Documents

- **Builder Handoff**: `coding-packs/BUILDER-HANDOFF.md`
- **TIPs**: `coding-packs/tips/TIP-001..007`
- **Standards**: `coding-packs/standards/**/*.md`

## Phase Files

```
plans/full-auto-pipeline-init/
├── phase-01-foundation.md      ← Foundation + Supabase Schema
├── phase-02-core-apis.md      ← Auth + Users + Scans + OCR
├── phase-03-analytics-export.md ← Analytics + Export + Hardening
├── README.md                  ← This file
├── .zflow/
│   └── pipeline.json          ← Pipeline state
├── specs/                     ← G/W/T specs (generated)
├── tips/                      ← Human-readable TIPs (generated)
└── progress.json              ← Step progress
```

## How to Run

### Run Full Pipeline
```bash
zflow --plan D:\scripts\HLVN\HLVN-serverless\coding-packs\plans\full-auto-pipeline-init
```

### Run Phase-by-Phase
```bash
# Phase 01: Foundation
zflow --plan D:\scripts\HLVN\HLVN-serverless\coding-packs\plans\full-auto-pipeline-init --phase phase-01-foundation.md

# Phase 02: Core APIs (after phase-01 complete)
zflow --plan D:\scripts\HLVN\HLVN-serverless\coding-packs\plans\full-auto-pipeline-init --phase phase-02-core-apis.md

# Phase 03: Analytics + Export (after phase-02 complete)
zflow --plan D:\scripts\HLVN\HLVN-serverless\coding-packs\plans\full-auto-pipeline-init --phase phase-03-analytics-export.md
```

### Resume After Interrupt
```bash
zflow --plan D:\scripts\HLVN\HLVN-serverless\coding-packs\plans\full-auto-pipeline-init --resume
```

## Phase Dependencies

```
phase-01-foundation
        │
        ▼
phase-02-core-apis ─────────────────────────────┐
        │                                      │
        ▼                                      ▼
phase-03-analytics-export ← TIP-004 + TIP-005 │
```

**Critical Path**: phase-01 → phase-02 → phase-03 (56h)

**Parallel Opportunity**: TIP-004 and TIP-005 can run in parallel within phase-02.

## Tier & Resources

- **Complexity Score**: 75 (STANDARD tier)
- **Models**: Sonnet (implementation) + Opus (planning/review)
- **Parallelization**: High speed mode
- **Coverage Target**: 80%+ for core modules

## Quality Gates

### Phase 01 — Foundation
- [ ] Typecheck passes
- [ ] ApiResponse envelope matches BUILDER-HANDOFF
- [ ] Validation helpers deterministic
- [ ] CORS works for allowed origins
- [ ] Migrations create schema with indexes
- [ ] RLS policies enforced
- [ ] RBAC: admin-only dashboard
- [ ] Unit tests pass

### Phase 02 — Core APIs
- [ ] Auth endpoints functional
- [ ] User CRUD with last-admin protection
- [ ] Scan CRUD with owner/admin access
- [ ] Signed upload URL generation
- [ ] OCR proxy with retry + key fallback
- [ ] Token usage tracking
- [ ] API tests pass
- [ ] Service tests pass

### Phase 03 — Analytics + Export
- [ ] Analytics endpoints return aggregated data
- [ ] Excel export multi-sheet workbook
- [ ] Admin-only access on analytics/export
- [ ] Empty date ranges return zero/empty datasets
- [ ] Env validation fails fast
- [ ] CORS rejects unknown origins
- [ ] Integration tests cover RBAC/RLS boundaries
- [ ] Unit tests meet 80%+ coverage
- [ ] Build passes
- [ ] README documents deployment

## Known Scope Boundaries

### In MVP Scope
- Standalone Next.js API on Vercel
- Supabase Auth + PostgreSQL + Storage
- OpenRouter OCR proxy with multi-key fallback
- Admin user management
- Scan CRUD with signed image upload
- Basic analytics + direct XLSX export
- Unit/integration tests

### Out of MVP Scope (Phase 2+)
- Password reset flow
- API key management UI
- Manager dashboard access
- Advanced analytics filters
- Bulk user operations
- Audit log UI
- Notifications
- Error-rate monitoring dashboard
- Automated retention policy
- Real-time updates
- E2E Playwright tests
- Multi-language (EN/VI)
- OAuth providers
- Multi-tenancy
- Custom OCR models

## Files to Implement

```
HLVN-serverless/
├── app/
│   ├── api/
│   │   ├── health/route.ts
│   │   ├── auth/{login,logout,me,refresh}/route.ts
│   │   ├── users/{route,[id]/route.ts,[id]/role/route.ts}
│   │   ├── scans/{route.ts,upload-url/route.ts,[id]/route.ts}
│   │   ├── ocr/process/route.ts
│   │   ├── analytics/{summary,trends,top-products,top-users,api-usage}/route.ts
│   │   └── export/excel/route.ts
│   └── ...
├── lib/
│   ├── api/{errors,response,validation,cors}.ts
│   ├── auth/{session,rbac,supabase-auth}.ts
│   ├── supabase/{admin,user-client,storage}.ts
│   ├── users/{repository,service}.ts
│   ├── scans/{repository,service,search}.ts
│   ├── ocr/{openrouter,retry,key-fallback,parse,token-usage}.ts
│   ├── analytics/{repository,service}.ts
│   ├── export/excel.ts
│   └── env.ts
├── types/
│   ├── api.ts, auth.ts, user.ts, scan.ts, ocr.ts, analytics.ts
├── supabase/migrations/
│   ├── 001_init_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_search_indexes.sql
├── tests/
│   ├── api/
│   ├── services/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── .env.example
└── README.md
```

## Next Step

Run the first phase:
```bash
zflow --plan D:\scripts\HLVN\HLVN-serverless\coding-packs\plans\full-auto-pipeline-init --phase phase-01-foundation.md --speed=high
```

# TIP-006: Analytics + Export APIs

## HEADER
- TIP-ID: TIP-006
- Project: HLVN Serverless Backend
- Module: Analytics + Export APIs
- Priority: P0
- Depends on: TIP-004, TIP-005
- Estimated: L (10h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Next.js API Routes, Supabase PostgreSQL JSONB, ExcelJS, TypeScript strict, Vitest.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/standards/database/postgresql-jsonb-schema.md`
  - `coding-packs/standards/export/excel-multi-sheet.md`
  - `coding-packs/standards/auth/rbac-admin-gate.md`
- Patterns to follow:
  - Admin-only dashboard data endpoints.
  - `from`/`to` query parameter names are source of truth.
  - Direct XLSX response for MVP.

## APPLICABLE STANDARDS
Builder MUST conform.
- [database/postgresql-jsonb-schema](../standards/database/postgresql-jsonb-schema.md) — indexed scan data and JSONB aggregation.
- [export/excel-multi-sheet](../standards/export/excel-multi-sheet.md) — workbook structure and styling rules.
- [auth/rbac-admin-gate](../standards/auth/rbac-admin-gate.md) — analytics/export are admin-only.

## TASK
Implement admin analytics endpoints and direct Excel export. This TIP gives the dashboard aggregated operational metrics, usage/cost visibility, top products/users, trends, and a multi-sheet XLSX download using persisted scans and OCR token data.

## SPECIFICATIONS

### Files to Create or Modify
- `app/api/analytics/summary/route.ts`
- `app/api/analytics/trends/route.ts`
- `app/api/analytics/top-products/route.ts`
- `app/api/analytics/top-users/route.ts`
- `app/api/analytics/api-usage/route.ts`
- `app/api/export/excel/route.ts`
- `lib/analytics/repository.ts`
- `lib/analytics/service.ts`
- `lib/export/excel.ts`
- `tests/api/analytics.test.ts`
- `tests/api/export-excel.test.ts`
- `tests/services/analytics.test.ts`
- `tests/services/excel.test.ts`

### Business Rules
1. All analytics endpoints are admin-only.
2. All export endpoints are admin-only.
3. Date range filters use query/body fields `from` and `to`.
4. `GET /api/analytics/summary?from=&to=` returns `{ totalScans, activeUsers, apiCost, successRate }`.
5. `GET /api/analytics/trends?from=&to=&bucket=day|week|month` returns trend points.
6. `GET /api/analytics/top-products?from=&to=&limit=` extracts product/title data from OCR JSONB.
7. `GET /api/analytics/top-users?from=&to=&limit=` aggregates scans and cost per user.
8. `GET /api/analytics/api-usage?from=&to=` aggregates calls, input tokens, output tokens, and cost per `apiKeyIndex`.
9. `POST /api/export/excel` accepts `{ search?, userId?, from?, to? }` and returns XLSX binary.
10. Excel export must include Summary, Sizes, Raw OCR, Image, and Billing sheets where data exists.

### Validation
1. `from` and `to` must be valid ISO dates when present.
2. If both are present, `from` must be before or equal to `to`.
3. `bucket` must be `day`, `week`, or `month`; default to `day`.
4. `limit` must be positive and capped at a safe maximum, default 10.
5. Export filters must reuse scan list validation semantics from TIP-004.
6. Export must enforce a safe MVP row cap; if cap is exceeded, return a safe validation error instructing narrower filters.

### Error Handling
1. Missing/invalid auth returns `AUTH_FAILED`.
2. Non-admin access returns `FORBIDDEN`.
3. Invalid date range/filter returns `VALIDATION_ERROR`.
4. Empty analytics ranges return successful zero/empty datasets, not errors.
5. Excel generation failure returns safe `INTERNAL_ERROR` and logs server context.
6. Do not leak SQL errors, stack traces, or scan image private paths.

## ACCEPTANCE CRITERIA
- Given admin token and existing scans When `/api/analytics/summary?from=&to=` is called Then totals, active users, cost, and success rate are returned.
- Given non-admin token When any analytics endpoint is called Then response is `FORBIDDEN`.
- Given no scans in date range When analytics endpoints are called Then response succeeds with zero totals or empty arrays.
- Given scans with OCR titles When top-products endpoint is called Then products are aggregated from OCR structured data.
- Given scans with token usage When api-usage endpoint is called Then usage is grouped by `apiKeyIndex`.
- Given admin token and export filters When `/api/export/excel` is called Then response has XLSX content type and attachment disposition.
- Given exported workbook When inspected in tests Then required sheets and key columns exist.
- Given export result exceeds MVP row cap When request is made Then response is `VALIDATION_ERROR` with safe message.

## CONSTRAINTS
- DO NOT implement async/background export jobs; direct XLSX response is MVP decision.
- DO NOT expose analytics to manager/user roles in MVP.
- DO NOT change scan API parameter names; use `from` and `to` only.
- DO NOT load unbounded scans into memory; enforce row caps and filtered queries.
- REUSE scan repository/search filters from TIP-004 where practical.
- SKIP advanced analytics filters and audit log UI; defer to Phase 2.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to analytics/export APIs.
- [x] Files and endpoint contracts are explicit.
- [x] Acceptance criteria cover admin gate, empty state, aggregation, and XLSX output.
- [x] Applicable standards are listed.
- [x] Scope excludes async jobs and frontend work.

**Verdict**: PASSED — Ready for implementation after TIP-004 and TIP-005.

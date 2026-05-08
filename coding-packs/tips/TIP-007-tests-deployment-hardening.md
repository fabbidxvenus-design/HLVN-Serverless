# TIP-007: Tests + Deployment Hardening

## HEADER
- TIP-ID: TIP-007
- Project: HLVN Serverless Backend
- Module: Tests + Deployment Hardening
- Priority: P0
- Depends on: TIP-003, TIP-004, TIP-005, TIP-006
- Estimated: L (10h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Vercel deployment, Next.js 15 API Routes, Supabase, OpenRouter env keys, Vitest, ESLint, Prettier.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/02-TASK-GRAPH.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/product/tech-stack.md`
- Patterns to follow:
  - Quality gates from Builder Handoff.
  - No endpoint is considered complete without auth/validation/error tests.
  - Deployment docs must not contain secrets.

## APPLICABLE STANDARDS
Builder MUST conform.
- [api/multi-key-fallback](../standards/api/multi-key-fallback.md) — verify provider key fallback behavior.
- [api/retry-backoff](../standards/api/retry-backoff.md) — verify retry boundaries.
- [auth/rbac-admin-gate](../standards/auth/rbac-admin-gate.md) — verify role boundaries.
- [auth/supabase-auth-rls](../standards/auth/supabase-auth-rls.md) — verify RLS boundaries.
- [database/postgresql-jsonb-schema](../standards/database/postgresql-jsonb-schema.md) — verify schema/index assumptions.
- [export/excel-multi-sheet](../standards/export/excel-multi-sheet.md) — verify workbook sheets.

## TASK
Complete project-wide quality hardening without adding new product features. Add missing unit/integration coverage, environment validation, production CORS verification, deployment documentation, and final quality checks so the backend is ready for staging deployment.

## SPECIFICATIONS

### Files to Create or Modify
- `lib/env.ts`
- `tests/integration/auth-boundaries.test.ts`
- `tests/integration/scan-boundaries.test.ts`
- `tests/integration/rls-boundaries.test.ts`
- `tests/integration/export-boundaries.test.ts`
- `tests/fixtures/users.ts`
- `tests/fixtures/scans.ts`
- `tests/fixtures/ocr.ts`
- `README.md`
- `.env.example`
- `vercel.json` if needed for runtime/header configuration.
- Existing test files from TIP-001 through TIP-006 as needed to fill coverage gaps.

### Business Rules
1. Required env vars must be validated at startup or first server access with clear server-side errors.
2. `.env.example` must include all required variables with placeholder values only.
3. CORS must allow local, staging, and production origins from configuration and reject arbitrary origins.
4. Tests must cover core unit, route, and integration boundaries from all MVP TIPs.
5. Coverage target is 80%+ for core modules where feasible in local tooling.
6. README must document local setup, Supabase migration workflow, env vars, test commands, and Vercel deployment steps.
7. Deployment docs must make dashboard/mobile frontend-only boundary explicit.

### Validation
1. Validate presence of Supabase URL, anon key, service role key, OpenRouter key(s), CORS origins, and relevant runtime config.
2. Validate OpenRouter key discovery handles `OPENROUTER_KEY_1..N` consistently.
3. Validate CORS origins are parsed from env into an allowlist without whitespace bugs.
4. Validate test fixtures use safe fake data and no real secrets.

### Error Handling
1. Missing env vars must fail fast in server logs but return safe client `INTERNAL_ERROR` when hit through a request.
2. Test setup failures must be explicit; do not skip critical integration tests silently.
3. If local Supabase integration cannot run in current environment, document exact command/setup needed and keep unit/route boundary tests passing.
4. Deployment README must warn that service-role and OpenRouter keys are server-only.

## ACCEPTANCE CRITERIA
- Given the repo is freshly cloned When following README local setup Then required env vars and setup steps are clear.
- Given `.env.example` is inspected When comparing against runtime env validation Then every required variable has a placeholder entry.
- Given tests run When `npm test` or project test command completes Then unit and route tests pass.
- Given coverage command runs When coverage is reported Then core modules meet or approach 80%; any unavoidable gap is documented with reason.
- Given admin/user/manager fixtures When integration boundary tests run Then admin, owner, and forbidden paths behave as specified.
- Given CORS tests run When unknown origin is supplied Then response does not allow it.
- Given export tests run When workbook is generated Then required sheets from the export standard are present.
- Given build command runs When production build completes Then no TypeScript or lint errors remain.

## CONSTRAINTS
- DO NOT add new product features beyond tests, env validation, CORS hardening, and deployment docs.
- DO NOT commit or print real secrets.
- DO NOT weaken auth/RLS policies to make tests pass.
- DO NOT skip failing tests without documenting and fixing root cause.
- REUSE existing helper modules and fixtures; avoid large duplicated test setup.
- SKIP E2E Playwright tests for MVP unless already trivial; task graph defers E2E to Phase 2.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to hardening/readiness.
- [x] Files and checks are explicit.
- [x] Acceptance criteria cover tests, env, CORS, docs, and build readiness.
- [x] Applicable standards include all prior domains.
- [x] Scope excludes new product features.

**Verdict**: PASSED — Ready for implementation after TIP-003 through TIP-006.

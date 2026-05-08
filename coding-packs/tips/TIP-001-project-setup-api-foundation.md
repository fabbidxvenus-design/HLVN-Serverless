# TIP-001: Project Setup + API Foundation

## HEADER
- TIP-ID: TIP-001
- Project: HLVN Serverless Backend
- Module: Project Setup + API Foundation
- Priority: P0
- Depends on: none
- Estimated: M (6h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Vercel, Next.js 15 API Routes, TypeScript strict, Supabase JS v2, Vitest, ESLint, Prettier.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/product/tech-stack.md`
- Patterns to follow:
  - API envelope from `coding-packs/BUILDER-HANDOFF.md` lines 261-284.
  - Route → service → repository/provider layering from Builder Handoff.

## APPLICABLE STANDARDS
Builder MUST conform.
- [api/retry-backoff](../standards/api/retry-backoff.md) — shared retry primitives must be compatible with later OpenRouter/Supabase usage.

## TASK
Initialize the standalone Next.js API backend foundation without implementing feature endpoints yet. Create the project structure, strict TypeScript setup, test/lint tooling, shared API response utilities, shared domain types, validation helpers, and CORS helpers required by later TIPs.

## SPECIFICATIONS

### Files to Create or Modify
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `vitest.config.ts`
- `.env.example`
- `.gitignore`
- `app/api/health/route.ts`
- `lib/api/response.ts`
- `lib/api/errors.ts`
- `lib/api/validation.ts`
- `lib/api/cors.ts`
- `types/api.ts`
- `types/auth.ts`
- `types/user.ts`
- `types/ocr.ts`
- `types/scan.ts`
- `types/analytics.ts`
- `tests/api/response.test.ts`
- `tests/api/validation.test.ts`
- `tests/api/cors.test.ts`

### Business Rules
1. Backend project is standalone and owns all `app/api/*` routes.
2. All JSON endpoints must use `ApiResponse<T>` envelope.
3. Error responses must use typed `ApiErrorCode` values only.
4. Pagination metadata must support `{ page, limit, total, hasMore }`.
5. Health route must not expose secrets, env values, database URLs, or provider details.
6. `.env.example` must list required variables without real values.

### Validation
1. Add reusable validation helpers for required strings, email, positive integer pagination, ISO date strings, enum values, file content type, and file size.
2. Validation helpers must return structured validation errors that route handlers can map to `VALIDATION_ERROR`.
3. Validate only at route/system boundaries; do not over-validate internal typed data.

### Error Handling
1. `ok(data, meta?)` returns `{ success: true, data, meta? }`.
2. `fail(error, code, status, meta?)` returns safe error response and HTTP status.
3. Do not leak stack traces, raw provider errors, SQL errors, or env state.
4. Unexpected errors should map to `INTERNAL_ERROR` with a generic message.

## ACCEPTANCE CRITERIA
- Given the project is empty When dependencies and config are installed Then `npm run typecheck` succeeds.
- Given shared response utilities When unit tests run Then success and error envelopes match the Builder Handoff contract exactly.
- Given invalid pagination inputs When validation helpers are called Then they return deterministic validation errors.
- Given an OPTIONS request When CORS helper handles an allowed origin Then it returns the configured CORS headers.
- Given an unknown origin When CORS helper handles the request Then it does not reflect arbitrary origins.
- Given `/api/health` is called When the service is running Then it returns a safe success envelope without secrets.

## CONSTRAINTS
- DO NOT implement auth, users, scans, OCR, analytics, export, Supabase clients, or database migrations in this TIP.
- DO NOT hardcode production domains as final values; use env-driven allowlists plus documented placeholders.
- DO NOT create dashboard/mobile client code in this repo.
- REUSE the exact `ApiResponse`, `ApiMeta`, and `ApiErrorCode` contract from `BUILDER-HANDOFF.md`.
- SKIP deployment setup beyond local scripts and `.env.example`.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to foundation setup.
- [x] Files to create/modify are explicit.
- [x] Acceptance criteria use Given/When/Then.
- [x] Constraints define forbidden scope.
- [x] Applicable standards are listed.
- [x] No implementation code is included beyond interface-level requirements.

**Verdict**: PASSED — Ready for implementation after user approval.

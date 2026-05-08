# TIP-004: Storage + Scan APIs

## HEADER
- TIP-ID: TIP-004
- Project: HLVN Serverless Backend
- Module: Storage + Scan APIs
- Priority: P0
- Depends on: TIP-003
- Estimated: XL (12h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Next.js API Routes, Supabase PostgreSQL, Supabase Storage, Supabase JS v2, TypeScript strict.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/standards/database/postgresql-jsonb-schema.md`
  - `coding-packs/standards/auth/rbac-admin-gate.md`
  - `coding-packs/standards/auth/supabase-auth-rls.md`
- Patterns to follow:
  - Admin can access all scans; non-admin can access own scans only.
  - Search uses PostgreSQL full-text search and indexed filters.

## APPLICABLE STANDARDS
Builder MUST conform.
- [database/postgresql-jsonb-schema](../standards/database/postgresql-jsonb-schema.md) — scans table JSONB, indexes, full-text search.
- [auth/supabase-auth-rls](../standards/auth/supabase-auth-rls.md) — owner/admin access boundaries.
- [auth/rbac-admin-gate](../standards/auth/rbac-admin-gate.md) — admin-only destructive/bulk access.

## TASK
Implement signed upload URL generation and scan CRUD APIs. This TIP enables mobile/dashboard clients to upload images to Supabase Storage and create, list, view, edit, and delete scan records with proper owner/admin authorization.

## SPECIFICATIONS

### Files to Create or Modify
- `app/api/scans/upload-url/route.ts`
- `app/api/scans/route.ts`
- `app/api/scans/[id]/route.ts`
- `lib/scans/repository.ts`
- `lib/scans/service.ts`
- `lib/scans/search.ts`
- `lib/supabase/storage.ts`
- `tests/api/scans.test.ts`
- `tests/services/scans.test.ts`
- `tests/services/storage.test.ts`

### Business Rules
1. `POST /api/scans/upload-url` requires authentication.
2. Upload URL request accepts `{ fileName, contentType, sizeBytes }`.
3. Allowed image types are `image/jpeg`, `image/png`, and `image/webp`.
4. Storage path must include authenticated user ID and a generated UUID to avoid collisions.
5. `GET /api/scans` supports `page`, `limit`, `search`, `userId`, `from`, and `to`.
6. Admin can list/filter scans for any user; non-admin can only list own scans and cannot override `userId` to another user.
7. `POST /api/scans` creates a scan owned by the authenticated user.
8. `GET /api/scans/:id` allows owner or admin.
9. `PATCH /api/scans/:id` allows owner or admin and marks edited OCR data.
10. `DELETE /api/scans/:id` is admin-only and deletes scan metadata plus associated storage object when possible.

### Validation
1. File name must be present, bounded length, and sanitized for storage path usage.
2. Content type must be one of the allowed image types.
3. `sizeBytes` must be positive and below the configured max image size.
4. `ocrRaw` must be non-empty for scan creation.
5. `ocrStructured.fields` and `ocrStructured.sizes` must be arrays.
6. `tokenUsage.input`, `tokenUsage.output`, and `tokenUsage.cost` must be non-negative numbers.
7. `apiKeyIndex` must be a positive integer.
8. `from` and `to` must be valid ISO date strings when present.
9. Pagination must use safe defaults and maximum limit 100.

### Error Handling
1. Missing/invalid auth returns `AUTH_FAILED`.
2. Ownership or role violation returns `FORBIDDEN`.
3. Invalid body/query/path param returns `VALIDATION_ERROR`.
4. Missing scan returns `NOT_FOUND`.
5. Supabase Storage failures return safe `INTERNAL_ERROR` unless caused by validation.
6. Storage object deletion failure must be logged and handled explicitly; do not silently swallow it.

## ACCEPTANCE CRITERIA
- Given an authenticated user When requesting upload URL with valid image metadata Then response includes `uploadUrl`, `storagePath`, optional `publicUrl`, and `expiresAt`.
- Given invalid content type When requesting upload URL Then response is `VALIDATION_ERROR`.
- Given a normal user When creating a scan Then the scan is saved with their `userId`.
- Given a normal user When listing scans with another `userId` Then only their own scans are returned or request is rejected.
- Given an admin When listing scans with `userId`, `from`, `to`, and `search` Then matching scans and pagination meta are returned.
- Given owner or admin When patching a scan Then updated `ocrStructured` is returned and `edited` is true.
- Given non-admin user When deleting a scan Then response is `FORBIDDEN`.
- Given admin deletes a scan When storage object exists Then database row and image object are removed or storage failure is explicitly reported/logged.

## CONSTRAINTS
- DO NOT implement OpenRouter OCR processing in this TIP; scan creation receives already processed OCR payload.
- DO NOT implement analytics/export endpoints.
- DO NOT allow clients to choose arbitrary storage paths.
- DO NOT return signed service-role credentials or storage secrets.
- REUSE auth/session/RBAC helpers from TIP-002 and users profile from TIP-003.
- SKIP real-time updates and retention automation; both are Phase 2.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to storage/scans APIs.
- [x] Files and endpoint contracts are explicit.
- [x] Acceptance criteria cover owner/admin access, validation, and storage handling.
- [x] Applicable standards are listed.
- [x] Scope excludes OCR provider, analytics, and export.

**Verdict**: PASSED — Ready for implementation after TIP-003.

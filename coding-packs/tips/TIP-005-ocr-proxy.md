# TIP-005: OCR Proxy

## HEADER
- TIP-ID: TIP-005
- Project: HLVN Serverless Backend
- Module: OCR Proxy
- Priority: P0
- Depends on: TIP-003
- Estimated: L (8h)

## CONTEXT
- Working dir: `D:\scripts\HLVN\HLVN-serverless`
- Tech stack: authoritative stack from `coding-packs/product/tech-stack.md` — Next.js API Routes on Vercel, OpenRouter as backend-only OCR provider, TypeScript strict, Vitest.
- Key files to read first:
  - `coding-packs/BUILDER-HANDOFF.md`
  - `coding-packs/01-REQUIREMENTS-MATRIX.md`
  - `coding-packs/standards/api/multi-key-fallback.md`
  - `coding-packs/standards/api/retry-backoff.md`
- Patterns to follow:
  - Backend-only provider calls.
  - Multiple OpenRouter keys from env.
  - Safe typed provider error mapping.

## APPLICABLE STANDARDS
Builder MUST conform.
- [api/multi-key-fallback](../standards/api/multi-key-fallback.md) — backend-managed OpenRouter keys and fallback.
- [api/retry-backoff](../standards/api/retry-backoff.md) — exponential backoff for transient provider failures.
- [auth/supabase-auth-rls](../standards/auth/supabase-auth-rls.md) — authenticated endpoint boundary.

## TASK
Implement the authenticated OCR proxy endpoint and provider layer. This TIP moves OCR processing behind the backend, protects OpenRouter keys, parses structured OCR output, tracks token usage/cost, and returns a typed OCR response for mobile clients.

## SPECIFICATIONS

### Files to Create or Modify
- `app/api/ocr/process/route.ts`
- `lib/ocr/openrouter.ts`
- `lib/ocr/retry.ts`
- `lib/ocr/key-fallback.ts`
- `lib/ocr/parse.ts`
- `lib/ocr/token-usage.ts`
- `tests/api/ocr.test.ts`
- `tests/services/ocr-retry.test.ts`
- `tests/services/ocr-key-fallback.test.ts`
- `tests/services/ocr-parse.test.ts`
- `tests/services/token-usage.test.ts`

### Business Rules
1. `POST /api/ocr/process` requires authentication.
2. Request accepts exactly one image source: `imageBase64` or `imageUrl`.
3. Optional `modelTier` supports `free`, `default`, and `high`.
4. OpenRouter keys must be read from server env only: `OPENROUTER_KEY_1`, `OPENROUTER_KEY_2`, etc.
5. Backend tries keys in order and records the successful `apiKeyIndex`.
6. Retry transient provider failures using exponential backoff.
7. Do not retry invalid input or invalid credentials errors.
8. Response returns `{ ocrRaw, ocrStructured, tokenUsage, apiKeyIndex, model }`.
9. Provider raw response must be normalized into `OCRStructured` with `fields`, `sizes`, optional `title`, `rawText`, and `notes`.
10. Token/cost calculation must be deterministic and test-covered.

### Validation
1. Reject requests with both `imageBase64` and `imageUrl`.
2. Reject requests with neither `imageBase64` nor `imageUrl`.
3. Validate base64 payload length against configured max request size.
4. Validate `imageUrl` scheme is HTTPS unless local development explicitly allows otherwise.
5. Validate `modelTier` enum.
6. Validate at least one OpenRouter key exists at startup or first provider call.

### Error Handling
1. Missing/invalid auth returns `AUTH_FAILED`.
2. Invalid image input returns `VALIDATION_ERROR`.
3. All keys quota-exhausted returns `QUOTA_EXCEEDED` or `PROVIDER_ERROR` depending on provider status.
4. Provider timeout/503 after retries returns `PROVIDER_ERROR` with safe message.
5. Invalid provider key configuration returns `INTERNAL_ERROR` without exposing key names or values.
6. Provider raw errors and payloads must not be returned to clients.

## ACCEPTANCE CRITERIA
- Given authenticated user and valid `imageBase64` When OCR endpoint is called Then response includes raw text, structured OCR, token usage, key index, and model.
- Given both `imageBase64` and `imageUrl` When OCR endpoint is called Then response is `VALIDATION_ERROR`.
- Given first OpenRouter key returns quota error When second key succeeds Then response uses second key and reports `apiKeyIndex: 2`.
- Given provider returns 503 once then succeeds When retry logic runs Then endpoint eventually succeeds without trying another key unnecessarily.
- Given all keys fail with retryable provider errors When retries complete Then response is safe `PROVIDER_ERROR`.
- Given provider output is malformed When parser runs Then it returns a safe structured fallback plus raw OCR text, not a thrown uncaught error.

## CONSTRAINTS
- DO NOT expose OpenRouter keys, request payload internals, or raw provider error messages.
- DO NOT let mobile/dashboard call OpenRouter directly.
- DO NOT create scan records in this TIP; scan persistence belongs to TIP-004.
- DO NOT implement rate limiting yet; leave boundary clean for Phase 2.
- REUSE response, validation, and auth helpers from TIP-001/TIP-002.
- SKIP image upload; use `imageUrl` or `imageBase64` input only.

## QUALITY GATE: TIP Self-Review
- [x] TIP is cohesive and limited to OCR proxy/provider logic.
- [x] Files and endpoint contract are explicit.
- [x] Acceptance criteria cover validation, retry, fallback, and parsing.
- [x] Applicable standards are listed.
- [x] Scope excludes scan persistence and frontend work.

**Verdict**: PASSED — Ready for implementation after TIP-003; can run parallel with TIP-004.

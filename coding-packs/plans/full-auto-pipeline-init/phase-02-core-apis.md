# Phase 02: Core APIs — Auth + User Management + Scans + OCR

## Overview
Implement authentication endpoints, user management APIs, scan CRUD with storage, and OCR proxy.

## Source TIPs
- `coding-packs/tips/TIP-003-auth-user-management-apis.md`
- `coding-packs/tips/TIP-004-storage-scan-apis.md`
- `coding-packs/tips/TIP-005-ocr-proxy.md`

## Requirements

### API Endpoints Required

#### Auth Endpoints
```text
POST /api/auth/login
Request: { email: string; password: string; audience?: 'dashboard' | 'mobile' }
Response: { user: UserProfile; accessToken: string; refreshToken: string; expiresAt: string }
Auth: public
Rules: If audience='dashboard', user.role must be 'admin'; otherwise return FORBIDDEN.

POST /api/auth/logout
Request: { refreshToken?: string }
Response: { ok: true }
Auth: required

GET /api/auth/me
Request: none
Response: UserProfile
Auth: required

POST /api/auth/refresh
Request: { refreshToken: string }
Response: { accessToken: string; refreshToken: string; expiresAt: string }
Auth: public with refresh token
```

#### User Management Endpoints
```text
GET /api/users?page=&limit=&search=&role=
Response: UserProfile[] with meta { page, limit, total, hasMore }
Auth: admin

POST /api/users
Request: { email: string; password: string; role: UserRole }
Response: UserProfile
Auth: admin

PATCH /api/users/:id/role
Request: { role: UserRole }
Response: UserProfile
Auth: admin
Rules: reject if this would demote the last admin.

DELETE /api/users/:id
Request: none
Response: { deleted: true; id: string }
Auth: admin
Rules: reject deleting last admin; cascade scans.
```

#### Scan Endpoints
```text
POST /api/scans/upload-url
Request: { fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; sizeBytes: number }
Response: { uploadUrl: string; storagePath: string; publicUrl?: string; expiresAt: string }
Auth: required

GET /api/scans?page=&limit=&search=&userId=&from=&to=
Response: ScanRecord[] with meta { page, limit, total, hasMore }
Auth: required
Rules: admin can filter by any user; non-admin only own scans.

POST /api/scans
Request: { imageUrl?: string | null; ocrRaw: string; ocrStructured: OCRStructured; tokenUsage: TokenUsage; apiKeyIndex: number; timestamp?: string }
Response: ScanRecord
Auth: required

GET /api/scans/:id
Response: ScanRecord
Auth: required (admin or owner)

PATCH /api/scans/:id
Request: { ocrStructured: OCRStructured; edited: true }
Response: ScanRecord
Auth: owner or admin

DELETE /api/scans/:id
Response: { deleted: true; id: string }
Auth: admin
```

#### OCR Endpoint
```text
POST /api/ocr/process
Request: { imageBase64?: string; imageUrl?: string; modelTier?: 'free' | 'default' | 'high' }
Response: { ocrRaw: string; ocrStructured: OCRStructured; tokenUsage: TokenUsage; apiKeyIndex: number; model: string }
Auth: required
Rules: one of imageBase64/imageUrl required; call OpenRouter with retry/backoff and key fallback.
```

### File Structure
```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── me/route.ts
│   └── refresh/route.ts
├── users/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── role/route.ts
├── scans/
│   ├── route.ts
│   ├── upload-url/route.ts
│   └── [id]/route.ts
└── ocr/
    └── process/route.ts

lib/
├── users/
│   ├── repository.ts
│   └── service.ts
├── scans/
│   ├── repository.ts
│   ├── service.ts
│   └── search.ts
└── ocr/
    ├── openrouter.ts
    ├── retry.ts
    ├── key-fallback.ts
    ├── parse.ts
    └── token-usage.ts

tests/
├── api/
│   ├── auth.test.ts
│   ├── users.test.ts
│   ├── scans.test.ts
│   └── ocr.test.ts
└── services/
    ├── users.test.ts
    ├── scans.test.ts
    ├── ocr-retry.test.ts
    ├── ocr-key-fallback.test.ts
    ├── ocr-parse.test.ts
    └── token-usage.test.ts
```

### Key Business Rules

#### Auth Rules
1. Dashboard audience requires admin role
2. Tokens issued by Supabase Auth
3. Session includes UserProfile data
4. Refresh token flow for token renewal

#### User Management Rules
1. Only admins can manage users
2. Email must be unique
3. Password minimum 8 characters
4. Cannot demote last admin
5. Cannot delete last admin
6. Deletion cascades scans

#### Scan Rules
1. Admin can list/filter any user's scans
2. Non-admin can only list own scans
3. Owner or admin can update scans (mark as edited)
4. Only admin can delete scans
5. Images stored via signed URL (storage path includes userId + UUID)
6. Max image size: configurable, default 10MB
7. Allowed types: image/jpeg, image/png, image/webp

#### OCR Rules
1. Backend owns OpenRouter keys (OPENROUTER_KEY_1..N)
2. Try keys in order, fallback on quota/provider failure
3. Retry transient errors (503, 429, timeouts)
4. Don't retry invalid credentials
5. Parse structured output into OCRStructured format
6. Track token usage + apiKeyIndex
7. Return safe error codes (QUOTA_EXCEEDED, PROVIDER_ERROR)

### Validation Requirements
- Email format validation
- Password minimum length (8 chars)
- Role enum: 'admin' | 'manager' | 'user'
- Pagination: page ≥ 1, limit 1-100, default 20
- Image: content type, size limit
- OCR: one of imageBase64/imageUrl required
- Date range: ISO format, from ≤ to

### Error Handling
| Error | HTTP Status | Code |
|-------|------------|------|
| Invalid credentials | 401 | AUTH_FAILED |
| Non-admin dashboard login | 403 | FORBIDDEN |
| Insufficient role | 403 | FORBIDDEN |
| Invalid body | 400 | VALIDATION_ERROR |
| Missing record | 404 | NOT_FOUND |
| Last admin protection | 400 | VALIDATION_ERROR |
| Provider quota | 429 | QUOTA_EXCEEDED |
| Provider failure | 502 | PROVIDER_ERROR |
| Unexpected | 500 | INTERNAL_ERROR |

## Implementation Steps

### STEP 1: Auth Endpoints
1. `app/api/auth/login/route.ts`
2. `app/api/auth/logout/route.ts`
3. `app/api/auth/me/route.ts`
4. `app/api/auth/refresh/route.ts`

### STEP 2: User Management Endpoints
1. `app/api/users/route.ts` (GET + POST)
2. `app/api/users/[id]/route.ts` (DELETE)
3. `app/api/users/[id]/role/route.ts` (PATCH)
4. `lib/users/repository.ts`
5. `lib/users/service.ts`

### STEP 3: Storage + Scan Endpoints
1. `app/api/scans/upload-url/route.ts`
2. `app/api/scans/route.ts` (GET + POST)
3. `app/api/scans/[id]/route.ts` (GET + PATCH + DELETE)
4. `lib/scans/repository.ts`
5. `lib/scans/service.ts`
6. `lib/scans/search.ts`

### STEP 4: OCR Proxy
1. `app/api/ocr/process/route.ts`
2. `lib/ocr/openrouter.ts`
3. `lib/ocr/retry.ts`
4. `lib/ocr/key-fallback.ts`
5. `lib/ocr/parse.ts`
6. `lib/ocr/token-usage.ts`

### STEP 5: Tests
1. `tests/api/auth.test.ts`
2. `tests/api/users.test.ts`
3. `tests/api/scans.test.ts`
4. `tests/api/ocr.test.ts`
5. `tests/services/users.test.ts`
6. `tests/services/scans.test.ts`
7. `tests/services/ocr-retry.test.ts`
8. `tests/services/ocr-key-fallback.test.ts`
9. `tests/services/ocr-parse.test.ts`
10. `tests/services/token-usage.test.ts`

## Acceptance Criteria
- [ ] Login returns session tokens + UserProfile
- [ ] Dashboard login rejects non-admin
- [ ] User CRUD with admin-only access
- [ ] Last-admin protection enforced
- [ ] Scan CRUD with owner/admin access control
- [ ] Signed upload URL generation works
- [ ] OCR proxy with retry + key fallback
- [ ] Token usage tracking
- [ ] All API tests pass
- [ ] All service tests pass

## Todo
- [ ] Implement auth endpoints
- [ ] Implement user management
- [ ] Implement scan CRUD + storage
- [ ] Implement OCR proxy
- [ ] Write unit tests
- [ ] Run quality gates

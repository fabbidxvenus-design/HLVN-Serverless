# HLVN Serverless

Standalone Next.js API backend for HLVN — deployed on Vercel (Edge/Node.js runtime).

## Tech Stack

- **Framework**: Next.js 15 App Router + TypeScript (strict)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI OCR**: OpenRouter (Anthropic Claude via multi-key fallback)
- **Excel Export**: ExcelJS
- **Testing**: Vitest
- **Deployment**: Vercel

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | public | Sign in with email + password |
| POST | `/api/auth/logout` | Bearer | Sign out current session |
| GET | `/api/auth/me` | Bearer | Get current user profile |
| POST | `/api/auth/refresh` | Bearer | Refresh session token |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users` | admin | List all users |
| GET | `/api/users/[id]` | Bearer | Get user by ID |
| PATCH | `/api/users/[id]/role` | admin | Update user role |

### Scans
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/scans` | Bearer | List scans (user-scoped or admin-all) |
| POST | `/api/scans` | Bearer | Create scan record |
| GET | `/api/scans/[id]` | Bearer | Get scan by ID |
| PATCH | `/api/scans/[id]` | Bearer | Update scan OCR |
| DELETE | `/api/scans/[id]` | admin | Delete scan |
| POST | `/api/scans/upload-url` | Bearer | Get signed upload URL |

### OCR
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ocr/process` | Bearer | Upload image for OCR processing |

### Analytics (admin-only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/analytics/summary` | admin | Aggregate metrics |
| GET | `/api/analytics/trends` | admin | Time-series trend data |
| GET | `/api/analytics/top-products` | admin | Top scanned products |
| GET | `/api/analytics/top-users` | admin | Top users by usage |
| GET | `/api/analytics/api-usage` | admin | API usage by key index |

### Export (admin-only)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/export/excel` | admin | Download multi-sheet XLSX workbook |

---

## Local Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd HLVN-serverless
pnpm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `OPENROUTER_KEY_1` | OpenRouter API key (at minimum 1 required) |
| `OPENROUTER_KEY_2` | (Optional) Second OpenRouter key |
| `OPENROUTER_KEY_3` | (Optional) Third OpenRouter key |
| `CORS_ORIGINS` | Comma-separated allowed origins |

For local development:

```
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Run Supabase locally

```bash
supabase start
```

Apply migrations:

```bash
supabase db reset
```

### 4. Start the dev server

```bash
pnpm dev
```

The API is available at `http://localhost:3000`.

---

## Database Migrations

### Apply migrations (local)

```bash
supabase db reset
```

### Apply migrations (CI / Staging / Production)

```bash
supabase db push
```

Or connect the Supabase CLI to your linked project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Migration workflow

1. Create a new migration file in `supabase/migrations/`:
   ```sql
   -- supabase/migrations/YYYYMMDD_descriptive_name.sql
   ```
2. Write the SQL change (backfill, new column, new RLS policy, etc.)
3. Test locally: `supabase db reset`
4. Push to remote: `supabase db push`
5. Merge PR — Vercel automatically picks up new migrations on deploy

### Key RLS policies

- `scans` table: users can only SELECT/INSERT their own rows
- `scans` table: admins can read all via service role
- `users` table: profile updates restricted to own row

---

## Environment Variables Reference

### Required (runtime)
| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` |
| `OPENROUTER_KEY_1` | `sk-or-v1-...` |
| `CORS_ORIGINS` | `https://dashboard.yourdomain.com` |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_KEY_2` | none | Fallback key for rate limit handling |
| `OPENROUTER_KEY_3` | none | Third key for additional capacity |

### Adding in Vercel

Go to **Project Settings > Environment Variables** and add each key. Use separate entries for `Production`, `Preview`, and `Development` scopes as needed.

---

## Test Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# TypeScript type check
pnpm typecheck

# ESLint check
pnpm lint

# Fix ESLint issues
pnpm lint:fix

# Format with Prettier
pnpm format
```

### Test coverage

```bash
npx vitest run --coverage
```

Coverage targets: **80% minimum** for all source files.

### Integration tests

Integration tests are in `tests/integration/` and test service-layer RBAC/RLS contracts without requiring a real database connection. They mock the repository layer.

---

## Vercel Deployment

### 1. Connect the repository

```bash
vercel login
vercel link
```

### 2. Configure environment variables

Set all required variables in **Project Settings > Environment Variables**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENROUTER_KEY_1` (mark as secret)
- `OPENROUTER_KEY_2` (mark as secret, optional)
- `OPENROUTER_KEY_3` (mark as secret, optional)
- `CORS_ORIGINS`

### 3. Deploy

```bash
vercel --prod
```

Or push to the `main` branch — Vercel auto-deploys on push.

### 4. Post-deploy checklist

- [ ] Supabase project is linked to the Vercel project
- [ ] All env vars are set in Vercel (not just `.env.local`)
- [ ] Database RLS policies are active on the production database
- [ ] `CORS_ORIGINS` includes the production dashboard domain
- [ ] Staging deployment is tested with a real admin login

---

## Project Structure

```
app/api/
├── auth/          # Auth endpoints (login, logout, me, refresh)
├── users/         # User management (list, get, update role)
├── scans/         # Scan management (CRUD, upload URL)
├── ocr/           # OCR processing
├── analytics/     # Admin analytics (summary, trends, top lists, api-usage)
│   ├── summary/
│   ├── trends/
│   ├── top-products/
│   ├── top-users/
│   └── api-usage/
└── export/        # Admin export (excel)

lib/
├── analytics/      # Analytics repository + service
├── auth/          # Session, RBAC, Supabase auth helpers
├── api/           # Response helpers, errors, validation, CORS
├── ocr/           # OCR client + retry logic + key fallback
├── scans/         # Scan repository + service + search
├── supabase/      # Admin client, user client, storage helpers
└── export/       # Excel workbook generator
    └── env.ts     # Environment variable validation

types/
├── api.ts         # ApiResponse, ApiErrorCode, ApiMeta
├── auth.ts        # SessionTokens
├── user.ts        # UserProfile, UserRole
├── scan.ts        # ScanRecord, OCRStructured, TokenUsage
├── ocr.ts         # OCR providers + retry options
└── analytics.ts   # Analytics response types

tests/
├── api/           # Route handler tests
├── services/      # Service layer unit tests
├── integration/    # RBAC/RLS boundary tests
└── fixtures/      # Shared test data
```

---

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose to the client
- OpenRouter keys are server-only — never bundle with client-side code
- All analytics and export endpoints require the `admin` role (enforced at the route layer via `requireAdmin`)
- CORS origin check is enforced on all API responses
- Database RLS policies provide a second layer of enforcement
- No hardcoded secrets — all secrets come from environment variables

# Coding Packs — HLVN-serverless

> Vibecode Kit v5.0 — Structured development workspace  
> Project: HLVN Serverless Backend  
> Updated: 2026-05-08

## Directory Structure

```
coding-packs/
├── README.md                    # This file
├── 00-PROJECT-CONTEXT.md        # Scan report + Vision
├── 01-REQUIREMENTS-MATRIX.md    # Requirements from RRI
├── 02-TASK-GRAPH.md            # Task breakdown + dependencies
├── BUILDER-HANDOFF.md          # Implementation handoff doc
├── standards/                   # Extracted code standards
│   ├── README.md               # Standards index
│   ├── api/
│   │   ├── multi-key-fallback.md
│   │   └── retry-backoff.md
│   ├── auth/
│   │   ├── rbac-admin-gate.md
│   │   └── supabase-auth-rls.md
│   ├── database/
│   │   └── postgresql-jsonb-schema.md
│   └── export/
│       └── excel-multi-sheet.md
├── product/                     # Product docs
│   ├── mission.md              # Product mission
│   ├── roadmap.md              # Feature roadmap
│   └── tech-stack.md           # Tech stack decisions
├── tips/                        # Implementation tips (TIP-001 to TIP-007)
├── plans/                       # Detailed plans
├── reports/                     # Analysis reports
│   ├── scan-summary.md
│   └── dashboard-scan-update.md
└── research/                    # Research artifacts
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Hosting | Vercel | Serverless deployment |
| Framework | Next.js 15 API Routes | Backend API endpoints |
| Language | TypeScript | Type-safe server code |
| Database | Supabase PostgreSQL | Users, scans, analytics |
| Auth | Supabase Auth | JWT sessions + RLS |
| Storage | Supabase Storage | Scan images |
| OCR Provider | OpenRouter | Backend-only OCR proxy |
| Testing | Vitest | Unit/integration tests |

## Workflow

1. ✅ **SCAN** (`/vibecode:scan`) — Analyze codebase, extract patterns
2. ✅ **RRI** (`/vibecode:rri`) — Requirements interview
3. ✅ **VISION** (`/vibecode:vision`) — Vision document
4. ✅ **BLUEPRINT** (`/vibecode:blueprint`) — Architecture design
5. ⏳ **TIP** (`/vibecode:tip`) — Implementation guidance
6. ⏳ **VERIFY** (`/vibecode:verify`) — Quality checks

## TIP Execution Order

**Week 1 — Foundation**:
1. TIP-001: Project Setup + API Foundation (6h)
2. TIP-002: Supabase Schema + Auth/RLS (8h)

**Week 2 — Core APIs**:
3. TIP-003: Auth + User Management APIs (10h)
4. TIP-004: Storage + Scan APIs (12h) — can run parallel with TIP-005
5. TIP-005: OCR Proxy (8h) — can run parallel with TIP-004

**Week 3 — Admin Data + Hardening**:
6. TIP-006: Analytics + Export APIs (10h)
7. TIP-007: Tests + Deployment Hardening (10h)

**Total**: 64 hours (~8 days for 1 developer)

## Source Documents

- **Scan Report**: `00-PROJECT-CONTEXT.md` — Tech stack, patterns, gaps from `ocr-mobile-web` and `HLVN-dashboard`
- **Requirements**: `01-REQUIREMENTS-MATRIX.md` — 62 backend requirements across 10 domains
- **Vision**: `00-PROJECT-CONTEXT.md` (appended) — Pattern F Enterprise Module architecture
- **Blueprint**: `BUILDER-HANDOFF.md` + `02-TASK-GRAPH.md` — Module architecture, API contracts, 7 TIPs
- **Standards**: `standards/README.md` — 6 extracted standards (API, Auth, Database, Export)
- **Product Docs**: `product/mission.md`, `product/roadmap.md`, `product/tech-stack.md`

## Usage

All vibecode commands reference files in this directory. Keep this structure intact.

**Next step**: Run `/vibecode:tip TIP-001` to generate first implementation tip.

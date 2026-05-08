# HLVN Serverless — Task Graph

> Vibecode Kit v5.0 — BƯỚC 4 (BLUEPRINT)  
> Date: 2026-05-08  
> 7 TIPs across 3 weeks

---

## DEPENDENCY GRAPH

```
Week 1: Foundation
┌─────────────────────────────────────────────────────────────┐
│ TIP-001: Project Setup + API Foundation                    │
│ (Next.js API, TypeScript, response envelope, types)        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ TIP-002: Supabase Schema + Auth/RLS                        │
│ (migrations, RLS policies, auth helpers, RBAC)             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
Week 2: Core APIs
┌─────────────────────────────────────────────────────────────┐
│ TIP-003: Auth + User Management APIs                       │
│ (login/logout/me/refresh, users CRUD, last-admin guard)    │
└─────────────────────────────────────────────────────────────┘
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
┌───────────────────────┐  ┌───────────────────────┐
│ TIP-004: Storage +    │  │ TIP-005: OCR Proxy    │
│ Scan APIs             │  │ (OpenRouter, retry,   │
│ (signed upload,       │  │  fallback, parse)     │
│  scan CRUD, search)   │  │                       │
└───────────────────────┘  └───────────────────────┘
                │                   │
                └─────────┬─────────┘
                          ▼
Week 3: Admin Data + Hardening
┌─────────────────────────────────────────────────────────────┐
│ TIP-006: Analytics + Export APIs                           │
│ (summary, trends, top tables, XLSX export)                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ TIP-007: Tests + Deployment Hardening                      │
│ (unit/integration tests, env validation, CORS, docs)       │
└─────────────────────────────────────────────────────────────┘
```

---

## TIP SUMMARY TABLE

| TIP | Name | Depends On | Priority | Est. Hours | Week | TIP File |
|-----|------|-----------|----------|-----------|------|----------|
| TIP-001 | Project Setup + API Foundation | — | P0 | 6h | 1 | [TIP-001-project-setup-api-foundation.md](tips/TIP-001-project-setup-api-foundation.md) |
| TIP-002 | Supabase Schema + Auth/RLS | TIP-001 | P0 | 8h | 1 | [TIP-002-supabase-schema-auth-rls.md](tips/TIP-002-supabase-schema-auth-rls.md) |
| TIP-003 | Auth + User Management APIs | TIP-002 | P0 | 10h | 2 | [TIP-003-auth-user-management-apis.md](tips/TIP-003-auth-user-management-apis.md) |
| TIP-004 | Storage + Scan APIs | TIP-003 | P0 | 12h | 2 | [TIP-004-storage-scan-apis.md](tips/TIP-004-storage-scan-apis.md) |
| TIP-005 | OCR Proxy | TIP-003 | P0 | 8h | 2 | [TIP-005-ocr-proxy.md](tips/TIP-005-ocr-proxy.md) |
| TIP-006 | Analytics + Export APIs | TIP-004, TIP-005 | P0 | 10h | 3 | [TIP-006-analytics-export-apis.md](tips/TIP-006-analytics-export-apis.md) |
| TIP-007 | Tests + Deployment Hardening | TIP-003, TIP-004, TIP-005, TIP-006 | P0 | 10h | 3 | [TIP-007-tests-deployment-hardening.md](tips/TIP-007-tests-deployment-hardening.md) |

**Total estimated effort**: 64 hours (~8 days for 1 developer at 8h/day)

---

## PARALLELIZATION OPPORTUNITIES

### Week 1
- TIP-001 and TIP-002 must run sequentially (foundation dependencies).

### Week 2
- **TIP-004 and TIP-005 can run in parallel** after TIP-003 completes.
- Both depend on TIP-003 (auth/users) but are independent of each other.
- If 2 developers available: assign TIP-004 to Dev A, TIP-005 to Dev B.

### Week 3
- TIP-006 depends on both TIP-004 and TIP-005 complete.
- TIP-007 depends on all feature TIPs complete.
- Must run after Week 2.

**Optimal parallelization**: 2 developers can complete Week 2 in ~12 hours instead of 20 hours.

---

## CRITICAL PATH

```
TIP-001 → TIP-002 → TIP-003 → TIP-004 → TIP-006 → TIP-007
```

**Critical path duration**: 56 hours (~7 days)

**Why TIP-004 (Storage + Scans) is on critical path**:
- TIP-004 (Storage + Scans) is 12h vs TIP-005 (OCR Proxy) 8h.
- TIP-006 depends on both, so the longest one determines the critical path.

---

## TEAM ALLOCATION (if applicable)

### Single Developer (8 days)
- Follow TIP order sequentially.
- Week 2: complete TIP-003, then TIP-004, then TIP-005.

### Two Developers (6 days)
- **Dev A (Auth + Scans + Analytics)**:
  - Week 1: TIP-001 (setup)
  - Week 2: TIP-003 (Auth + Users), TIP-004 (Storage + Scans)
  - Week 3: TIP-006 (Analytics + Export), TIP-007 (help with tests)
  
- **Dev B (Schema + OCR + Tests)**:
  - Week 1: TIP-002 (Supabase schema + RLS)
  - Week 2: TIP-005 (OCR Proxy)
  - Week 3: TIP-007 (Tests + Deployment)

**Coordination points**:
- End of Week 1: Dev B needs TIP-001 complete before starting TIP-002.
- End of Week 2: Both devs sync before TIP-006.

---

## RISK MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Supabase RLS complexity** | HIGH | Test RLS policies with integration tests in TIP-002; verify admin/user boundaries early |
| **OpenRouter rate limits** | MEDIUM | Implement multi-key fallback in TIP-005; test with mock provider first |
| **Excel export memory issues** | MEDIUM | Stream large exports if needed; test with 1000+ scans in TIP-006 |
| **CORS issues with dashboard/mobile** | MEDIUM | Configure CORS in TIP-001; test cross-origin requests early in TIP-003 |
| **Token refresh race conditions** | MEDIUM | Implement token refresh queue in TIP-003; test concurrent requests |
| **Performance budget exceeded** | LOW | Monitor function execution time; optimize queries in TIP-004/TIP-006 |
| **Last admin deletion** | HIGH | Implement lockout protection in TIP-003; add integration test |

---

## MILESTONE CHECKPOINTS

### Milestone 1: Foundation Complete (End of Week 1)
- [ ] Next.js API app runs locally
- [ ] Response envelope and error types defined
- [ ] Supabase migrations applied
- [ ] RLS policies enabled and tested
- [ ] Auth session helpers implemented

### Milestone 2: Core APIs Complete (End of Week 2)
- [ ] Login/logout/me/refresh work
- [ ] Users CRUD with last-admin protection
- [ ] Signed upload URL generation
- [ ] Scan CRUD with search/filter/pagination
- [ ] OCR proxy with retry/fallback
- [ ] All endpoints return typed responses

### Milestone 3: MVP Ready (End of Week 3)
- [ ] Analytics endpoints return aggregated data
- [ ] Excel export produces multi-sheet workbook
- [ ] Unit tests cover critical paths
- [ ] Integration tests verify RLS boundaries
- [ ] CORS configured for local/staging/prod
- [ ] Deployment docs complete
- [ ] Ready for staging deploy

---

## DEFERRED TO PHASE 2

| Feature | Reason | Estimated Effort |
|---------|--------|------------------|
| Password reset flow | Supabase Auth handles reset; UI deferred | 3h |
| API key management UI | Env-based rotation sufficient for MVP | 4h |
| Manager dashboard access | Admin-only dashboard for MVP | 4h |
| Advanced analytics filters | Basic filters sufficient for MVP | 4h |
| Bulk user operations | Manual CRUD sufficient for MVP | 4h |
| Audit log UI | Logging exists; UI deferred | 6h |
| Notifications | Not P0 for MVP | 6h |
| Error rate monitoring dashboard | Basic logging sufficient for MVP | 4h |
| Automated retention policy | Manual delete sufficient for MVP | 4h |
| Real-time updates | Manual refresh sufficient for MVP | 8h |
| E2E tests (Playwright) | Unit/integration tests sufficient for MVP | 8h |
| i18n toggle (EN/VI) | Vietnamese-only per Vision | 6h |

**Total Phase 2 effort**: 61 hours (~7.5 days)

---

## QUALITY GATE: Task Graph Self-Review

- [x] Dependency graph shows clear sequential and parallel paths
- [x] TIP summary table includes all 7 TIPs with dependencies, priorities, estimates, and weeks
- [x] Parallelization opportunities identified (TIP-004 and TIP-005 in Week 2)
- [x] Critical path identified (56 hours, 7 days)
- [x] Team allocation provided for 1 and 2 developers
- [x] Risk mitigation table covers backend-specific risks
- [x] Milestone checkpoints defined for each week
- [x] Deferred features listed with effort estimates
- [x] Total effort estimate realistic (64 hours = 8 days for 1 dev)
- [x] Scope matches Vision and RRI: standalone Next.js API, Supabase/OpenRouter backend-owned, dashboard frontend-only

**Verdict**: PASSED — Task Graph complete, ready for TIP generation.

---

*Task Graph revised: 2026-05-08 | Framework: Vibecode Kit v5.0 | Project: HLVN Serverless Backend*

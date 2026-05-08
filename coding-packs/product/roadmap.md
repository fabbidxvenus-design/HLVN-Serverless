# Roadmap

## MVP (Phase 1) — Must-Have Features

**Goal**: Replace client-only mobile app with secure backend API, enable multi-user support

| Feature | Description | Priority | Estimate |
|---------|-------------|----------|----------|
| **Authentication** | Supabase Auth with JWT, email/password login, auto-refresh tokens | P0 | 4h |
| **Authorization** | Row Level Security (RLS) policies, role-based access (admin/manager/user) | P0 | 4h |
| **User Management** | Create/edit/delete users, assign roles, admin-only endpoints | P0 | 6h |
| **OCR Proxy** | Backend proxy to OpenRouter API, multi-key fallback, hide keys from client | P0 | 8h |
| **Scan CRUD** | Create scan (save to DB), list scans (with filters), get scan details, update scan, delete scan | P0 | 10h |
| **Image Storage** | Upload images to Supabase Storage, generate signed URLs, compression | P0 | 6h |
| **Basic Analytics** | Total scans, scans today/week, top products, API usage/cost tracking | P1 | 6h |
| **Audit Logging** | Log user actions (login, create/edit/delete), track API calls | P1 | 4h |
| **Error Handling** | Retry logic, error codes, user-friendly messages | P0 | 4h |
| **Testing** | Unit tests for API routes, integration tests for database | P1 | 8h |

**Total MVP Estimate**: ~60 hours (7-8 days for 1 developer)

**MVP Success Criteria**:
- ✅ Mobile app calls backend API (not direct OpenRouter)
- ✅ Admin can create/manage users via dashboard
- ✅ Users can login and see own scans
- ✅ Admins can view all scans across users
- ✅ API keys secured in backend (not exposed to client)
- ✅ Data syncs across devices (mobile + dashboard)

---

## Post-MVP (Phase 2) — Enhanced Features

**Goal**: Improve UX with real-time updates, advanced analytics, and bulk operations

| Feature | Phase | Rationale |
|---------|-------|-----------|
| **Real-time sync** | Phase 2 | WebSocket for live updates (new scans appear instantly in dashboard) |
| **Advanced analytics** | Phase 2 | Charts (Recharts), trends (daily/weekly/monthly), cost breakdown by user |
| **Bulk operations** | Phase 2 | Bulk delete, bulk export, bulk edit |
| **Image optimization** | Phase 2 | Thumbnail generation, image CDN (CloudFront/Vercel Edge) |
| **PWA offline support** | Phase 2 | Service worker for offline mobile app, sync when online |
| **Email notifications** | Phase 2 | Email alerts for quota limits, errors, new user signups |
| **API rate limiting** | Phase 2 | Per-user rate limits, prevent abuse |
| **Data export** | Phase 2 | Bulk Excel export for admin (all scans, filtered by date/user) |

---

## Future (Phase 3+) — Advanced Features

| Feature | Phase | Rationale |
|---------|-------|-----------|
| **OAuth login** | Phase 3 | Google/GitHub login for easier onboarding |
| **Multi-language UI** | Phase 3 | English + Vietnamese UI (currently Vietnamese only) |
| **Advanced search** | Phase 3 | Full-text search across all OCR content, filters by confidence |
| **Webhooks** | Phase 3 | Notify external systems on new scans (Slack, Zapier) |
| **API versioning** | Phase 3 | v1, v2 API endpoints for backward compatibility |
| **Multi-tenancy** | Phase 3 | Support multiple organizations (separate databases) |
| **Custom OCR models** | Phase 3 | Train custom models for specific label formats |

---

## Timeline

```
Month 1: MVP (Phase 1)
├─ Week 1: Auth + User Management
├─ Week 2: OCR Proxy + Scan CRUD
├─ Week 3: Image Storage + Analytics
└─ Week 4: Testing + Deployment

Month 2: Post-MVP (Phase 2)
├─ Week 1: Real-time sync
├─ Week 2: Advanced analytics
├─ Week 3: Bulk operations
└─ Week 4: Image optimization

Month 3+: Future (Phase 3+)
└─ Based on user feedback and usage metrics
```

---

## Dependencies

| Feature | Depends On |
|---------|------------|
| User Management | Authentication |
| Scan CRUD | Authentication, Image Storage |
| Analytics | Scan CRUD |
| Real-time sync | Scan CRUD |
| Bulk operations | Scan CRUD |

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| **Supabase free tier limits** | Monitor usage, upgrade to Pro ($25/mo) if needed |
| **Lambda cold starts** | Use Vercel Functions (faster cold starts than AWS Lambda) |
| **Data migration from IndexedDB** | Provide export/import tool for users to migrate existing data |
| **API key rotation** | Implement key rotation strategy, test with multiple keys |
| **Testing coverage** | Aim for 80%+ test coverage, prioritize critical paths |

---

**Created**: 2026-05-08  
**Last updated**: 2026-05-08

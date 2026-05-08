# Mission

## Problem

The current OCR mobile app is client-only with critical limitations:
- **Security risk**: API keys exposed in browser bundle
- **No multi-user support**: Single PIN auth, no user accounts
- **No data sync**: IndexedDB is local-only, data lost if browser storage cleared
- **No centralized management**: Cannot manage users, view all scans, or track costs across team
- **No audit trail**: No tracking of who did what

## Solution

A serverless backend API that:
- **Secures API keys**: Moves OpenRouter API keys to backend, frontend calls proxy endpoints
- **Enables multi-user**: User accounts with roles (admin, manager, user) and JWT authentication
- **Syncs data**: Mobile app and dashboard share same database (Supabase PostgreSQL)
- **Centralizes management**: Admin dashboard for user management, history viewing, analytics
- **Tracks activity**: Audit logs for compliance and cost tracking per user

## Target Users

1. **Warehouse workers** (mobile app users)
   - Scan cargo box labels with phone camera
   - View own scan history
   - Export own data to Excel
   - Edit OCR results

2. **System administrators** (dashboard users)
   - Manage user accounts (create, edit, delete, assign roles)
   - View all scans across all users
   - Monitor API usage and costs
   - Export bulk data
   - Configure system settings

## Unique Value

Unlike the client-only POC, this serverless backend provides:

1. **Security**: API keys never exposed to client, managed centrally in backend
2. **Multi-user RBAC**: Role-based access control (admin, manager, user) enforced at database level
3. **Cross-device sync**: Scan on mobile, view on dashboard, data persists across devices
4. **Cost transparency**: Track API usage and costs per user, per day, per product
5. **Scalability**: Serverless architecture scales automatically with usage
6. **Zero ops**: Vercel + Supabase managed services, no server maintenance

## Success Metrics

- **Security**: Zero API key exposures in client bundle
- **Adoption**: 10+ active users within first month
- **Reliability**: 99.9% uptime for API endpoints
- **Performance**: <500ms average API response time
- **Cost efficiency**: <$50/month for 100 users (Vercel + Supabase free tiers)

---

**Created**: 2026-05-08  
**Last updated**: 2026-05-08

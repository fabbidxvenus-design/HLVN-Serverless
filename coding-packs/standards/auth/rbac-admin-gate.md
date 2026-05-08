# Role-Based Access Control (RBAC) with Admin Gate

## Rule

All users MUST have a role (`admin`, `manager`, `user`). Dashboard access is RESTRICTED to `admin` role only. Mobile app allows all roles. Backend enforces role checks on all protected endpoints.

## Role Definitions

```typescript
type UserRole = 'admin' | 'manager' | 'user';

interface RolePermissions {
  // Mobile App Permissions
  canScanOCR: boolean;
  canViewOwnHistory: boolean;
  canExportOwnData: boolean;
  canEditOwnScans: boolean;
  
  // Dashboard Permissions
  canAccessDashboard: boolean;
  canManageUsers: boolean;
  canViewAllHistory: boolean;
  canExportAllData: boolean;
  canManageAPIKeys: boolean;
  canViewAnalytics: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    // Mobile
    canScanOCR: true,
    canViewOwnHistory: true,
    canExportOwnData: true,
    canEditOwnScans: true,
    // Dashboard
    canAccessDashboard: true,
    canManageUsers: true,
    canViewAllHistory: true,
    canExportAllData: true,
    canManageAPIKeys: true,
    canViewAnalytics: true,
  },
  manager: {
    // Mobile
    canScanOCR: true,
    canViewOwnHistory: true,
    canExportOwnData: true,
    canEditOwnScans: true,
    // Dashboard
    canAccessDashboard: false, // ❌ Cannot access dashboard
    canManageUsers: false,
    canViewAllHistory: false,
    canExportAllData: false,
    canManageAPIKeys: false,
    canViewAnalytics: false,
  },
  user: {
    // Mobile
    canScanOCR: true,
    canViewOwnHistory: true,
    canExportOwnData: true,
    canEditOwnScans: true,
    // Dashboard
    canAccessDashboard: false, // ❌ Cannot access dashboard
    canManageUsers: false,
    canViewAllHistory: false,
    canExportAllData: false,
    canManageAPIKeys: false,
    canViewAnalytics: false,
  },
};
```

## Backend Implementation (Supabase RLS)

```sql
-- RLS Policy: Role-based access
CREATE POLICY "Role-based scan access"
  ON scans FOR SELECT
  USING (
    -- Users see own scans
    auth.uid() = user_id 
    OR 
    -- Admins see all scans
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- RLS Policy: Only admins can manage users
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
```

## Frontend Implementation

### Dashboard (Admin Gate)

```typescript
// Dashboard: Root-level role check
function DashboardApp() {
  const user = useAuthStore(state => state.user);
  
  // Redirect non-admins to mobile app
  if (user && user.role !== 'admin') {
    return <Navigate to="/mobile" replace />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <DashboardLayout />;
}

// Dashboard: Login page shows error for non-admins
async function handleLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Check role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single();
  
  // Admin gate
  if (userData?.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Chỉ admin mới có thể truy cập dashboard. Vui lòng sử dụng mobile app.');
  }
}
```

### Mobile App (All Roles)

```typescript
// Mobile: All authenticated users allowed
function MobileApp() {
  const user = useAuthStore(state => state.user);
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // All roles can use mobile app
  return <MobileLayout />;
}
```

## Database Schema

```sql
-- User table with role
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

## Why

**Problem**: Without role checks, any authenticated user could access admin dashboard and view/modify all data. Mobile app and dashboard have different security requirements.

**Solution**: Role-based permissions enforced at database level (RLS) and frontend (better UX). Admin-only dashboard ensures only trusted users manage system.

**Benefits**:
- Clear separation: mobile app (all users) vs dashboard (admin only)
- Database-level enforcement prevents privilege escalation
- Frontend checks provide immediate feedback
- Easy to extend with more roles/permissions later

## How to Apply

### Backend Setup
1. Add `role` column to users table (default: `user`)
2. Create RLS policies for role-based access
3. Test policies with different user roles

### Frontend Setup
1. Store user role in auth store (from Supabase)
2. Add role check in dashboard root component
3. Show clear error message for non-admins trying to access dashboard
4. Redirect non-admins to mobile app

### User Management
1. Only admins can create/edit users
2. Only admins can change user roles
3. Cannot demote last admin (prevent lockout)
4. Audit log for role changes

## Security Notes

- **Database enforcement**: RLS policies enforce role checks at database level
- **Frontend checks**: Provide better UX but can be bypassed (not security boundary)
- **Role changes**: User must re-login after role change (new JWT)
- **Audit trail**: Log all role checks and permission denials

## Exceptions

- **Development**: Allow `manager` role to access dashboard for testing (remove in production)
- **Emergency**: Provide super-admin override (requires 2FA)

---

**Source**: Industry standard RBAC pattern  
**Adapted for**: Mobile app (all roles) + Dashboard (admin only) with Supabase RLS  
**Last updated**: 2026-05-08

# Supabase Auth with Row Level Security

## Rule

Use **Supabase Auth** for authentication and **Row Level Security (RLS)** for authorization. All database access MUST go through RLS policies. Frontend uses Supabase client, backend uses service role key for admin operations.

## Authentication Flow

```typescript
// Frontend: Login
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function login(email: string, password: string) {
  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (authError) throw authError;
  
  // Check user role
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', authData.user.id)
    .single();
  
  if (userError) throw userError;
  
  // Admin gate for dashboard
  if (user.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Chỉ admin mới có thể truy cập dashboard');
  }
  
  return { user: authData.user, role: user.role };
}

// Frontend: Auto-refresh tokens
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session?.user.id);
  }
  if (event === 'SIGNED_OUT') {
    window.location.href = '/login';
  }
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});
```

## Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own scans, admins can view all
CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Users can insert own scans
CREATE POLICY "Users can insert own scans"
  ON scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update own scans
CREATE POLICY "Users can update own scans"
  ON scans FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Only admins can delete scans
CREATE POLICY "Admins can delete scans"
  ON scans FOR DELETE
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Policy: Only admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Policy: Only admins can create users
CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
```

## Backend (Service Role)

```typescript
// Backend API Route: Admin operations
import { createClient } from '@supabase/supabase-js';

// Service role bypasses RLS (use carefully!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Secret, never expose to client
);

// API Route: Get all users (admin only)
export async function GET(request: Request) {
  // Verify user is admin (check JWT from request)
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Check role
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (userData?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Get all users (service role bypasses RLS)
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (usersError) {
    return Response.json({ error: usersError.message }, { status: 500 });
  }
  
  return Response.json(users);
}
```

## Why

**Problem**: Custom JWT implementation is complex and error-prone. Manual authorization checks in every API route are tedious and can be missed.

**Solution**: Supabase Auth handles JWT automatically (issue, refresh, verify). RLS enforces authorization at database level (cannot be bypassed by client).

**Benefits**:
- No manual JWT implementation
- Auto-refresh tokens (seamless UX)
- RLS prevents unauthorized data access (even if frontend is compromised)
- Email verification built-in
- Password reset built-in
- OAuth providers supported (Google, GitHub, etc.)

## How to Apply

### Setup Supabase Auth

1. Enable email/password auth in Supabase dashboard
2. Configure email templates (optional)
3. Set JWT expiry (default: 1 hour access, 7 days refresh)

### Frontend Setup

1. Install Supabase client: `npm install @supabase/supabase-js`
2. Create Supabase client with anon key
3. Use `supabase.auth.signInWithPassword()` for login
4. Use `supabase.auth.onAuthStateChange()` for token refresh
5. Store session in memory (Supabase handles it)

### Backend Setup

1. Create service role client with service role key
2. Verify JWT from request headers
3. Check user role before admin operations
4. Use service role client for operations that bypass RLS

### Database Setup

1. Enable RLS on all tables: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
2. Create policies for SELECT, INSERT, UPDATE, DELETE
3. Use `auth.uid()` to reference current user
4. Test policies with different user roles

## Security Notes

- **Anon key**: Safe to expose in client (limited permissions)
- **Service role key**: NEVER expose to client (full admin access)
- **RLS**: Always enable on tables with user data
- **Policies**: Test thoroughly with different roles
- **JWT**: Supabase handles signing and verification

## Exceptions

- **Development**: Can disable RLS temporarily for testing (re-enable before production)
- **Admin operations**: Use service role key to bypass RLS (log all operations)

---

**Source**: Supabase Auth best practices  
**Recommended for**: HLVN Serverless (Vercel + Supabase stack)  
**Last updated**: 2026-05-08

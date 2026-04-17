---
name: mindops-auth-middleware
description: Authentication flow and middleware architecture for MindOps. Use when modifying auth logic, protecting routes, working with Telegram sessions, or debugging login/redirect issues. Triggers on tasks involving authentication, middleware, route protection, or Telegram pairing.
---

# MindOps Auth & Middleware

## Authentication Flow

MindOps uses **Supabase Auth** with a Telegram-first onboarding:

```
Telegram Bot ──→ n8n creates profile ──→ User gets pairing code
                                              │
User visits web ──→ /login ──→ Supabase Auth (email/magic link)
                                              │
                                    /dashboard/pairing ──→ Enter code ──→ Links Telegram + Web account
                                              │
                                    /dashboard ──→ Full access (requires telegram_id + phone_number)
```

## Middleware (src/middleware.ts)

The middleware is the most critical file in the project. It handles THREE concerns in one pass:

### 1. Supabase Session Refresh

Creates a Supabase client with cookie handling to keep the auth session alive.

### 2. Locale Detection

Resolves language using the 6-level priority cascade (see `i18n-guide` skill).

### 3. Route Protection

```typescript
if (!user && isDashboard) → redirect('/login')
if (user && isLogin)      → redirect('/dashboard')
```

### Matcher Config

Middleware runs on ALL routes EXCEPT:

- `_next/static`, `_next/image` (static assets)
- `favicon.ico`
- `auth` (callback route MUST be free for OAuth)
- Image files (`.svg`, `.png`, `.jpg`, etc.)

## Adding a New Protected Route

1. If the route is under `/dashboard/`, it's already protected by the existing `isDashboard` check
2. For a new top-level protected route (e.g., `/settings`):
   ```typescript
   const isSettings = request.nextUrl.pathname.startsWith('/settings')
   if (!user && (isDashboard || isSettings)) {
     return NextResponse.redirect(new URL('/login', request.url))
   }
   ```

## Pairing Gate

Even after login, users need BOTH `telegram_id` AND `phone_number` in their profile to access the dashboard:

```typescript
// In dashboard/page.tsx
if (!profile?.telegram_id || !profile?.phone_number) redirect('/dashboard/pairing')
```

The pairing flow is at `/dashboard/pairing` — users enter a code from Telegram to link accounts.

## Server Actions for Auth

- `src/app/actions/i18n.ts` → `setUserLanguage()` — Updates cookie + DB + telegram session
- `src/app/dashboard/actions.ts` → Dashboard-specific mutations

Pattern for server actions:

```typescript
'use server'
const supabase = await createClient()
const {
  data: { user },
} = await supabase.auth.getUser()
if (!user) return { success: false, error: 'Unauthorized' }
// ... mutation logic
```

## Gotchas

- **NEVER block the `/auth` route** in middleware — it's the OAuth callback. The matcher already excludes it, but if you modify the matcher, preserve this exclusion.
- **Middleware creates a NEW response object** when injecting locale headers. Any cookies set before this point get lost. The code re-applies `NEXT_LOCALE` cookie after creating the new response.
- **`supabase.auth.getUser()`** makes a network call to Supabase. It runs on EVERY request through middleware — this is by design for session validation.
- **The Telegram session ID** can come from either a URL param (`?session_id=`) or a cookie (`tg_session_id`). Both paths must be maintained.
- **`createClient()` returns `{} as any` during build** — This means any middleware logic that runs during `next build` will silently fail. This is intentional to prevent build crashes.

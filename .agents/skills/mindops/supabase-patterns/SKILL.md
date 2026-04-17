---
name: mindops-supabase-patterns
description: Supabase query and schema conventions for the MindOps project. Use when writing queries, creating server actions, adding tables, or debugging Supabase-related code. Triggers on tasks involving database reads/writes, RPC calls, or data modeling.
---

# MindOps Supabase Patterns

## Critical: Custom Schema

MindOps uses a **custom schema called `mindops`**, NOT the default `public` schema. Every query MUST specify this:

```typescript
// Server Component or Server Action
const supabase = await createClient() // from @/utils/supabase/server
await supabase.schema('mindops').from('thoughts').select('*')

// Client Component
const supabase = createClient() // from @/utils/supabase/client
await supabase.schema('mindops').from('profiles').select('*')
```

The schema is already configured in both client factories (`src/utils/supabase/server.ts` and `client.ts`) via `db: { schema: 'mindops' }`, but when using `.schema()` explicitly in server actions or middleware, you MUST pass `'mindops'`.

## Client Factories

| File                           | Use in                                            | Import                                     |
| ------------------------------ | ------------------------------------------------- | ------------------------------------------ |
| `src/utils/supabase/server.ts` | Server Components, Server Actions, Route Handlers | `createServerClient` from `@supabase/ssr`  |
| `src/utils/supabase/client.ts` | Client Components (`'use client'`)                | `createBrowserClient` from `@supabase/ssr` |

Both return a dummy `{} as any` during build when env vars are missing — this prevents build crashes.

## Known Tables (schema: mindops)

| Table               | Primary Key                    | Used for                                                                                |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `profiles`          | `id` (matches `auth.users.id`) | User profile, `first_name`, `telegram_id`, `phone_number`, `language`                   |
| `thoughts`          | `id` (uuid)                    | User vents/thoughts, `friction_score`, `system_mode`, `strategic_insight`, `user_id` FK |
| `telegram_sessions` | `id`                           | Pre-auth Telegram sessions, `language`                                                  |
| `missions`          | `id` (uuid)                    | AI-generated action plans, status (`PROPOSED`, `ACTIVE`, `COMPLETED`, `IDLE`)           |

## Data Fetching Patterns

### Parallelize independent queries with Promise.all

```typescript
const [profileResult, thoughtsResult] = await Promise.all([
  supabase.schema('mindops').from('profiles').select('*').eq('id', user.id).single(),
  supabase
    .schema('mindops')
    .from('thoughts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }),
])
```

### Always check auth before mutations

```typescript
const {
  data: { user },
} = await supabase.auth.getUser()
if (!user) return { success: false, error: 'Unauthorized' }
```

## Gotchas

- **Forgetting `.schema('mindops')`** in middleware or server actions where you call `supabase.schema('mindops').from(...)` explicitly — the factory default only applies to the initial client, not when you call `.schema()` again.
- **`friction_score` can be null** — Always use `typeof t.friction_score === 'number'` before arithmetic.
- **`system_mode` values** are `'PROTECTION'` and `'EXECUTION'` (English, uppercase). Previously used Spanish names — never use `PROTECCION` or `EJECUCION`.
- **Mission statuses** are `PROPOSED`, `ACTIVE`, `COMPLETED`, `IDLE` — previously used `INPROGRESS` and `COMMITTED`, those are deprecated.
- **`select('*')` on large tables** — Prefer selecting only needed columns for performance.

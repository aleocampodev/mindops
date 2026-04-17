---
name: mindops-api-performance-inspector
description: Inspect Next.js API Route Handlers in MindOps for performance anti-patterns. Detects N+1 Supabase queries, missing cache-control headers, sequential awaits that could be parallelized, and large response payloads.
---

# API Performance Inspector

When asked to "inspect API performance", "find N+1 queries", or "audit API routes":

1. Run: `node .agent/skills/mindops/api-performance-inspector/scripts/inspect-api.mjs`
2. For each route.ts found, report:
   - Number of `await supabase` calls (sequential vs batched)
   - Whether `Promise.all` is used for parallel fetching
   - Presence of `cache-control` headers in the response
   - Estimated response size risk (large `.select('*')` without column filters)
3. Flag any route with >2 sequential supabase awaits as a potential N+1.
4. Recommend `Promise.all([...])` patterns where sequential calls are independent.
5. Recommend `next: { revalidate: N }` on read-only routes.

## Performance Rules

- Two or more independent `await supabase.from(...)` calls → parallelize with Promise.all
- `.select('*')` on large tables → select only needed columns
- No `Cache-Control` on GET handlers → add `s-maxage` header
- Auth check inside a loop → hoist it before the loop

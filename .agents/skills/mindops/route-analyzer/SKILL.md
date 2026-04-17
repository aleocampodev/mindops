---
name: mindops-route-analyzer
description: Analyze Next.js App Router routes in the MindOps project. Maps all page.tsx and layout.tsx files, identifies rendering strategies (RSC, use client, generateStaticParams), middleware protections, and route co-location patterns.
---

# MindOps Route Analyzer

When asked to "analyze routes", "map routes", or "show route architecture":

1. Run the script: `node .agent/skills/mindops/route-analyzer/scripts/scan-routes.mjs`
2. Parse the JSON output.
3. Present a table with columns: Route | Type | Rendering | Auth-Protected | Notes
4. Flag any routes that mix RSC and 'use client' at the same segment level.
5. Suggest co-location improvements (adding loading.tsx, error.tsx where missing).

## Rendering Strategy Detection Rules

- File has 'use client' → CLIENT
- File exports `generateStaticParams` → SSG
- File has `revalidate` export → ISR
- Otherwise → SSR (RSC default)

## Auth Protection

Check middleware.ts matcher config and isDashboard/isLogin pattern guards.

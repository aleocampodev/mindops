#!/usr/bin/env node
// Scans src/app for all route segments and emits structured JSON
// Usage: node .agent/skills/mindops/route-analyzer/scripts/scan-routes.mjs
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'

const APP_DIR = join(process.cwd(), 'src/app')
const MIDDLEWARE = join(process.cwd(), 'src/middleware.ts')

function walk(dir, routes = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, routes)
    } else if (
      entry === 'page.tsx' ||
      entry === 'layout.tsx' ||
      entry === 'route.ts' ||
      entry === 'loading.tsx' ||
      entry === 'error.tsx'
    ) {
      const content = readFileSync(full, 'utf8')
      const segment = relative(APP_DIR, full)
      const isClient = content.includes("'use client'") || content.includes('"use client"')
      const isSSG = content.includes('generateStaticParams')
      const hasRevalidate = /export\s+const\s+revalidate/.test(content)

      routes.push({
        file: segment,
        routeSegment: segment.replace(/\/(page|layout|route|loading|error)\.(tsx|ts)$/, '') || '/',
        type: entry.replace(/\.(tsx|ts)$/, ''),
        rendering: isClient ? 'CLIENT' : isSSG ? 'SSG' : hasRevalidate ? 'ISR' : 'SSR',
        isClient,
        isSSG,
        hasRevalidate,
        hasAuth: content.includes('supabase.auth') || content.includes('getUser'),
        hasSuspense: content.includes('<Suspense'),
        hasErrorBoundary: content.includes('error.tsx') || entry === 'error.tsx',
        exportedFunctions: [
          ...content.matchAll(/^export\s+(async\s+)?function\s+(\w+)/gm),
        ].map((m) => m[2]),
        lineCount: content.split('\n').length,
      })
    }
  }
  return routes
}

let middlewareContent = ''
try {
  middlewareContent = readFileSync(MIDDLEWARE, 'utf8')
} catch {
  /* middleware.ts not found */
}

const protectedPaths =
  middlewareContent
    .match(/startsWith\(['"`]([^'"`]+)['"`]\)/g)
    ?.map((m) => m.match(/['"`]([^'"`]+)['"`]/)?.[1]) ?? []

const routes = walk(APP_DIR)

// Detect segments missing loading.tsx or error.tsx
const segments = new Set(routes.map((r) => r.routeSegment))
const coLocationWarnings = []
for (const seg of segments) {
  const segFiles = routes.filter((r) => r.routeSegment === seg).map((r) => r.type)
  if (segFiles.includes('page') && !segFiles.includes('loading')) {
    coLocationWarnings.push({ segment: seg, missing: 'loading.tsx' })
  }
  if (segFiles.includes('page') && !segFiles.includes('error')) {
    coLocationWarnings.push({ segment: seg, missing: 'error.tsx' })
  }
}

console.log(
  JSON.stringify({ routes, protectedPaths, coLocationWarnings }, null, 2)
)

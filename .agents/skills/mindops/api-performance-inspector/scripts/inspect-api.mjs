#!/usr/bin/env node
// Inspects API route handlers for performance anti-patterns
// Usage: node .agent/skills/mindops/api-performance-inspector/scripts/inspect-api.mjs
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'

const APP_DIR = join(process.cwd(), 'src/app')

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (e === 'route.ts' || e === 'route.tsx') files.push(full)
  }
  return files
}

const routeFiles = walk(APP_DIR)

const results = routeFiles.map((f) => {
  const content = readFileSync(f, 'utf8')
  const lines = content.split('\n').length

  const supabaseAwaits = (content.match(/await\s+supabase\./g) || []).length
  const parallelized = content.includes('Promise.all')
  const hasCacheControl =
    content.toLowerCase().includes('cache-control') ||
    content.includes("'Cache-Control'") ||
    content.includes('"Cache-Control"')
  const selectStarCount = (content.match(/\.select\(['"`]\*['"`]\)/g) || []).length
  const exportedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((m) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}`).test(content)
  )
  const hasNextRevalidate =
    content.includes('next: {') && content.includes('revalidate')

  const flags = []
  if (supabaseAwaits > 2 && !parallelized) {
    flags.push({
      severity: 'WARNING',
      message: `${supabaseAwaits} sequential supabase awaits — consider Promise.all()`,
      suggestion: `const [a, b] = await Promise.all([supabase.from('x').select(), supabase.from('y').select()])`,
    })
  }
  if (selectStarCount > 0) {
    flags.push({
      severity: 'WARNING',
      message: `${selectStarCount} .select('*') call(s) — fetching unnecessary columns`,
      suggestion: `Replace .select('*') with explicit column list: .select('id, name, status')`,
    })
  }
  if (!hasCacheControl && exportedMethods.includes('GET')) {
    flags.push({
      severity: 'INFO',
      message: 'GET handler has no Cache-Control header',
      suggestion: `response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')`,
    })
  }
  if (exportedMethods.includes('GET') && !hasNextRevalidate && supabaseAwaits > 0) {
    flags.push({
      severity: 'INFO',
      message: 'Consider next.revalidate for read-only data fetching',
      suggestion: `const { data } = await supabase.from('x').select().eq('id', id)  // or use fetch with next: { revalidate: 60 }`,
    })
  }

  return {
    route: '/' + relative(APP_DIR, f),
    methods: exportedMethods,
    lines,
    supabaseAwaits,
    parallelized,
    hasCacheControl,
    selectStarCount,
    flags,
    status: flags.some((f) => f.severity === 'WARNING')
      ? '⚠️ Needs attention'
      : flags.length > 0
        ? 'ℹ️ Minor suggestions'
        : '✅ Clean',
  }
})

const summary = {
  totalRoutes: results.length,
  withWarnings: results.filter((r) => r.flags.some((f) => f.severity === 'WARNING')).length,
  totalFlags: results.flatMap((r) => r.flags).length,
}

console.log(JSON.stringify({ summary, results }, null, 2))

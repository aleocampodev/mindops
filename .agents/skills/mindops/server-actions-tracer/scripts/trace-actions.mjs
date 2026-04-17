#!/usr/bin/env node
// Traces all 'use server' actions and emits structured JSON
// Usage: node .agent/skills/mindops/server-actions-tracer/scripts/trace-actions.mjs
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(process.cwd(), 'src')

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (e.endsWith('.ts') || e.endsWith('.tsx')) files.push(full)
  }
  return files
}

function extractActions(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const isServerFile =
    content.includes("'use server'") || content.includes('"use server"')
  if (!isServerFile) return []

  const fnRegex = /export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/g
  const results = []
  let match

  while ((match = fnRegex.exec(content)) !== null) {
    const name = match[1]
    const params = match[2].trim()
    // Slice a window around the function to inspect its body
    const start = match.index
    const body = content.slice(start, start + 2000)

    const tables = [
      ...new Set([...body.matchAll(/\.from\(['"`](\w+)['"`]\)/g)].map((m) => m[1])),
    ]
    const operations = ['select', 'insert', 'update', 'delete', 'upsert'].filter(
      (op) => new RegExp(`\\.${op}\\(`).test(body)
    )
    const revalidatePaths = [
      ...body.matchAll(/revalidatePath\(['"`]([^'"`]+)['"`]\)/g),
    ].map((m) => m[1])

    const issues = []
    if (!body.includes('getUser')) {
      if (operations.some((op) => ['insert', 'update', 'delete', 'upsert'].includes(op))) {
        issues.push('🔴 CRITICAL: Mutates data without auth check (getUser missing)')
      }
    }
    if (!body.includes('try {') && !body.includes('try{')) {
      issues.push('⚠️ WARNING: No try/catch — errors may be unhandled')
    }
    if (params && !body.includes('z.parse') && !body.includes('z.safeParse')) {
      issues.push('ℹ️ INFO: Input not validated with Zod — consider schema validation')
    }

    results.push({
      name,
      file: relative(SRC, filePath),
      params: params || '(none)',
      authChecked: body.includes('getUser'),
      supabaseSchema: body.includes(".schema('mindops')") ? 'mindops' : 'public',
      tables,
      operations,
      revalidatePaths,
      hasTryCatch: body.includes('try {') || body.includes('try{'),
      issues,
    })
  }
  return results
}

const allFiles = walk(SRC)
const actions = allFiles.flatMap(extractActions)

const summary = {
  total: actions.length,
  withAuthCheck: actions.filter((a) => a.authChecked).length,
  withoutAuthCheck: actions.filter((a) => !a.authChecked).length,
  withTryCatch: actions.filter((a) => a.hasTryCatch).length,
  criticalIssues: actions.flatMap((a) =>
    a.issues.filter((i) => i.startsWith('🔴'))
  ).length,
}

console.log(JSON.stringify({ summary, actions }, null, 2))

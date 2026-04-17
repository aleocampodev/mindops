#!/usr/bin/env node
// Scans the codebase for refactoring opportunities
// Usage: node .agent/skills/mindops/refactor-advisor/scripts/advise.mjs
import { readdirSync, statSync, readFileSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(process.cwd(), 'src')

// Known Spanish identifiers from the MindOps codebase
const SPANISH_PATTERNS = [
  'completado',
  'pendiente',
  'pensamiento',
  'actualizar',
  'usuario',
  'datos',
  'estado',
  'obtener',
  'guardar',
  'mostrar',
  'crear',
  'eliminar',
]

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (e.endsWith('.ts') || e.endsWith('.tsx')) files.push(full)
  }
  return files
}

function countPropsDepth(content) {
  // Heuristic: count interface/type props entries
  const propsMatch = content.match(/(?:interface|type)\s+\w+Props\s*[={][^}]+}/s)
  if (!propsMatch) return 0
  const props = propsMatch[0].match(/\n\s+\w+\??\s*:/g) || []
  return props.length
}

const allFiles = walk(SRC)

const results = allFiles
  .map((f) => {
    const content = readFileSync(f, 'utf8')
    const lines = content.split('\n').length
    const findings = []

    // 1. 'any' type usage
    const anyMatches = content.match(/:\s*any\b/g) || []
    if (anyMatches.length > 0) {
      findings.push({
        severity: 'CRITICAL',
        rule: 'no-any-types',
        count: anyMatches.length,
        issue: `${anyMatches.length} explicit 'any' type(s) detected`,
        fix: "Replace with explicit TypeScript types or use 'Zod' schema inference: z.infer<typeof MySchema>",
        example: `// Before: const updateData: any = {}\n// After:  const updateData: Partial<Tables<'thoughts'>> = {}`,
      })
    }

    // 2. Large files
    if (lines > 200) {
      findings.push({
        severity: 'WARNING',
        rule: 'max-component-lines',
        count: lines,
        issue: `File is ${lines} lines — exceeds 200-line guideline`,
        fix: 'Extract reusable sub-components or move logic to a custom hook (e.g. useDashboardData)',
        example: `// Extract: function useThoughtActions() { ... }\n// Component only handles rendering`,
      })
    }

    // 3. Spanish identifiers in variable names / strings
    const spanishHits = SPANISH_PATTERNS.filter((word) =>
      new RegExp(`\\b${word}\\b`, 'i').test(content)
    )
    if (spanishHits.length > 0) {
      findings.push({
        severity: 'INFO',
        rule: 'consistent-naming-language',
        count: spanishHits.length,
        issue: `Spanish identifiers found: ${spanishHits.join(', ')}`,
        fix: "Translate to English for codebase consistency (e.g. 'completado' → 'completed')",
        example: `// Before: status: 'completado'\n// After:  status: 'completed'`,
      })
    }

    // 4. console.error without structured return
    const consoleErrors = (content.match(/console\.error/g) || []).length
    if (consoleErrors > 0) {
      findings.push({
        severity: 'WARNING',
        rule: 'structured-error-returns',
        count: consoleErrors,
        issue: `${consoleErrors} console.error call(s) — prefer structured error returns`,
        fix: "Return { success: false, error: string } from Server Actions instead of only logging",
        example: `// Before: console.error('Error:', error.message); return { success: false }\n// After:  return { success: false, error: error.message }`,
      })
    }

    // 5. Excessive prop count
    const propsCount = countPropsDepth(content)
    if (propsCount > 6) {
      findings.push({
        severity: 'WARNING',
        rule: 'excessive-props',
        count: propsCount,
        issue: `Component has ${propsCount} props — consider composition patterns`,
        fix: 'Use Context, compound components, or props grouping to reduce prop surface area',
        example: `// Instead of: <Card title= icon= value= trend= color= label= />\n// Use: <Card.Header /><Card.Metric /><Card.Footer />`,
      })
    }

    // 6. Missing 'use server' in files with supabase mutations
    const hasMutations = /\.(?:insert|update|delete|upsert)\(/.test(content)
    const hasServerDirective =
      content.includes("'use server'") || content.includes('"use server"')
    const isClientComponent =
      content.includes("'use client'") || content.includes('"use client"')
    if (hasMutations && !hasServerDirective && isClientComponent) {
      findings.push({
        severity: 'CRITICAL',
        rule: 'mutations-in-client-component',
        count: 1,
        issue: 'Supabase mutations found in a client component without server action abstraction',
        fix: "Extract mutations to a 'use server' action file and call it from the client",
        example: `// actions.ts → 'use server'\nexport async function updateRecord(...) { ... }\n// Component: await updateRecord(...)`,
      })
    }

    return findings.length > 0
      ? {
        file: relative(SRC, f),
        lines,
        criticalCount: findings.filter((f) => f.severity === 'CRITICAL').length,
        warningCount: findings.filter((f) => f.severity === 'WARNING').length,
        infoCount: findings.filter((f) => f.severity === 'INFO').length,
        findings,
      }
      : null
  })
  .filter(Boolean)
  .sort((a, b) => b.criticalCount - a.criticalCount || b.warningCount - a.warningCount)

const summary = {
  filesScanned: allFiles.length,
  filesWithIssues: results.length,
  totalCritical: results.reduce((s, r) => s + r.criticalCount, 0),
  totalWarnings: results.reduce((s, r) => s + r.warningCount, 0),
  totalInfo: results.reduce((s, r) => s + r.infoCount, 0),
}

console.log(JSON.stringify({ summary, results }, null, 2))

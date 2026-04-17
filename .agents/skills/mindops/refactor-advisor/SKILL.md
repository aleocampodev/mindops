---
name: mindops-refactor-advisor
description: Analyze MindOps TypeScript components and actions for refactoring opportunities. Detects 'any' type usage, prop drilling, missing error boundaries, inconsistent naming conventions (Spanish/English mix), and components over 200 lines.
---

# MindOps Refactor Advisor

When asked to "suggest refactors", "find code smells", or "improve code quality":

1. Run: `node .agent/skills/mindops/refactor-advisor/scripts/advise.mjs`
2. Parse the JSON output.
3. Group findings by severity: CRITICAL | WARNING | INFO
4. For each finding, suggest a specific, actionable refactor with a code snippet.
5. Prioritize: 'any' types in Server Actions (security risk) > large components > prop drilling

## Refactor Rules

- `any` in a Server Action parameter → Replace with a Zod schema + `z.infer<>`
- Component >200 lines → Extract sub-components or a custom hook
- > 3 props passed through 2+ component layers → Suggest Context or compound component
- Spanish variable names in English files → Flag for consistency (completado, estado, etc.)
- `console.error` without re-throwing → Suggest structured `{ success: false, error }` returns
- `updateData: any` pattern → Replace with `Partial<DatabaseRow>` type

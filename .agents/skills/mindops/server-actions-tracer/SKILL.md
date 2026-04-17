---
name: mindops-server-actions-tracer
description: Trace all Next.js Server Actions in the MindOps codebase. Lists each action, its Supabase table operations (select/insert/update/delete), revalidatePath calls, and whether it validates the authenticated user before mutating data.
---

# MindOps Server Actions Tracer

When asked to "trace server actions", "list server actions", or "audit mutations":

1. Run: `node .agent/skills/mindops/server-actions-tracer/scripts/trace-actions.mjs`
2. Parse the JSON output.
3. Render a table: Action | File | Tables | Operations | revalidatePaths | Auth-Checked
4. Flag any action that mutates WITHOUT calling `supabase.auth.getUser()` first — this is a critical security issue.
5. Flag actions missing a try/catch or error return handling.
6. Suggest adding `zod` validation for any action that receives user input directly.

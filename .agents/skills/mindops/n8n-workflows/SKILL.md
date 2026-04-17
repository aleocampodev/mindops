---
name: mindops-n8n-workflows
description: n8n workflow architecture and conventions for MindOps. Use when editing workflow JSONs, discussing automation logic, creating new sub-workflows, or debugging n8n integrations. Triggers on tasks involving n8n, workflow automation, Telegram bot logic, or AI orchestration.
---

# MindOps n8n Workflows

## Architecture

MindOps uses a hub-and-spoke architecture with one Orchestrator and specialized sub-workflows:

```
Orchestrator (Telegram Trigger → Normalize → Route)
  ├── SW-0: Middleware — Global Context Enricher
  ├── SW-1: Identity & Onboarding (START, VINCULATE, CONTACT)
  ├── SW-2: Cognitive Engine (AI/RAG processing, embeddings, LLM)
  ├── SW-3: Mission Control (button callbacks, ACTIVE/IDLE state)
  ├── SW-5: Message Telegram (centralized messaging utility)
  └── Twilio: Safety Net Protocol (stalled user detection + voice calls)
```

All workflows are stored as JSON in `n8n/workflows/`.

## Naming Conventions

### Workflows

Use format: `SW-[N]: [Descriptive Name]`

- ✅ `SW-1: Identity & Onboarding`
- ✅ `SW-3: Mission Control`
- ❌ `SW-5:Message telegram` (missing space, lowercase)

### Nodes

Use descriptive action-based names:

- ✅ `Normalize Payload`, `Check Exact Duplicate`, `Get Profile UUID`
- ❌ `HTTP Request`, `Code1`, `IF` (never use defaults)

## Key Patterns

### Execute Workflow (Sub-workflow calls)

The Orchestrator calls sub-workflows via `executeWorkflow` nodes, passing a normalized payload:

- `telegram_id`, `chat_id`, `first_name`, `input_text`, `action`
- SW-2 also receives: `has_voice`, `file_id`
- SW-3 receives: `callback_data`, `message_id`, `markup_type`

### SW-5 as Messaging Utility

ALL Telegram messages are sent through SW-5, never directly. SW-5 routes by `markup_type`:

- `inlineKeyboard` → Sends inline keyboard buttons
- `replyKeyboard` → Sends reply keyboard
- `removeInline` → Removes inline keyboard from a message
- (default) → Sends plain text message

### Error Handling

- Critical DB/HTTP nodes use `onError: continueErrorOutput` to route errors instead of crashing
- `saveDataErrorExecution: all` is set on all workflows
- Each sub-workflow has an `Error Message` node that sends a user-friendly Telegram message
- ⚠️ There is NO Error Trigger workflow for admin notifications (recommended to add)

### Data Validation

- Orchestrator normalizes Telegram payloads in `Normalize Payload` node (handles both `message` and `callback_query`)
- `Main Router` switch validates intent type before delegating
- SW-2 uses `Check Exact Duplicate` before saving missions

## Modifying Workflows

When editing workflow JSONs:

1. The backup workflow auto-syncs from n8n to GitHub — prefer editing in the n8n UI
2. JSONs contain volatile fields (`updatedAt`, `versionId`) that change on every save
3. The backup workflow normalizes these out during comparison
4. Never manually edit the JSON unless necessary — changes should flow from n8n → GitHub, not the reverse

## Database Integration

n8n connects to the same Supabase PostgreSQL as the frontend:

- Uses HTTP requests to Supabase REST API (not direct SQL)
- Schema: `mindops` (set via HTTP headers or query params)
- Core tables accessed: `profiles`, `thoughts`, `missions`, `telegram_sessions`
- RAG uses `pgvector` via RPC function for cosine similarity search

## Gotchas

- **SW-5 is the ONLY way to send Telegram messages** — never add Telegram send nodes to other workflows.
- **Workflow IDs are hardcoded** in the backup workflow's Code node (`Workflow IDs`). When adding a new workflow, update that list.
- **`callerPolicy: workflowsFromSameOwner`** — sub-workflows can only be called by workflows owned by the same user.
- **The Twilio Safety Net workflow is currently INACTIVE** (`active: false`).
- **n8n version is `2.8.3`** — pinned in Cloud Run service config.

# 🚀 MindOps Latency Optimization Post-Mortem

**Date:** March 2026  
**Author:** Ale Ocampo  
**Objective:** Eliminate multi-second response delays in the MindOps Telegram Bot by optimizing the n8n orchestration layer and Supabase database interactions.

## 1. The Core Problem: The "N+1 Query" Orchestration Bottleneck

In our initial architecture, the internal n8n orchestrator operated using isolated sub-workflows for different cognitive stages (e.g., identity verification, brain processing, mission control). 
- Every time a user sent a message, each sub-workflow independently executed HTTP requests against the Supabase REST API to fetch fundamental state data (UUIDs, onboarding state, language, translation strings, and LLM prompts).
- **Impact:** Processing a single incoming "vent" required 3 to 5 round-trip database transactions *before* the prompt even reached the LLM. This compounded overhead resulted in unacceptable delays of 4 to 6 seconds per interaction.

## 2. The Solution: Context Injection Gateway (Middleware)

To eliminate the redundant network calls, we re-architected the system around a **Centralized Context Injection pattern**:

### Efficient Data Hydration via custom RPC
We deployed a high-performance RPC function (`mindops.get_bot_context`) directly in Supabase. On every incoming webhook, the n8n Middleware (`SW-0`) executes this single function. In a fraction of a second, PostgreSQL bundles the entire deterministic state required for the interaction:
- User Profile (`id`, `onboarding_state`, `telegram_id`)
- Session Language (`language`)
- Operational Prompts (`prompts`)
- Dynamic UI Translations (`translations`)

### In-Memory Transport
Instead of passing raw Telegram data to the sub-workflows, `SW-0` injects this massive JSON payload into a unified `context` object. As the data flows downstream through the `Execute Workflow` nodes to `SW-1` (and any future logic layers), the sub-workflows read directly from memory (`$json.context.translations.msg_welcome`, etc.). 
- **Result:** We completely obliterated the need for nested HTTP nodes in downstream workflows. Pre-LLM latency dropped to tens of milliseconds.

## 3. The "Phantom Executions" Edge Case (Always Output Data)

During debugging, we identified a critical n8n configuration trap that was quietly degrading performance and causing `400 Bad Request` errors in the Telegram API.

- **The Bug:** Several conditional (`Switch`) and HTTP nodes had the hidden n8n setting **"Always Output Data"** enabled. Instead of naturally killing a branch when a condition was false (outputting `0 items`), n8n was forced to inject an empty "phantom" item into the dead branch to satisfy the setting.
- **The Cascade:** These phantom items traveled down the false paths, triggering downstream nodes (like Telegram `Edit Message`) with empty payload variables.
- **The Fix:** We strictly disabled "Always Output Data" across the orchestrator. n8n now correctly prunes dead branches instantly, halting unnecessary compute and ensuring zero errors.

## 4. Production Environment Tuning (GCP Cloud Run)

To solidify these gains, the deployment container architecture (`n8n/service.yaml`) was aggressively tuned for low-latency, stateless operation on Google Cloud Run:

- `N8N_EXECUTIONS_PROCESS=main`: **Critical.** Forces n8n to execute all sub-workflows within the main Node.js process thread instead of spawning new expensive subprocesses (Cold Starts) for every webhook.
- `EXECUTIONS_DATA_SAVE_ON_SUCCESS=none`: Reduces memory overhead and database I/O by completely ignoring execution histories for healthy runs.
- `N8N_PUSH_BACKEND=websocket`: Ensures stable, low-latency UI updates if the dashboard is ever monitored in real-time.

---
*By treating n8n as a lightweight orchestrator rather than a database querying tool, MindOps now operates efficiently as a near-instant cognitive reflection engine.*

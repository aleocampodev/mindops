# 🌩️ Infrastructure Evolution: e2-micro host

MindOps was migrated from serverless architectures (Cloud Run) to a dedicated **Google Compute Engine (e2-micro)** instance. The goal was to maximize cost-efficiency (leveraging the GCP Free Tier) and entirely eliminate cold starts, which are detrimental to agentic response times.

To compensate for the `e2-micro`'s inherently limited RAM (1GB), the host OS is configured with a **Swap File**. This acts as a crucial safety buffer, preventing Out Of Memory (OOM) crashes during heavier LLM orchestrations or RAG vector executions, while relying entirely on **Supabase** (outside the instance) to offload all heavy database workloads.

## Current Execution Model (Main Process vs. Workers)

To guarantee stability on a micro-instance, the n8n environment is deliberately configured for monolith execution rather than a distributed Queue/Worker model:

| Variable                 | Value          | Architectural Purpose                                                                                                         |
| :----------------------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `N8N_EXECUTIONS_PROCESS` | `main`         | **Crucial:** Forces n8n to execute sub-workflows within the main Node thread. Extremely memory efficient for micro-instances. |
| `EXECUTIONS_DATA_SAVE_*` | `none`/`false` | Strict memory hygiene; prevents database bloat by not storing successful execution histories.                                 |
| `DB_POSTGRESDB_*`        | `[...]`        | Bypasses local n8n SQLite in favor of the external managed Supabase connection, saving significant local RAM and CPU.         |

### Why no Workers or Queue mode (yet)?

Implementing n8n Queue mode requires additional infrastructure (a Redis broker and separate Worker nodes). For an `e2-micro` environment, adding Redis and multiprocess worker overhead would overwhelm the 1GB of RAM. By running `N8N_EXECUTIONS_PROCESS=main` and offloading the entire Database layer to **Supabase**, the architecture remains exceptionally lean, resilient, and perfectly sized for current traffic while keeping operational costs at near-zero.

### Evolution Path

When traffic scales beyond the capacity of a monolithic e2-micro, the stateless architecture makes it trivial to upgrade to a Redis-backed Queue module and provision dedicated Worker instances on larger infrastructure.

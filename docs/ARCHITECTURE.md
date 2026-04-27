# MindOps Architecture Decisions

This document outlines the core architectural decisions made for MindOps, the rationale behind these choices, and the associated trade-offs.

## 1. Overview & Problem Statement

MindOps is designed to provide intelligent, AI-driven workflows while maintaining a fast, responsive user experience. The main challenge was to balance the computational needs of AI interactions and complex logic with a sleek, performant frontend, all while operating within a constrained, cost-effective infrastructure.

## 2. High-Level Architecture

The system is intentionally decoupled into two primary layers:

- **Presentation Layer (Frontend):** Built with Next.js. Responsible solely for user interface, routing, state management, and capturing user input.
- **Cognitive Engine (Backend/Processing):** Powered by **n8n**. Responsible for orchestrating LLMs, executing business logic, managing external API integrations, and handling heavy data transformations.

## 3. Key Architectural Decisions (The "Why")

### 3.1. Decoupling the Frontend from the Processing Node

- **Rationale:** AI requests, RAG (Retrieval-Augmented Generation), and complex workflow processing can be highly variable in response times. If these were processed directly within the Next.js API routes, it would tie up frontend server resources and risk connection timeouts.
- **Benefit:** By shifting the heavy lifting to n8n, the frontend remains lightweight and highly responsive. The Cognitive Engine handles the execution queues, retries, and API rate limits independently.

### 3.2. Using a Workflow Engine (n8n) as the Backend Core

- **Rationale:** Instead of building a custom monolithic backend (e.g., Express or Django) to handle LLM chains and webhook integrations, we leverage a visual node-based execution engine.
- **Benefit:** It allows for rapid iteration, visual debugging, and seamless integration of complex AI pipelines without needing to redeploy the core application codebase. Workflows can be updated on the fly.

### 3.3. Infrastructure: Cloud Run / E2-Micro Considerations

- **Rationale:** The application is architected to run efficiently on cost-effective infrastructure (such as GCP e2-micro instances).
- **Benefit:** Low operational costs for the initial phases and MVP.
- **Design Impact:** To work within strict memory and CPU constraints, the architecture completely offloads actual AI inference to third-party providers (OpenAI, Gemini), reducing local processing to pure orchestration and routing.

## 4. Trade-offs

| Decision                    | Advantage                                                            | Disadvantage / Risk                                                                             | Mitigation Strategy                                                                                     |
| :-------------------------- | :------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| **Decoupled Architecture**  | Highly modular; easy to swap LLM providers without touching UI code. | Adds network latency overhead (User ↔ Next.js ↔ n8n ↔ LLM).                                     | Implemented optimistic UI updates, loaders, and streaming interfaces (see `LATENCY_OPTIMIZATION.md`).   |
| **n8n as Cognitive Engine** | Drastically speeds up development and logic modifications.           | Introduces an external dependency that requires its own specialized maintenance and monitoring. | Maintain rigorous documentation (`N8N_WORKFLOWS.md`) and version control JSON exports of all workflows. |
| **Cost-Optimized Hosting**  | Extremely cost-effective and easy to maintain.                       | Susceptible to CPU/RAM limits under unexpected high concurrency.                                | Aggressive caching, offloading work to APIs, and configuring appropriate timeout limits.                |

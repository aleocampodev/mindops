---
name: mindops-deploy-pipeline
description: Deployment pipeline for MindOps services (frontend + n8n). Use when deploying, troubleshooting builds, configuring Cloud Run, or managing environment variables. Triggers on tasks involving deploy, Docker, GCP, Cloud Build, or Cloud Run.
---

# MindOps Deploy Pipeline

## Two Services, Two Projects

| Service                | GCP Project              | Image                           | Port |
| ---------------------- | ------------------------ | ------------------------------- | ---- |
| **Frontend** (Next.js) | `mindops-486323`         | Custom Dockerfile (multi-stage) | 3000 |
| **n8n** (Automation)   | `analog-pilot-484600-u8` | `n8nio/n8n:2.8.3` (official)    | 5678 |

Both run on **Cloud Run** in `us-central1`.

## Frontend Deploy

### Via Cloud Build (CI/CD)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,_SUPABASE_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --project mindops-486323
```

### Via npm script

```bash
npm run deploy
```

### Build Pipeline

1. `cloudbuild.yaml` → Docker build with `--build-arg` for Supabase env vars
2. Pushes to Container Registry (`gcr.io/$PROJECT_ID/mindops-web`)
3. Deploys to Cloud Run service `mindops-web`

### Required Environment Variables (build-time)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Dockerfile Notes

- Uses `output: "standalone"` in `next.config.ts` for minimal production image
- Multi-stage: `deps` → `builder` → `runner`
- Runs as non-root user `nextjs` (UID 1001)
- Requires `--legacy-peer-deps` for React 19 compatibility

## n8n Deploy

### Via Service YAML (portable)

```bash
# 1. Edit n8n/service.yaml — replace CHANGEME values
# 2. Deploy:
gcloud run services replace n8n/service.yaml \
  --project <PROJECT_ID> --region us-central1
```

### Required Environment Variables (see `n8n/.env.example`)

- `DB_POSTGRESDB_HOST` — Supabase PostgreSQL host
- `DB_POSTGRESDB_USER` / `DB_POSTGRESDB_PASSWORD`
- `N8N_ENCRYPTION_KEY` — Required for credential encryption
- `WEBHOOK_URL` / `N8N_EDITOR_BASE_URL` — Cloud Run service URL

### n8n Cloud Run Config

- **1 CPU / 2Gi RAM**, min 1 instance, max 1 instance
- **CPU always allocated** (no throttling) — required for websocket connections
- **Session affinity** enabled — required for editor stability
- **Startup probe** on `/health:5678` with 30s initial delay

## Pre-Deploy Checklist

1. `npm run build` passes locally
2. Environment variables are set
3. No TypeScript errors (`npm run lint`)
4. Test critical paths: login, dashboard, language switching

## Gotchas

- **`--legacy-peer-deps`** is required when installing — React 19 has peer dep conflicts with some UI libraries.
- **Build-time env vars** (`NEXT_PUBLIC_*`) are baked into the JS bundle during `next build`. Changing them requires a new build, not just a restart.
- **n8n encryption key** — If you change `N8N_ENCRYPTION_KEY`, ALL existing credentials in n8n become unreadable. Never change it on an existing instance.
- **Container Registry `gcr.io`** is being deprecated by Google in favor of Artifact Registry (`docker.pkg.dev`). Consider migrating.

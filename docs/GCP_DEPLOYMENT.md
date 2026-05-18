# TRINETRA AI — Google Cloud Deployment (India Government Grade)

Deploy TRINETRA AI on **Google Cloud Platform** with data residency in **asia-south1 (Mumbai)** for Indian cybersecurity operations.

---

## Architecture

```mermaid
flowchart TB
    Users[Security Analysts] --> LB[HTTPS Load Balancer]
    LB --> CR[Cloud Run - TRINETRA API]
    CR --> SQL[(Cloud SQL MySQL)]
    CR --> GCS[(Cloud Storage - APKs)]
    CR --> CT[Cloud Tasks]
    CT --> CRW[Cloud Run Worker Route]
    CRW --> SQL
    CRW --> GCS
    CR --> Redis[(Memorystore Redis)]
    CR --> Gemini[Forge / Gemini API]
    SM[Secret Manager] --> CR
```

| Component | GCP Service | Purpose |
|-----------|-------------|---------|
| Application | Cloud Run | Node.js + React static |
| Database | Cloud SQL MySQL 8 | Investigations, audit logs, events |
| APK files | Cloud Storage | Encrypted artifact storage |
| Jobs | Cloud Tasks | Durable investigation queue |
| Live updates | Memorystore Redis | WebSocket fan-out across instances |
| Secrets | Secret Manager | JWT, API keys, DB URL |
| Region | **asia-south1** | India data residency |

---

## Prerequisites

1. GCP project with billing enabled  
2. `gcloud` CLI authenticated  
3. APIs enabled:

```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  cloudtasks.googleapis.com \
  redis.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

---

## Step 1 — Cloud SQL (MySQL)

```bash
gcloud sql instances create trinetra-mysql \
  --database-version=MYSQL_8_0 \
  --tier=db-custom-2-7680 \
  --region=asia-south1 \
  --storage-auto-increase \
  --backup

gcloud sql databases create trinetra --instance=trinetra-mysql

gcloud sql users create trinetra \
  --instance=trinetra-mysql \
  --password=YOUR_STRONG_PASSWORD
```

Run migrations from Cloud Shell or local machine with Cloud SQL Auth Proxy:

```bash
cloud-sql-proxy PROJECT:asia-south1:trinetra-mysql &
DATABASE_URL="mysql://trinetra:PASSWORD@127.0.0.1:3306/trinetra" npm run db:push
```

---

## Step 2 — Cloud Storage bucket

```bash
gcloud storage buckets create gs://trinetra-apk-artifacts-asia-south1 \
  --location=asia-south1 \
  --uniform-bucket-level-access

# Service account needs roles/storage.objectAdmin on bucket
```

Set `GCS_BUCKET=trinetra-apk-artifacts-asia-south1`.

---

## Step 3 — Secrets (Secret Manager)

```bash
echo -n "mysql://..." | gcloud secrets create trinetra-database-url --data-file=-
echo -n "JWT_SECRET" | gcloud secrets create trinetra-jwt-secret --data-file=-
echo -n "FORGE_KEY" | gcloud secrets create trinetra-forge-api-key --data-file=-
echo -n "WORKER_TOKEN" | gcloud secrets create trinetra-worker-secret --data-file=-
```

Use `.env.gcp.example` as the checklist.

---

## Step 4 — Cloud Tasks queue

```bash
gcloud tasks queues create trinetra-investigations \
  --location=asia-south1
```

After first Cloud Run deploy, set:

- `WORKER_URL=https://YOUR-SERVICE-URL`
- `WORKER_SECRET` = same as secret
- `GCP_PROJECT_ID`, `GCP_TASKS_QUEUE=trinetra-investigations`

---

## Step 5 — Redis (optional, multi-instance WebSocket)

```bash
gcloud redis instances create trinetra-redis \
  --size=1 \
  --region=asia-south1 \
  --tier=basic

# Set REDIS_URL=redis://INTERNAL_IP:6379 on Cloud Run
```

If Redis is not used, set Cloud Run `--max-instances=1` for reliable WebSocket.

---

## Step 6 — Build & deploy

### Option A: Cloud Build (recommended)

```bash
gcloud builds submit --config=cloudbuild.yaml
```

### Option B: Manual Docker

```bash
docker build -t trinetra-ai .
docker tag trinetra-ai asia-south1-docker.pkg.dev/PROJECT/trinetra/trinetra-ai:latest
docker push asia-south1-docker.pkg.dev/PROJECT/trinetra/trinetra-ai:latest

gcloud run deploy trinetra-ai \
  --image=asia-south1-docker.pkg.dev/PROJECT/trinetra/trinetra-ai:latest \
  --region=asia-south1 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=900 \
  --set-env-vars=NODE_ENV=production,LOCAL_DEV=false,GCS_BUCKET=...,GCP_PROJECT_ID=...,REQUIRE_LLM_KEY=true
```

---

## Government / CERT-In alignment checklist

| Requirement | TRINETRA implementation |
|-------------|-------------------------|
| Audit trail | `auditLogs` table — upload, view, copilot, complete/fail |
| Evidence integrity | SHA256 hashes stored per APK |
| No mock AI in prod | `LOCAL_DEV=false`, `REQUIRE_LLM_KEY=true` |
| Data residency | Deploy all resources in **asia-south1** |
| Access control | JWT sessions + per-user investigation ownership |
| Artifact storage | Private GCS bucket, no public ACL |
| Investigation events | `investigationEvents` table for replay |
| Job durability | `investigationJobs` + Cloud Tasks |

---

## Environment variables (production)

See [.env.gcp.example](../.env.gcp.example).

**Never set `LOCAL_DEV=true` in production.**

---

## Health check

```bash
curl "https://YOUR-SERVICE/api/trpc/system.diagnostics"
```

Expect `database: connected`, `storage: gcs`, `cloudTasks: true` when configured.

---

## APK reverse engineering on Cloud Run

Uncomment APKTool/JADX lines in `Dockerfile` or use a **GKE job** with a forensic worker image for heavy decompilation.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Investigations stuck pending | Check Cloud Tasks queue + worker logs |
| WebSocket not updating | Enable Redis or max-instances=1 |
| LLM errors | Set `BUILT_IN_FORGE_API_KEY` in Secret Manager |
| DB connection failed | Cloud SQL connector + correct `DATABASE_URL` socket path |
| Upload fails | GCS bucket IAM for Cloud Run service account |

---

## Support

For IIT / government demo: use diagnostics endpoint and audit log exports from MySQL for compliance evidence.

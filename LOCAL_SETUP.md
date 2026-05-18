# TRINETRA AI — Local Setup (Cursor IDE)

Run the full end-to-end malware investigation workflow on your machine.

> **Full project guide (architecture, diagrams, glossary):** [docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)  
> **Google Cloud / India gov deployment:** [docs/GCP_DEPLOYMENT.md](docs/GCP_DEPLOYMENT.md)

## Prerequisites

- **Node.js 20+** and npm
- **MySQL 8** (local install or Docker)
- **Optional:** [APKTool](https://ibotpeaches.github.io/Apktool/) and [JADX](https://github.com/skylot/jadx) on your PATH

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
# Edit DATABASE_URL and JWT_SECRET if needed

# 3. Start MySQL (Docker example)
docker run -d --name trinetra-mysql -p 3306:3306 ^
  -e MYSQL_ROOT_PASSWORD=trinetra -e MYSQL_DATABASE=trinetra mysql:8

# 4. Apply database migrations
npm run db:push

# 5. Check optional RE tools
npm run tools:check

# 6. Start dev server (frontend + backend + WebSocket)
npm run dev
```

## First login (local dev)

1. Open **http://localhost:3000/api/dev/login**
2. You are redirected to the dashboard with a session cookie
3. Upload an `.apk` and open the live investigation page

## Architecture (local)

| Component | URL / path |
|-----------|------------|
| Web UI | http://localhost:3000 |
| tRPC API | http://localhost:3000/api/trpc |
| WebSocket | ws://localhost:3000/api/ws |
| Dev auth | GET /api/dev/login |
| APK storage | `.local-storage/` (when `LOCAL_DEV=true`) |

## Environment variables

See `.env.example`. Minimum for local demo:

- `LOCAL_DEV=true`
- `DATABASE_URL=mysql://root:trinetra@127.0.0.1:3306/trinetra`
- `JWT_SECRET` (any long random string)
- `BUILT_IN_FORGE_API_KEY` (optional — mock AI used if empty)

## End-to-end flow

1. **Upload** — Dashboard → `investigation.createFromUpload`
2. **Storage** — APK saved under `.local-storage/apk-files/`
3. **Forensics** — `apkAnalyzer` (APKTool/JADX or zip fallback)
4. **AI** — 7 grounded agents via Forge Gemini (or local mock)
5. **WebSocket** — live logs on Investigation page
6. **DB** — investigations, IOCs, agent logs, attack chain JSON

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **Connection Failed / ERR_CONNECTION_REFUSED** | Run `npm run dev` in terminal and wait for `Server running on http://localhost:3000/`. If port 3000 is busy, check terminal for port **3001** or kill the old process. |
| `DATABASE_URL is required` | Create `.env` from `.env.example` |
| **Docker: pipe not found** | Start **Docker Desktop** and wait until it is running, then `npm run docker:up` |
| Upload returns 401 | Visit **http://localhost:3000/api/dev/login** first |
| `npm install` fails (SSL) | Project includes `.npmrc` with `strict-ssl=false`; use `npm install --legacy-peer-deps` |
| `tsc` / dev won't start on Windows | Use `npm run dev` (uses `cross-env`) |
| Vite JSX errors | Pull latest fixes; restart `npm run dev` |
| Empty manifest / few IOCs | Install `apktool` and `jadx`, rerun `npm run tools:check` |
| LLM errors | Set `BUILT_IN_FORGE_API_KEY` or keep `LOCAL_DEV=true` for mock |
| Migration errors | Ensure MySQL is running; run `npm run db:push` |

## Production / Manus hosting

Set `LOCAL_DEV=false` and configure Manus OAuth + Forge storage keys per `.env.example`.

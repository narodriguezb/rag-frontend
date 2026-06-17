# Course Materials RAG — Frontend

React + TypeScript + Tailwind CSS (Vite) frontend for the Course Materials RAG system. Talks to the FastAPI backend (separate repo) over HTTP.

## Requirements

- Node 20+
- The backend running at `http://localhost:8000`

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL if the backend is elsewhere
```

## Run

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Configuration

`VITE_API_URL` (default `http://localhost:8000/api`) points at the backend API.

## Structure

```
src/
  api/client.ts          typed fetch wrappers (query, courses)
  hooks/useChat.ts        chat + session state
  components/             Sidebar, ChatMessages, Message, ChatInput, ...
  observability/sentry.ts Sentry init (no-op without DSN)
  types.ts                shared API/domain types
```

## Observability

Error + performance monitoring via **Sentry** (`@sentry/react`). Set `VITE_SENTRY_DSN` (in `.env`
locally, GitHub secret `VITE_SENTRY_DSN` in CI) to enable it; without a DSN it is a no-op.

## CI/CD

Pipeline de GitHub Actions (`.github/workflows/ci.yml`): en cada **PR a `master`** corren los
gates de calidad y las reviews de Gemini; al **mergear a `master`** se despliega a Firebase Hosting
vía Workload Identity Federation.

```
PR a master    ──► quality + code_review + security_review (Gemini, advisory)
merge a master ──► quality ──► deploy (Firebase Hosting)
```

📄 **Documentación completa del flujo en [`CICD.md`](CICD.md)** — cada job paso a paso, gates y
umbrales, protección de rama, autenticación WIF, secrets, despliegue y troubleshooting.

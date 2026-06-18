# Course Materials RAG — Frontend

Frontend React + TypeScript + Tailwind CSS (Vite) del sistema Course Materials RAG. Se comunica con
el backend FastAPI (repo aparte) por HTTP.

## Requisitos

- Node 20+
- El backend corriendo en `http://localhost:8000`

## Instalación

```bash
npm install
cp .env.example .env   # setear VITE_API_URL si el backend está en otra URL
```

## Ejecutar

```bash
npm run dev      # dev server en http://localhost:5173
npm run build    # build de producción en dist/
npm run preview  # previsualiza el build de producción
```

## Configuración

`VITE_API_URL` (default `http://localhost:8000/api`) apunta a la API del backend.

## Estructura

```
src/
  api/client.ts          wrappers tipados de fetch (query, courses)
  hooks/useChat.ts        estado de chat + sesión
  components/             Sidebar, ChatMessages, Message, ChatInput, ...
  observability/sentry.ts init de Sentry (no-op sin DSN)
  types.ts                tipos compartidos de API/dominio
```

## Observabilidad

Monitoreo de errores y performance vía **Sentry** (`@sentry/react`). Setear `VITE_SENTRY_DSN` (en
`.env` localmente, secret `VITE_SENTRY_DSN` en CI) para habilitarlo; sin DSN es un no-op.

## CI/CD

Pipeline de GitHub Actions (`.github/workflows/ci.yml`): en cada **PR a `master`** corren los gates
de calidad y las reviews de Gemini; al **mergear a `master`** se despliega a Firebase Hosting vía
Workload Identity Federation.

```
PR a master    ──► quality + code_review + security_review (Gemini, advisory)
merge a master ──► quality ──► deploy (Firebase Hosting)
```

📄 **Documentación completa del flujo en [`CICD.md`](CICD.md)** — cada job paso a paso, gates y
umbrales, protección de rama, autenticación WIF, secrets y troubleshooting.

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
  types.ts                shared API/domain types
```

## CI/CD

GitHub Actions pipeline en `.github/workflows/ci.yml`.

- **PR a `master`** → corren los gates de calidad y las reviews de Claude.
- **Push/merge a `master`** → corren los gates y, si pasan, el **deploy** a Firebase Hosting.

```
PR a master    ──► quality + code_review (Claude) + security_review (Claude)
merge a master ──► quality ──► deploy (Firebase Hosting vía WIF)
```

### Jobs

| Job | Cuándo | Qué hace |
|-----|--------|----------|
| `quality` | PR + push | eslint → `tsc -b` + build (inyecta `VITE_API_URL`) → vitest + coverage → mutation testing (Stryker, break ≥50%) → Trivy → SonarQube (no bloqueante) |
| `code_review` | PR | Claude revisa el diff y comenta (`anthropics/claude-code-action`, advisory) |
| `security_review` | PR | Claude revisa seguridad; **falla el check si encuentra hallazgos** (`claude-code-security-review`) |
| `deploy` | push a `master` | build de `dist/` (inyecta `VITE_BUILD_VERSION`) → `firebase deploy --only hosting` vía WIF. El badge `build: <sha>` (abajo a la derecha en la app) confirma la versión desplegada |

### Gate del deploy

`master` está protegida por un **ruleset** que exige PR + que pasen los checks `quality` y
`security_review`. Si la revisión de seguridad de Claude encuentra algo, no se puede mergear →
no hay deploy. El deploy autentica a Google/Firebase con **Workload Identity Federation**.

### Secrets y variables (GitHub → Settings → Secrets and variables → Actions)

| Nombre | Tipo | Para qué |
|--------|------|----------|
| `ANTHROPIC_API_KEY` | secret | Reviews de Claude (code + security) |
| `SONAR_TOKEN` | secret | SonarQube Cloud (opcional) |
| `VITE_API_URL` | variable | URL del backend usada en el build (ej. `https://<cloud-run>/api`) |

> Para que `code_review` (Claude) pueda comentar, hay que instalar la **GitHub App de Claude**
> (https://github.com/apps/claude) en el repo. (Snyk corre aparte vía su propia GitHub App, no en el workflow.)

### Reproducir los gates en local

```bash
npm run lint
npm run build
npm run coverage
npm run mutation
```

Infra: Firebase Hosting, sitio `rag-proyect-499005` (`https://rag-proyect-499005.web.app`).

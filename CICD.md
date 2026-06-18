# CI/CD — Frontend (`rag-frontend`)

Documentación del pipeline de integración y despliegue continuo.
Resumen y enlace en el [README](README.md#cicd). Definición: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Tabla de contenidos

- [Stack y herramientas](#stack-y-herramientas)

1. [Visión general](#1-visión-general)
2. [Disparadores](#2-disparadores)
3. [Job `quality`](#3-job-quality)
4. [Reviews con Gemini](#4-reviews-con-gemini)
5. [Job `deploy`](#5-job-deploy)
6. [Protección de rama (ruleset)](#6-protección-de-rama-ruleset)
7. [Autenticación: Workload Identity Federation](#7-autenticación-workload-identity-federation)
8. [Secrets y variables](#8-secrets-y-variables)
9. [Reproducir los gates en local](#9-reproducir-los-gates-en-local)
10. [Infraestructura (Firebase)](#10-infraestructura-firebase)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Visión general

App estática (React + Vite + TypeScript). El pipeline tiene dos fases: **gates** (calidad +
seguridad) en cada PR a `master`, y **deploy** a Firebase Hosting al mergear a `master`.

```
                    ┌─────────────────────── PR a master ───────────────────────┐
   commit  ─────►   │  quality            code_review (Gemini)   security_review │
   en una rama      │  (lint, build,      (comenta el diff,      (Gemini;        │
                    │   tests, mutation)   advisory)             advisory)        │
                    └────────────────────────────┬───────────────────────────────┘
                                                  │  (ruleset exige quality + security_review)
                                                  ▼
                                            merge a master
                                                  │
                                                  ▼
                                   quality ──► deploy (Firebase Hosting vía WIF)
```

| Job | Evento | ¿Bloquea el merge? |
|-----|--------|--------------------|
| `quality` | `pull_request` + `push` a master | **Sí** (check requerido) |
| `code_review` | `pull_request` | No (advisory) |
| `security_review` | `pull_request` | No (advisory) |
| `security_report` | `pull_request` | No (informativo; comentario sticky) |
| `deploy` | `push` a master | — (corre post-merge) |

---

## Stack y herramientas

### Aplicación
| Herramienta | Rol |
|---|---|
| Node 20 + npm | runtime / build |
| React 19 | UI |
| TypeScript (strict) | tipos |
| Vite 6 | bundler + dev server |
| Tailwind CSS 4 | estilos |
| react-markdown + remark-gfm | render de respuestas |

### Calidad y seguridad (en CI)
| Herramienta | Versión / ref | Rol |
|---|---|---|
| ESLint 9 (+ `typescript-eslint`, `eslint-plugin-react-hooks`, `react-refresh`) | dev dep | lint |
| TypeScript `tsc -b` | dev dep | type-check (en el build) |
| vitest + `@vitest/coverage-v8` | dev dep | tests + cobertura (`coverage/lcov.info`) |
| Stryker (`@stryker-mutator/core` + `vitest-runner`) | dev dep | mutation testing (break ≥50%) |
| Gitleaks | `gitleaks/gitleaks-action@v2` | escaneo de secretos (**gate pre-merge**, en `quality`) |
| Trivy | `aquasecurity/trivy-action@master` | escaneo de vulnerabilidades (filesystem/deps) |
| Snyk | `snyk/actions/node@master` (advisory) + GitHub App | vulnerabilidades de deps npm |
| SonarQube Cloud | `SonarSource/sonarqube-scan-action@v6` | análisis estático + cobertura (advisory) |
| Gemini code review | `google-github-actions/run-gemini-cli@v0.1.22` (Vertex AI vía WIF) | revisión de código (advisory) |
| Gemini security review | `google-github-actions/run-gemini-cli@v0.1.22` (Vertex AI vía WIF) | revisión de seguridad (advisory) |

### Build y deploy
| Herramienta | Versión / ref | Rol |
|---|---|---|
| `actions/setup-node` | `@v4` | Node 20 + caché de npm |
| firebase-tools | `@latest` (vía `npx`) | deploy a Firebase Hosting |
| `google-github-actions/auth` | `@v2` | WIF (OIDC → Google/Firebase) |

### Plataforma
| Servicio | Rol |
|---|---|
| GitHub Actions | orquestación CI/CD |
| GitHub Rulesets | protección de rama (gate del merge/deploy) |
| Firebase Hosting | hosting del frontend (CDN + HTTPS) |
| Workload Identity Federation | autenticación sin claves JSON |

---

## 2. Disparadores

```yaml
on:
  push:
    branches: [master]   # merge a master -> quality + deploy
  pull_request:
    branches: [master]   # PR -> quality + reviews de Gemini
  workflow_dispatch:     # ejecución manual
```

Permisos del `GITHUB_TOKEN`: `contents: read`, `id-token: write` (WIF) y
`pull-requests: write` (para que las reviews de Gemini comenten).

---

## 3. Job `quality`

Runner `ubuntu-latest`, Node 20 con caché de npm. Pasos en orden:

| # | Paso | Comando | Falla si… |
|---|------|---------|-----------|
| 0 | Gitleaks (secretos) | `gitleaks/gitleaks-action@v2` (historial git) | encuentra un secreto en el repo |
| 1 | Lint | `npm run lint` (ESLint flat config) | hay errores de lint |
| 2 | Type-check + build | `npm run build` (`tsc -b` + `vite build`); inyecta `VITE_API_URL`, `VITE_BUILD_VERSION` y `VITE_SENTRY_DSN` | hay errores de tipos o de build |
| 3 | Tests + cobertura | `npm run coverage` (vitest + v8) | falla un test; genera `coverage/lcov.info` para SonarQube |
| 4 | Mutation testing | `npm run mutation` (Stryker) | el *mutation score* baja del **break threshold = 50%** (en `stryker.conf.json`) |
| 5 | Trivy (SCA/IaC) | `aquasecurity/trivy-action` (`scan-type: fs`, `severity: CRITICAL,HIGH`, `ignore-unfixed: true`) | hay vulnerabilidades CRITICAL/HIGH con fix |
| 6 | Snyk (deps npm) | `snyk/actions/node` (`continue-on-error: true`) | **no bloquea** (advisory); solo corre si existe `SNYK_TOKEN` |
| 7 | SonarQube Cloud | `SonarSource/sonarqube-scan-action` (`continue-on-error: true`) | **no bloquea** (advisory); solo corre si existe `SONAR_TOKEN` |

> Scope de mutación en `stryker.conf.json` (`mutate`, `thresholds.break: 50`).

---

## 4. Reviews con Gemini

Dos jobs independientes que solo corren en `pull_request` (revisan el *diff*). Ambos usan
`google-github-actions/run-gemini-cli@v0.1.22` (CLI pineada a `0.45.0`) con `use_vertex_ai: true`,
modelo `gemini-2.5-flash`, autenticando a Vertex AI por **WIF** (mismo provider y SA `gh-deployer@`
que el deploy; la SA tiene `roles/aiplatform.user`). **No se usa API key.**

```yaml
- uses: google-github-actions/run-gemini-cli@v0.1.22
  with:
    gemini_cli_version: "0.45.0"
    gemini_model: gemini-2.5-flash
    use_vertex_ai: true
    gcp_workload_identity_provider: projects/235944902030/.../providers/github-provider
    gcp_service_account: gh-deployer@rag-proyect-499005.iam.gserviceaccount.com
    gcp_project_id: rag-proyect-499005
    gcp_location: us-central1
    gcp_token_format: access_token
    settings: '{"model":{"name":"gemini-2.5-flash"},"experimental":{"useModelRouter":false}}'
    prompt: |
      ... (review de código / de seguridad)
```

### `code_review` (advisory)

Comenta el PR (bugs / calidad / buenas prácticas). **No bloquea** el merge.

### `security_review` (advisory)

Audita el diff buscando vulnerabilidades (XSS, injection, secrets, DOM inseguro, deps inseguras) y
comenta los hallazgos. El check es requerido por el ruleset, pero es advisory (no falla por hallazgos).

### `security_report` (reporte consolidado, no bloqueante)

Job extra (solo en `pull_request`) que junta la salida de seguridad en un **comentario sticky** del
PR (se actualiza en cada push):

- Corre **Trivy en modo reporte** (`CRITICAL,HIGH,MEDIUM`, **incluye sin-fix**, `exit-code: 0`),
  arma una tabla markdown con `jq` y la postea con `marocchino/sticky-pull-request-comment@v2`
  (header `security-report`).
- Apunta además a los hallazgos de **Gemini**, **Snyk** y **SonarQube**.
- **No bloquea.** El gate determinístico es el Trivy del job `quality` (CRITICAL/HIGH con fix); este
  reporte muestra el panorama completo (incluye MEDIUM y sin-fix).

---

## 5. Job `deploy`

`needs: quality`, solo en `push` a `master`
(`if: github.ref == 'refs/heads/master' && github.event_name == 'push'`).

Pasos:

1. **Auth a Google/Firebase** (`google-github-actions/auth@v2`) vía WIF (sin claves JSON).
2. **Build** (`npm run build`) inyectando `VITE_API_URL` (variable de Actions), `VITE_BUILD_VERSION`
   (`${{ github.sha }}`) y `VITE_SENTRY_DSN` (secret).
3. **Deploy**: `npx firebase-tools@latest deploy --only hosting --project rag-proyect-499005`.

### Marcador de versión

El SHA del commit se inyecta como `VITE_BUILD_VERSION` y se muestra en un **badge** en la UI (abajo
a la derecha): `build: <sha-corto>`. Confirma qué versión está publicada en
https://rag-proyect-499005.web.app.

```ts
// src/App.tsx
const BUILD_VERSION = (import.meta.env.VITE_BUILD_VERSION ?? "local").slice(0, 7);
```

---

## 6. Protección de rama (ruleset)

`master` tiene un **repository ruleset** (`enforcement: active`) que exige:

- **Pull request** antes de integrar (no push directo a master).
- **Required status checks**: `quality` y `security_review`.
- Bloquea borrado y force-push (`deletion`, `non_fast_forward`).

El gate real del deploy es `quality` (bloqueante). `security_review` es requerido pero advisory.
`code_review`, `SonarQube` y el check de la app de Snyk no son requeridos (informativos).

> Los rulesets en repos privados requieren GitHub Pro; por eso este repo es **público**.

---

## 7. Autenticación: Workload Identity Federation

GitHub emite un token OIDC que se intercambia por credenciales de GCP/Firebase (sin claves JSON):

| Recurso | Valor |
|---------|-------|
| Workload Identity Pool | `github-pool` |
| OIDC Provider | `github-provider` (condición: `repository_owner == narodriguezb`) |
| Service Account | `gh-deployer@rag-proyect-499005.iam.gserviceaccount.com` |

La SA tiene `roles/firebasehosting.admin` para publicar en Hosting y `roles/aiplatform.user` para
las reviews con Gemini en Vertex AI.

---

## 8. Secrets y variables

GitHub → *Settings → Secrets and variables → Actions*.

| Nombre | Tipo | Uso | Si falta… |
|--------|------|-----|-----------|
| `SONAR_TOKEN` | secret | SonarQube Cloud | el step de Sonar se salta |
| `SNYK_TOKEN` | secret | Snyk SCA | el step de Snyk se salta |
| `VITE_SENTRY_DSN` | secret | DSN de Sentry inyectado en el build | Sentry queda inactivo (no-op) |
| `VITE_API_URL` | **variable** | URL del backend usada en el build (ej. `https://<cloud-run>/api`) | el build usa el default de `client.ts` |

---

## 9. Reproducir los gates en local

```bash
npm ci
npm run lint
npm run build          # VITE_API_URL=... npm run build para apuntar al backend real
npm run coverage
npm run mutation
```

---

## 10. Infraestructura (Firebase)

| Recurso | Valor |
|---------|-------|
| Proyecto | `rag-proyect-499005` |
| Hosting | sitio `rag-proyect-499005` |
| URL | https://rag-proyect-499005.web.app |
| Config | `firebase.json` (sirve `dist/`, rewrite SPA a `/index.html`), `.firebaserc` |

---

## 11. Troubleshooting

| Síntoma | Causa | Solución |
|---------|-------|----------|
| `code_review`/`security_review` falla autenticando a GCP | el SA `gh-deployer@` no tiene `roles/aiplatform.user`, o el WIF no resuelve | otorgar el rol; verificar provider/SA del WIF |
| Gemini CLI: *not running in a trusted directory* | feature de "trusted folders" en modo headless | setear `GEMINI_CLI_TRUST_WORKSPACE: "true"` en el `env` del step |
| Gemini responde `404 model not found` (`gemini-3.x…`) | versiones nuevas de la gemini-cli defaultean a Gemini 3.x + model router | pinear `gemini_cli_version: "0.45.0"`, `gemini_model: gemini-2.5-flash` y `settings: '{"model":{"name":"gemini-2.5-flash"},"experimental":{"useModelRouter":false}}'` |
| Gemini responde `429 RESOURCE_EXHAUSTED` | cuota del modelo agotada | revisar cuotas de Vertex |
| El badge muestra `build: local` | build sin `VITE_BUILD_VERSION` (p. ej. local) | en CI se inyecta `${{ github.sha }}` automáticamente |
| `firebase deploy` local: *Failed to get Firebase project* | `firebase-tools` no toma bien las ADC | en CI usa WIF; en local, `firebase login` |

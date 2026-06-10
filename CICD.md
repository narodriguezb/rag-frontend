# CI/CD — Frontend (`rag-frontend`)

Documentación detallada del pipeline de integración y despliegue continuo.
Resumen y enlace en el [README](README.md#cicd). Definición: [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

---

## Tabla de contenidos

- [Stack y herramientas](#stack-y-herramientas)

1. [Visión general](#1-visión-general)
2. [Disparadores](#2-disparadores)
3. [Job `quality`](#3-job-quality)
4. [Reviews con Claude (`code_review` / `security_review`)](#4-reviews-con-claude)
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
   commit  ─────►   │  quality            code_review (Claude)   security_review │
   en una rama      │  (lint, build,      (comenta el diff,      (Claude; falla  │
                    │   tests, mutation)   advisory)             si hay hallazgos)│
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
| `security_review` | `pull_request` | **Sí** (check requerido) |
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
| Trivy | `aquasecurity/trivy-action@master` | escaneo de vulnerabilidades (filesystem/deps) |
| SonarQube Cloud | `SonarSource/sonarqube-scan-action@v4` | análisis estático + cobertura |
| Snyk | GitHub App (check `security/snyk`) | vulnerabilidades de deps (aparte del workflow) |
| Claude code review | `anthropics/claude-code-action@v1` | revisión de código (advisory) |
| Claude security review | `anthropics/claude-code-security-review@main` | revisión de seguridad (gate) |

### Build y deploy
| Herramienta | Versión / ref | Rol |
|---|---|---|
| `actions/setup-node` | `@v4` | Node 20 + caché de npm |
| firebase-tools | `@latest` (vía `npx`) | deploy a Firebase Hosting |
| `google-github-actions/auth` | `@v2` | WIF (OIDC → Google/Firebase) |

### Caché
| Caché | Mecanismo | Efecto |
|---|---|---|
| Dependencias npm | `actions/setup-node` con `cache: npm` | acelera `npm ci` en `quality` y `deploy` |

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
    branches: [master]   # PR -> quality + reviews de Claude
  workflow_dispatch:     # ejecución manual
```

Permisos del `GITHUB_TOKEN`: `contents: read`, `id-token: write` (WIF) y
`pull-requests: write` (para que las reviews de Claude comenten).

---

## 3. Job `quality`

Runner `ubuntu-latest`, Node 20 con caché de npm. Pasos en orden:

| # | Paso | Comando | Falla si… |
|---|------|---------|-----------|
| 1 | Lint | `npm run lint` (ESLint flat config) | hay errores de lint |
| 2 | Type-check + build | `npm run build` (`tsc -b` + `vite build`); inyecta `VITE_API_URL` y `VITE_BUILD_VERSION` | hay errores de tipos o de build |
| 3 | Tests + cobertura | `npm run coverage` (vitest + v8) | falla un test; genera `coverage/lcov.info` para SonarQube |
| 4 | Mutation testing | `npm run mutation` (Stryker) | el *mutation score* baja del **break threshold = 50%** (en `stryker.conf.json`) |
| 5 | Trivy (SCA/IaC) | `aquasecurity/trivy-action` (`scan-type: fs`, `severity: CRITICAL,HIGH`, `ignore-unfixed: true`) | hay vulnerabilidades CRITICAL/HIGH con fix |
| 6 | SonarQube Cloud | `SonarSource/sonarqube-scan-action` (`continue-on-error: true`) | **no bloquea**; solo corre si existe `SONAR_TOKEN` |

> Scope de mutación en `stryker.conf.json` (`mutate`, `thresholds.break: 50`).

---

## 4. Reviews con Claude

Dos jobs independientes que solo corren en `pull_request` (revisan el *diff*).

### `code_review` (advisory)

- Action: `anthropics/claude-code-action@v1`, modelo `claude-sonnet-4-6`.
- Comenta el PR (bugs / calidad / buenas prácticas). **No bloquea** el merge.
- Requiere la **GitHub App de Claude** (https://github.com/apps/claude) instalada en el repo.

### `security_review` (gate)

- Action: `anthropics/claude-code-security-review@main`, modelo `claude-sonnet-4-6`.
- Audita el diff; un paso posterior hace `exit 1` si `findings-count > 0`:

  ```yaml
  - name: Fail if security findings
    if: ${{ steps.sec.outputs.findings-count > 0 }}
    run: exit 1
  ```
- Es check **requerido** → si Claude encuentra algo, **bloquea el merge**.

---

## 5. Job `deploy`

`needs: quality`, solo en `push` a `master`
(`if: github.ref == 'refs/heads/master' && github.event_name == 'push'`).

Pasos:

1. **Auth a Google/Firebase** (`google-github-actions/auth@v2`) vía WIF (sin claves JSON).
2. **Build** (`npm run build`) inyectando `VITE_API_URL` (variable de Actions) y
   `VITE_BUILD_VERSION` (`${{ github.sha }}`).
3. **Deploy**: `npx firebase-tools deploy --only hosting --project rag-proyect-499005`.

### Marcador de versión

El SHA del commit se inyecta como `VITE_BUILD_VERSION` y se muestra en un **badge** en la UI
(abajo a la derecha): `build: <sha-corto>`. Confirma qué versión está publicada en
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

Si el `security_review` de Claude falla, **el PR no se puede mergear** → no hay deploy.
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

La SA tiene `roles/firebasehosting.admin` para publicar en Hosting.

---

## 8. Secrets y variables

GitHub → *Settings → Secrets and variables → Actions*.

| Nombre | Tipo | Uso | Si falta… |
|--------|------|-----|-----------|
| `ANTHROPIC_API_KEY` | secret | reviews de Claude | los reviews no pueden correr |
| `SONAR_TOKEN` | secret | SonarQube Cloud | el step de Sonar se salta |
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
| `code_review` falla en ~25s: *Claude Code is not installed* | falta la GitHub App de Claude en este repo | instalar https://github.com/apps/claude |
| `code_review` falla: *Workflow validation failed... identical content on default branch* | el PR modifica `ci.yml` | normal al cambiar el workflow; se resuelve al mergear |
| `security_review` falla con `findings-count > 0` | Claude encontró un hallazgo real | corregir el hallazgo (es el gate funcionando) |
| El badge muestra `build: local` | build sin `VITE_BUILD_VERSION` (p. ej. local) | en CI se inyecta `${{ github.sha }}` automáticamente |
| `firebase deploy` local: *Failed to get Firebase project* | `firebase-tools` no toma bien las ADC | en CI usa WIF; en local, `firebase login` o desplegar vía la API REST de Hosting |

> Snyk se removió del workflow (el escaneo se colgaba). La cobertura de Snyk queda vía su propia
> GitHub App (check `security/snyk`), que corre aparte y no bloquea.

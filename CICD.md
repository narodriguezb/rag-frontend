# CI/CD — Frontend

Documentación del flujo de integración y despliegue continuo del frontend
(React + Vite + TypeScript). Los workflows viven en `.github/workflows/`.

## Resumen

- Los **gates de calidad y seguridad** corren en **cada PR a `master`**.
- El **deploy** a Firebase Hosting corre solo cuando hay commits en `master`
  (push/merge), y **solo si el gate de calidad pasa**.
- Dos reviews con **Claude** comentan automáticamente cada PR.

```
PR a master    ──► quality (lint, build, tests, mutation, Trivy, Snyk, Sonar)
                   + Claude code review + Claude security review (comentan el PR)
merge a master ──► quality ──► deploy (Firebase Hosting vía WIF)
```

## Workflows

| Archivo | Disparador | Qué hace |
|---|---|---|
| `ci.yml` | PR + push a `master` | Gate de calidad → deploy (gateado) |
| `code-review.yml` | PR a `master` | Claude revisa el diff y comenta (equiv. `/code-review`) |
| `security-review.yml` | PR a `master` | Claude hace revisión de seguridad y comenta (equiv. `/security-review`) |

### `ci.yml`

**Job `quality`** (corre en PR y en push). Pasos en orden:

1. **eslint** — linter.
2. **build** — `tsc -b` (type-check) + `vite build`. Usa `VITE_API_URL`
   (variable de Actions) como URL del backend.
3. **vitest + coverage** — tests; genera `coverage/lcov.info` para SonarQube.
4. **Stryker** — mutation testing; `break threshold = 50%` en `stryker.conf.json`
   (falla si el score es < 50%).
5. **Trivy** — escaneo de vulnerabilidades del filesystem (`CRITICAL,HIGH`, solo
   fixables). Bloqueante.
6. **Snyk** — vulnerabilidades en dependencias npm (por defecto solo producción).
   Corre solo si existe `SNYK_TOKEN`.
7. **SonarQube Cloud** — análisis estático + cobertura. Corre solo si existe
   `SONAR_TOKEN`. **No bloqueante** (`continue-on-error`).

**Job `deploy`** (`needs: quality`, solo en push a `master`):

- Se autentica a Google/Firebase con **Workload Identity Federation (WIF)** — sin
  claves JSON.
- Hace `npm run build` y publica `dist/` en **Firebase Hosting**
  (`firebase deploy --only hosting`).

### `code-review.yml` y `security-review.yml`

- Usan las actions oficiales `anthropics/claude-code-action` y
  `anthropics/claude-code-security-review`.
- Modelo: `claude-sonnet-4-6` (se puede subir a `claude-opus-4-8`).
- Necesitan `pull-requests: write` para comentar en el PR.
- Consumen tokens de la cuenta Anthropic en cada PR.

## Comandos locales (replican el gate)

```bash
npm run lint          # eslint
npm run build         # type-check + build
npm run coverage      # tests + cobertura (genera coverage/lcov.info)
npm run mutation      # mutation testing (Stryker)
```

## Secrets y variables

GitHub → *Settings → Secrets and variables → Actions*.

| Nombre | Tipo | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | secret | Reviews de Claude (code + security) |
| `SONAR_TOKEN` | secret | SonarQube Cloud (opcional) |
| `SNYK_TOKEN` | secret | Snyk (opcional) |
| `VITE_API_URL` | **variable** | URL del backend (ej. `https://<cloud-run>/api`) usada en el build |

Si un secret opcional no está, su paso se salta sin romper el pipeline.

## Infraestructura (Google Cloud / Firebase)

| Recurso | Valor |
|---|---|
| Proyecto | `rag-proyect-499005` |
| Hosting | Firebase Hosting, sitio `rag-proyect-499005` (`https://rag-proyect-499005.web.app`) |
| WIF | pool `github-pool`, provider `github-provider`, SA `gh-deployer@rag-proyect-499005.iam.gserviceaccount.com` (rol `firebasehosting.admin`) |

## Cómo probar

1. Crea una rama, haz commit y abre un **PR a `master`**.
2. En el PR verás correr `quality` + los dos reviews de Claude (comentan inline).
3. Antes del primer deploy, define la variable `VITE_API_URL` con la URL real del
   backend. Al **mergear a `master`** se dispara el `deploy` a Firebase Hosting.

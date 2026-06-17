# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Course Materials RAG — Frontend. A React + TypeScript single-page app built with Vite and styled with Tailwind CSS. It provides a chat interface to query course materials and renders intelligent, context-aware answers (with sources) returned by the FastAPI backend (separate repo: `../rag-backend`).

The app has no backend of its own — all data comes from the RAG API over HTTP.

## Development Commands

### Local Development
```bash
npm install           # Install dependencies
npm run dev           # Start Vite dev server at http://localhost:5173
```

### Building
```bash
npm run build         # Type-check (tsc -b) + production build into dist/
npm run preview       # Preview the production build locally
```

## Architecture

### Entry Point
- **`src/main.tsx`**: Mounts the React tree (`<App />`) into `#root`, imports global `index.css`.
- **`src/App.tsx`**: Layout shell — sidebar + chat column. Wires the `useChat` hook to the UI.

### State
- **`src/hooks/useChat.ts`**: Owns chat state — message list, loading flag, and the session id (`useRef`). Exposes `sendMessage(query)`. The backend session id is captured from the first response and reused on subsequent calls.

### API Integration
- **`src/api/client.ts`**: Typed `fetch` wrappers — no axios.
  - `postQuery(query, sessionId)` → `POST {VITE_API_URL}/query`
  - `getCourseStats()` → `GET {VITE_API_URL}/courses`
- Base URL comes from `VITE_API_URL` (default `http://localhost:8000/api`).
- Shared API/domain types live in **`src/types.ts`** (`Source`, `QueryResponse`, `CourseStats`, `ChatMessage`).

### Components (`src/components/`)
| Component | Responsibility |
|---|---|
| `Sidebar` | Left column container (course stats + suggested questions) |
| `CourseStatsPanel` | Fetches `/courses` on mount, renders count + titles |
| `SuggestedQuestions` | Static prompt buttons that trigger a query |
| `CollapsibleSection` | Reusable collapsible used by both sidebar sections |
| `ChatMessages` | Scrollable message list, auto-scrolls to bottom |
| `Message` | A single bubble; renders markdown + collapsible sources for assistant turns |
| `ChatInput` | Text input + send button |
| `LoadingDots` | Three-dot typing indicator |

### Markdown
Assistant answers are rendered with `react-markdown` + `remark-gfm`. Markdown element styling lives under the `.markdown` class in `src/index.css`.

### Observability (Sentry)
Error and performance monitoring via `@sentry/react`, initialized in `src/observability/sentry.ts` (`initSentry()`), wired in `src/main.tsx` (init + `Sentry.ErrorBoundary`). `useChat` reports chat errors with `Sentry.captureException`. **It is a no-op unless `VITE_SENTRY_DSN` is set**, so it never breaks local dev without a DSN. In CI the build receives the DSN from the GitHub secret `VITE_SENTRY_DSN`.

## Environment Variables
Vite only exposes vars prefixed with `VITE_`:
- `VITE_API_URL`: Backend API base URL (default `http://localhost:8000/api`)
- `VITE_SENTRY_DSN`: Sentry DSN (optional; Sentry is disabled when empty)

Files:
- `.env`: Local development (gitignored)
- `.env.example`: Committed template — keep its keys in sync with `.env`

## Development Guidelines

### Styling Preferences
- **Primary**: Use Tailwind CSS utility classes for all new components, via the `className` prop.
- **Fallback**: Use inline `style` / a `<style>` rule in `index.css` only when Tailwind cannot express it (e.g. dynamic keyframe delays in `LoadingDots`).
- The dark theme is defined as Tailwind theme tokens in `src/index.css` (`@theme { --color-* }`). Reuse tokens (`bg-surface`, `text-text-secondary`, `border-border`, `bg-primary`, …) instead of hardcoding hex values.
- **NEVER use `!important`** — solve specificity by proper utilities or inline styles.

### Code Quality
- **Always remove comments at the end**: after implementing changes, clean up explanatory comments. Keep code self-documenting through clear names. Only keep comments for genuinely non-obvious logic.
- Scan files you touch — remove unused imports, variables, and dead branches.

### TypeScript
- Strict mode enabled (`noUnusedLocals` / `noUnusedParameters` on).
- Shared types in `src/types.ts`; env typing in `src/vite-env.d.ts`.

### Component Structure
- One component per file under `src/components/`.
- Components are presentational where possible; chat state lives in `useChat`, not in components.

## Gotchas Claude tends to get wrong here
- Adding a hex color instead of reusing a `--color-*` theme token from `index.css`.
- Calling `fetch` directly in a component instead of going through `src/api/client.ts`.
- Forgetting to keep `.env.example` in sync when adding a new `VITE_` var.
- Reading the session id from component state instead of the `sessionId` ref in `useChat`.
- Reaching for axios — this project uses native `fetch`.

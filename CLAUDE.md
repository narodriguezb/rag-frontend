# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Descripción del proyecto

Course Materials RAG — Frontend. Single-page app React + TypeScript construida con Vite y estilada
con Tailwind CSS. Ofrece una interfaz de chat para consultar materiales de curso y renderiza
respuestas con contexto (y fuentes) devueltas por el backend FastAPI (repo aparte: `../rag-backend`).

La app no tiene backend propio — todos los datos vienen de la API RAG por HTTP.

## Comandos de desarrollo

### Desarrollo local
```bash
npm install           # instala dependencias
npm run dev           # dev server de Vite en http://localhost:5173
```

### Build
```bash
npm run build         # type-check (tsc -b) + build de producción en dist/
npm run preview       # previsualiza el build de producción
```

## Arquitectura

### Entry point
- **`src/main.tsx`**: monta el árbol React (`<App />`) en `#root`, importa el `index.css` global.
- **`src/App.tsx`**: shell de layout — sidebar + columna de chat. Conecta el hook `useChat` a la UI.

### Estado
- **`src/hooks/useChat.ts`**: dueño del estado de chat — lista de mensajes, flag de loading y el
  session id (`useRef`). Expone `sendMessage(query)`. El session id del backend se captura de la
  primera respuesta y se reutiliza en las siguientes.

### Integración con la API
- **`src/api/client.ts`**: wrappers tipados de `fetch` — sin axios.
  - `postQuery(query, sessionId)` → `POST {VITE_API_URL}/query`
  - `getCourseStats()` → `GET {VITE_API_URL}/courses`
- La base URL viene de `VITE_API_URL` (default `http://localhost:8000/api`).
- Los tipos compartidos de API/dominio viven en **`src/types.ts`** (`Source`, `QueryResponse`,
  `CourseStats`, `ChatMessage`).

### Componentes (`src/components/`)
| Componente | Responsabilidad |
|---|---|
| `Sidebar` | Contenedor de la columna izquierda (course stats + preguntas sugeridas) |
| `CourseStatsPanel` | Fetchea `/courses` al montar, renderiza conteo + títulos |
| `SuggestedQuestions` | Botones de prompt estáticos que disparan una query |
| `CollapsibleSection` | Colapsable reusable usado por ambas secciones del sidebar |
| `ChatMessages` | Lista de mensajes con scroll, auto-scroll al fondo |
| `Message` | Una burbuja; renderiza markdown + fuentes colapsables en turnos del asistente |
| `ChatInput` | Input de texto + botón de enviar |
| `LoadingDots` | Indicador de "escribiendo" de tres puntos |

### Markdown
Las respuestas del asistente se renderizan con `react-markdown` + `remark-gfm`. El estilado de los
elementos markdown vive bajo la clase `.markdown` en `src/index.css`.

### Observabilidad (Sentry)
Monitoreo de errores y performance vía `@sentry/react`, inicializado en `src/observability/sentry.ts`
(`initSentry()`), conectado en `src/main.tsx` (init + `Sentry.ErrorBoundary`). `useChat` reporta
errores de chat con `Sentry.captureException`. **Es un no-op salvo que `VITE_SENTRY_DSN` esté
seteado**, así que nunca rompe el desarrollo local sin DSN. En CI el build recibe el DSN desde el
secret `VITE_SENTRY_DSN`.

## Variables de entorno
Vite solo expone vars con prefijo `VITE_`:
- `VITE_API_URL`: base URL de la API del backend (default `http://localhost:8000/api`)
- `VITE_SENTRY_DSN`: DSN de Sentry (opcional; Sentry se deshabilita cuando está vacío)

Archivos:
- `.env`: desarrollo local (gitignored)
- `.env.example`: template commiteado — mantener sus keys en sync con `.env`

## Guías de desarrollo

### Preferencias de estilado
- **Primario**: usar clases utility de Tailwind CSS para todos los componentes nuevos, vía el prop
  `className`.
- **Fallback**: usar `style` inline / una regla `<style>` en `index.css` solo cuando Tailwind no lo
  pueda expresar (p. ej. delays dinámicos de keyframes en `LoadingDots`).
- El tema oscuro está definido como tokens de tema de Tailwind en `src/index.css` (`@theme
  { --color-* }`). Reusar tokens (`bg-surface`, `text-text-secondary`, `border-border`,
  `bg-primary`, …) en lugar de hardcodear valores hex.
- **Nunca usar `!important`** — resolver la especificidad con utilities apropiadas o estilos inline.

### Calidad de código
- **Eliminar comentarios al final:** tras implementar cambios, limpiar comentarios explicativos.
  Mantener el código autoexplicativo con nombres claros. Conservar comentarios solo para lógica
  genuinamente no obvia.
- Al tocar un archivo, eliminar imports, variables y ramas muertas que queden sin uso.

### TypeScript
- Strict mode habilitado (`noUnusedLocals` / `noUnusedParameters`).
- Tipos compartidos en `src/types.ts`; typing de env en `src/vite-env.d.ts`.

### Estructura de componentes
- Un componente por archivo en `src/components/`.
- Componentes presentacionales donde sea posible; el estado de chat vive en `useChat`, no en los
  componentes.

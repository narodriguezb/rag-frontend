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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry, Sentry } from "./observability/sentry";

initSentry();

console.log("CI/CD demo: build", import.meta.env.VITE_BUILD_VERSION ?? "local");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background text-text-secondary">
          Algo salió mal. Recargá la página.
        </div>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);

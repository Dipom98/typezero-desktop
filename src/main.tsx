import { setupTauriMocks } from "./lib/tauri-mock";

// Initialize mocks for browser preview
setupTauriMocks();

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Initialize i18n
import "./i18n";

// Initialize model store (loads models and sets up event listeners)
import { useModelStore } from "./stores/modelStore";
useModelStore.getState().initialize();

import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);


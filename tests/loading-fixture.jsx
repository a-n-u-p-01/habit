// Dev-only component fixture, not included in the production entry graph.
import React from "react";
import { createRoot } from "react-dom/client";
import {
  AppLoading,
  ContentLoading,
  StartupRecovery,
} from "../src/LoadingStates";
import "../src/styles.css";
const state = new URLSearchParams(location.search).get("state");
document.documentElement.dataset.theme = "dark";
const retry = () => {
  document.body.dataset.retried = "true";
};
createRoot(document.getElementById("root")).render(
  state === "content" ? (
    <main className="main-content">
      <ContentLoading />
    </main>
  ) : state === "error" ? (
    <StartupRecovery
      error="Example permission error"
      onRetry={retry}
      onSignOut={() => {}}
    />
  ) : state === "offline" ? (
    <StartupRecovery offline onRetry={retry} />
  ) : (
    <AppLoading fullScreen onRetry={retry} />
  ),
);

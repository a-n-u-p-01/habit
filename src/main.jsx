import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";
registerSW({
  onOfflineReady() {
    console.info("Win Today is ready offline.");
  },
});
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

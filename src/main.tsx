import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/fraunces";
import "./styles/global.css";
import "./stores/theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

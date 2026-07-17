import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.tsx";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");
if (root === null) throw new Error("missing #app root");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

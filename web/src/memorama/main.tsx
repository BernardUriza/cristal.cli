import React from "react";
import { createRoot } from "react-dom/client";
import { Memorama } from "./Memorama.tsx";
import "./memorama.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Memorama />
  </React.StrictMode>,
);

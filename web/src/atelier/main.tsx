import React from "react";
import { createRoot } from "react-dom/client";
import { Atelier } from "./Atelier.tsx";
import "../shared/tokens.css";
import "../minigames/kit/minigame.css";
import "./atelier.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Atelier />
  </React.StrictMode>,
);

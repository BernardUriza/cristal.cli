import React from "react";
import { createRoot } from "react-dom/client";
import { Landing } from "./Landing.tsx";
import "./landing.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Landing />
  </React.StrictMode>,
);

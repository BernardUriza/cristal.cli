import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { GraphicsPreview, parsePreviewParams } from "./graphics/presentation/GraphicsPreview";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const root = params.get("view") === "graphics" ? <GraphicsPreview {...parsePreviewParams(window.location.search)} /> : <App />;

createRoot(document.getElementById("root")!).render(<React.StrictMode>{root}</React.StrictMode>);

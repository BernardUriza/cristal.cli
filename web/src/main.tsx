import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { GraphicsPreview, parsePreviewParams } from "./graphics/presentation/GraphicsPreview";
import { stringParam } from "./shared/url";
import "./styles.css";

const root = stringParam("view") === "graphics" ? <GraphicsPreview {...parsePreviewParams()} /> : <App />;

createRoot(document.getElementById("root")!).render(<React.StrictMode>{root}</React.StrictMode>);

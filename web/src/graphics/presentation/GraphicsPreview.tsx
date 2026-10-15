import { useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { composeIllustration } from "../application/compose.ts";
import { PALETTES } from "../config/palettes.ts";
import { presetInput } from "../config/presets.ts";
import type { ConfigInput } from "../config/types.ts";
import { CompositionPreview } from "./CompositionPreview.tsx";
import { Temple } from "./Temple.tsx";

export type PreviewParams = { input: ConfigInput; backend: "svg" | "canvas" | "three" };

export function parsePreviewParams(search: string): PreviewParams {
  const q = new URLSearchParams(search);
  const input: ConfigInput = { ...(q.get("preset") ? presetInput(q.get("preset") as string) : {}) };
  const num = (key: keyof ConfigInput) => {
    const v = q.get(key);
    if (v !== null) (input as Record<string, unknown>)[key] = Number(v);
  };
  num("seed");
  num("density");
  num("complexity");
  num("anomalyRate");
  if (q.get("palette")) input.palette = q.get("palette") as ConfigInput["palette"];
  if (q.get("symmetry")) input.symmetry = q.get("symmetry") as ConfigInput["symmetry"];
  input.tech = { ...input.tech };
  if (q.get("projection")) input.tech.projection = { kind: q.get("projection") as "perspective" | "elevation" };
  if (q.get("shader")) input.tech.shaderPreset = q.get("shader") as ConfigInput["tech"] extends infer T ? (T extends { shaderPreset?: infer S } ? S : never) : never;
  if (q.get("lod")) input.tech.lod = { detailScale: Number(q.get("lod")) };
  const backend = (q.get("backend") ?? "svg") as PreviewParams["backend"];
  return { input, backend: ["svg", "canvas", "three"].includes(backend) ? backend : "svg" };
}

function DevHandles() {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __gl: typeof gl; __scene: typeof scene };
    w.__gl = gl;
    w.__scene = scene;
  }, [gl, scene]);
  return null;
}

export function GraphicsPreview(initial: PreviewParams) {
  const [{ input, backend }, setParams] = useState(initial);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __graphicsPreview: { set: typeof setParams } }).__graphicsPreview = { set: setParams };
  }, []);
  const illustration = useMemo(() => composeIllustration(input), [input]);
  const pal = PALETTES[illustration.cfg.art.palette];
  if (backend === "three") {
    return (
      <div data-backend="three" style={{ position: "fixed", inset: 0, background: pal.bg }}>
        <Canvas shadows camera={{ fov: 60, near: 0.1, far: 200, position: [0, 3, 0] }}>
          <color attach="background" args={[pal.bg]} />
          <hemisphereLight args={[pal.bg, pal.deep, 0.9]} />
          <directionalLight position={[8, 20, -10]} intensity={1.6} castShadow />
          <Temple input={input} viewDistance={20} />
          <OrbitControls target={[0, 3.5, 20]} />
          <DevHandles />
        </Canvas>
      </div>
    );
  }
  return (
    <div style={{ background: pal.bg, minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <CompositionPreview illustration={illustration} backend={backend} />
    </div>
  );
}

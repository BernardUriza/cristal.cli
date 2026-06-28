import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./game/Scene";
import { InteractPrompt } from "./ui/InteractPrompt";
import { ConsoleOverlay } from "./ui/ConsoleOverlay";
import { DebugHUD } from "./ui/DebugHUD";
import { useGame } from "./game/store";
import { GameMode } from "./game/types";

function ModeBadge() {
  const mode = useGame((s) => s.mode);
  return <div className="mode-badge">MODE: {mode.toUpperCase()}</div>;
}

export function App() {
  // Global ESC also exits the console (mirrors LabyrinthManager.Update).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" && useGame.getState().mode === GameMode.Console) {
        useGame.getState().exitConsoleMode();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 5, 10] }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      <div className="hud">
        <ModeBadge />
        <InteractPrompt />
        <DebugHUD />
      </div>
      <ConsoleOverlay />
    </>
  );
}

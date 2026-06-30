import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./game/Scene";
import { RoomScene } from "./game/RoomScene";
import { InteractPrompt } from "./ui/InteractPrompt";
import { ConsoleOverlay } from "./ui/ConsoleOverlay";
import { DebugHUD } from "./ui/DebugHUD";
import { RoomPanel } from "./ui/RoomPanel";
import { RoomCaption } from "./ui/RoomCaption";
import { Minimap } from "./ui/Minimap";
import { DangerBadge } from "./ui/DangerBadge";
import { RoomJournal } from "./ui/RoomJournal";
import { useGame } from "./game/store";
import { GameMode } from "./game/types";
import { symbolicBus } from "./game/symbolicBus";
import { resolveRoomPressureAtmosphere } from "./game/RoomPressureController";

function ModeBadge() {
  const mode = useGame((s) => s.mode);
  return <div className="mode-badge">MODE: {mode.toUpperCase()}</div>;
}

// The maze and a generated room are mutually exclusive 3D worlds; swap between
// them by mode so neither controller fights for the camera.
function World() {
  const inRoom = useGame((s) => s.mode === GameMode.Room);
  return inRoom ? <RoomScene /> : <Scene />;
}

function PressureVignette() {
  const inRoom = useGame((s) => s.mode === GameMode.Room);
  const pressure = useGame((s) => s.psychologicalPressure);
  const spike = useGame((s) => s.roomPressureSpike);
  const ending = useGame((s) => s.pressureEnding);
  if (!inRoom) return null;

  const { vignetteAmount } = resolveRoomPressureAtmosphere({
    pressure: ending?.active ? ending.atmospherePressure : pressure + spike,
  });
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        opacity: vignetteAmount,
        background:
          "radial-gradient(circle at center, rgba(0,0,0,0) 44%, rgba(20,2,2,0.42) 74%, rgba(0,0,0,0.88) 100%)",
        transition: "opacity 260ms linear",
        zIndex: 2,
      }}
    />
  );
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

  useEffect(() => symbolicBus.subscribe(useGame.getState().setLastSymbol), []);

  return (
    <>
      <Canvas
        shadows
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 5, 10] }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </Canvas>

      <div className="hud">
        <ModeBadge />
        <InteractPrompt />
        <DebugHUD />
        <DangerBadge />
      </div>
      <RoomPanel />
      <RoomCaption />
      <Minimap />
      <RoomJournal />
      <PressureVignette />
      <ConsoleOverlay />
    </>
  );
}

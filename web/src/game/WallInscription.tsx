import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Maze } from "./maze";
import { inscriptionPose, type WorldInscription } from "./inscriptions/WorldInscriptions";
import { isEvasiveStance } from "../terminal/psych/stanceUtils";

const REVEAL_MS = 1600;
const PLANE_W = 2.6;
const PLANE_H = 0.72;

function splitLines(text: string): string[] {
  if (text.length <= 16) return [text];
  const cut = text.lastIndexOf(" ", 16);
  return cut > 4 ? [text.slice(0, cut), text.slice(cut + 1)] : [text];
}

function makeInscriptionTexture(text: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 144;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = accent;
  ctx.shadowBlur = 18;
  const lines = splitLines(text);
  ctx.font = lines.length > 1 ? "600 40px ui-monospace, monospace" : "600 46px ui-monospace, monospace";
  const step = lines.length > 1 ? 48 : 0;
  lines.forEach((line, i) => ctx.fillText(line, canvas.width / 2, canvas.height / 2 + (i - (lines.length - 1) / 2) * step));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function WallInscription({ maze, inscription }: { maze: Maze; inscription: WorldInscription }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const pose = useMemo(() => inscriptionPose(maze, inscription), [maze, inscription]);
  const texture = useMemo(() => makeInscriptionTexture(inscription.text, inscription.accent), [inscription.text, inscription.accent]);
  const fullOpacity = inscription.stance && isEvasiveStance(inscription.stance) ? 0.62 : inscription.source === "console" ? 1 : 0.8;

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const mat = matRef.current;
    if (!mat) return;
    const age = Date.now() - inscription.at;
    mat.opacity = Math.min(1, Math.max(0, age / REVEAL_MS)) * fullOpacity;
  });

  return (
    <mesh position={pose.position} rotation={[0, pose.rotationY, 0]}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshBasicMaterial ref={matRef} map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

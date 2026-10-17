import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Maze } from "./maze";
import { inscriptionPose, type WorldInscription } from "./inscriptions/WorldInscriptions";
import { isEvasiveStance } from "../terminal/psych/stanceUtils";
import { makeWallInscriptionTexture } from "./textTexture";

const REVEAL_MS = 1600;
const PLANE_W = 2.6;
const PLANE_H = 0.72;

export function WallInscription({ maze, inscription }: { maze: Maze; inscription: WorldInscription }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const pose = useMemo(() => inscriptionPose(maze, inscription), [maze, inscription]);
  const texture = useMemo(() => makeWallInscriptionTexture(inscription.text, inscription.accent), [inscription.text, inscription.accent]);
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

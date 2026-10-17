import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useGame } from "./store";
import { shouldOfferSafeExit } from "./RuntimeTransference";
import { playEnterDrone } from "./audio";
import { resolveRoomPressureAtmosphere } from "./RoomPressureController";
import { deriveRoomD1Results } from "./RoomD1Derivations";
import {
  CeilingLight,
  DeadCorridors,
  Door,
  FirstPersonController,
  RoomShell,
  atmosphere,
  buildDoors,
  deadCorridorCount,
  dimsForShape,
  driftDims,
  makeInscriptionTexture,
  surfaceForShape,
  type Rgb,
} from "./room";

const toColor = ({ r, g, b }: Rgb) => new THREE.Color(r, g, b);

export function RoomScene() {
  const room = useGame((s) => s.room);
  const nearbyExit = useGame((s) => s.nearbyExit);
  const psychologicalPressure = useGame((s) => s.psychologicalPressure);
  const psychologicalStance = useGame((s) => s.psychologicalStance);
  const roomPressureSpike = useGame((s) => s.roomPressureSpike);
  const pressureEnding = useGame((s) => s.pressureEnding);
  const emotionalHistory = useGame((s) => s.emotionalHistory);
  const falseDoorCount = useGame((s) => s.falseDoorAnnotations.length);
  const transference = useGame((s) => s.transference);
  const worldBehavior = transference.worldBehavior;
  const architectureDrift = worldBehavior?.architectureDrift ?? 0;
  const seasonRefusal = transference.emotionalSeason.effects.refusal;

  const dims = useMemo(() => driftDims(dimsForShape(room?.shape ?? "chamber"), architectureDrift), [room, architectureDrift]);
  const atmo = useMemo(() => {
    const a = atmosphere(room?.dread ?? 0, worldBehavior?.lightingBias, seasonRefusal, seasonRefusal);
    return { ...a, fogColor: toColor(a.fogColor), wallColor: toColor(a.wallColor) };
  }, [room, worldBehavior?.lightingBias, seasonRefusal]);
  const pressure = useMemo(
    () =>
      resolveRoomPressureAtmosphere({
        pressure: pressureEnding?.active ? pressureEnding.atmospherePressure : psychologicalPressure + roomPressureSpike,
      }),
    [psychologicalPressure, pressureEnding, roomPressureSpike]
  );
  const { safeExit, mirrors } = useMemo(() => {
    const d1 = deriveRoomD1Results({ room, psychologicalStance, psychologicalPressure, emotionalHistory, falseDoorCount });
    return {
      safeExit: room && shouldOfferSafeExit(room, d1.safeExit, worldBehavior) ? d1.safeExit : null,
      mirrors: d1.mirrors,
    };
  }, [room, psychologicalPressure, psychologicalStance, emotionalHistory, falseDoorCount, worldBehavior]);
  const doors = useMemo(() => (room ? buildDoors(room, dims, safeExit, mirrors) : []), [room, dims, safeExit, mirrors]);
  const surface = useMemo(() => surfaceForShape(room?.shape ?? "chamber"), [room]);
  const inscriptionTex = useMemo(() => (room ? makeInscriptionTexture(room.inscription) : null), [room]);
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: atmo.wallColor,
        emissive: atmo.wallColor.clone().multiplyScalar(0.6),
        roughness: surface.roughness,
        metalness: surface.metalness,
        side: THREE.BackSide,
      }),
    [atmo.wallColor, surface.roughness, surface.metalness]
  );

  useEffect(() => () => inscriptionTex?.dispose(), [inscriptionTex]);
  useEffect(() => () => wallMat.dispose(), [wallMat]);

  const seed = room?.seed;
  const dread = room?.dread ?? 0;
  useEffect(() => {
    if (seed !== undefined) playEnterDrone(dread);
  }, [seed, dread]);

  if (!room) return null;

  const pressureColor = new THREE.Color(pressure.ambientColor);
  const doorColor = new THREE.Color("#7dffd0").lerp(new THREE.Color("#ffd1a6"), pressure.pressure * 0.35);
  const safeDoorColor = new THREE.Color("#ffd1a6").lerp(new THREE.Color("#fff1cc"), safeExit?.warmth ?? 0);
  const ceilingColor = atmo.fogColor.clone().lerp(pressureColor, pressure.pressure).offsetHSL(0, 0, 0.4);
  const fogColor = atmo.fogColor.clone().lerp(pressureColor, pressure.pressure * 0.7);
  const fogNear = Math.max(1.5, atmo.fogNear - pressure.fogDensity * 4 - architectureDrift * 2);
  const fogFar = Math.max(fogNear + 5, atmo.fogFar - pressure.fogDensity * 16 - architectureDrift * 7);
  const mirrorDeadCorridors = deadCorridorCount(mirrors, doors.length, worldBehavior?.mirrorIntensity ?? 0);
  const omitInscription = transference.absencePlan.omissions.some((item) => item.kind === "sentence");
  const inscriptionW = Math.min(dims.w * 0.8, 7);

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />
      <ambientLight
        intensity={Math.max(0.52, atmo.ambient - pressure.fogDensity * 0.2)}
        color={pressureColor.clone().lerp(atmo.fogColor, 0.35).offsetHSL(0, 0, 0.22)}
      />
      <CeilingLight dims={dims} dread={room.dread} color={ceilingColor} pressure={pressure} />
      <RoomShell dims={dims} material={wallMat} pressure={pressure} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[dims.w, dims.d]} />
        <meshStandardMaterial color={atmo.wallColor.clone().multiplyScalar(0.7)} roughness={0.95} />
      </mesh>
      {inscriptionTex && !omitInscription && (
        <mesh position={[0, dims.h * 0.66, -dims.d / 2 + 0.08]}>
          <planeGeometry args={[inscriptionW, inscriptionW / 4]} />
          <meshBasicMaterial map={inscriptionTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {doors.map((d) => (
        <Door
          key={d.index}
          spec={d}
          color={d.safe ? safeDoorColor : doorColor}
          active={nearbyExit === d.index}
          pressure={pressure}
          safeExit={safeExit}
        />
      ))}
      {mirrors && mirrorDeadCorridors > 0 && (
        <DeadCorridors dims={dims} usedDoors={doors.length} count={mirrorDeadCorridors} color={doorColor} />
      )}
      <FirstPersonController dims={dims} doors={doors} />
    </>
  );
}

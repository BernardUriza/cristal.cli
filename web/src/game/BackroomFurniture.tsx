import { useEffect, useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { WALL_HEIGHT } from "./maze";
import { backroomFurnitureByKind, type BackroomFurnitureKind } from "./backroomFurniture";
import type { BackroomFurniturePlacement } from "./BackroomFurniturePlacer";
import { assignAreaLights } from "./furniture/areaLightBudget";
import { FurnitureMaterialCache } from "./furniture/materialCache";
import { createFurnitureMaterial, type FurnitureMaterialKey } from "./furniture/materials";
import { FurnitureMaterialsContext, useFurnitureMaterial } from "./furniture/materialsContext";
import { FurnitureBox, GlowPanel } from "./furniture/primitives";

RectAreaLightUniformsLib.init();

export interface BackroomFurnitureProps {
  kind: BackroomFurnitureKind;
  position: [number, number, number];
  rotationY?: number;
  areaLight?: boolean;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled backroom furniture kind: ${value}`);
}

function flickerNoise(bucket: number, seed: number) {
  let n = bucket * 374761393 + seed * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function FluorescentCeilingLight({ accent, areaLight }: { accent: string; areaLight: boolean }) {
  const mat = useFurnitureMaterial()("fluorescentTube");
  const pointLight = useRef<THREE.PointLight>(null);
  const rectLight = useRef<THREE.RectAreaLight>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.elapsedTime;
    const buzz = flickerNoise(Math.floor(elapsed * 22), 17);
    const dropout = flickerNoise(Math.floor(elapsed * 3.4), 41) > 0.86 ? 0.2 : 1;
    const stutter = buzz > 0.9 ? 0.38 : 1;
    const drift = (flickerNoise(Math.floor(elapsed * 5.5), 73) - 0.5) * 0.22;
    const intensity = Math.max(0.18, (1.35 + drift + buzz * 0.42) * dropout * stutter);
    mat.emissiveIntensity = intensity;
    if (pointLight.current) pointLight.current.intensity = 0.24 + intensity * 0.22;
    if (rectLight.current) rectLight.current.intensity = 0.45 + intensity * 0.28;
  });

  return (
    <group position={[0, WALL_HEIGHT - 0.06, 0]}>
      <FurnitureBox material={mat} position={[0, 0, 0]} scale={[1.5, 0.08, 0.42]} radius={0.035} />
      <GlowPanel color={accent} opacity={0.11} position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]} size={[1.9, 0.72]} />
      {areaLight ? (
        <rectAreaLight
          ref={rectLight}
          position={[0, -0.12, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          width={1.45}
          height={0.36}
          intensity={0.75}
          color={accent}
        />
      ) : null}
      <pointLight ref={pointLight} position={[0, -0.2, 0]} intensity={0.55} distance={4.5} decay={2} color={accent} />
    </group>
  );
}

function OfficeDesk() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("deskTop")} position={[0, 0.78, 0]} scale={[1.75, 0.16, 0.92]} radius={0.035} />
      <FurnitureBox material={furnitureMaterial("deskLeg")} position={[-0.68, 0.38, -0.3]} scale={[0.16, 0.76, 0.16]} radius={0.025} />
      <FurnitureBox material={furnitureMaterial("deskLeg")} position={[0.68, 0.38, -0.3]} scale={[0.16, 0.76, 0.16]} radius={0.025} />
      <FurnitureBox material={furnitureMaterial("deskLeg")} position={[-0.68, 0.38, 0.3]} scale={[0.16, 0.76, 0.16]} radius={0.025} />
      <FurnitureBox material={furnitureMaterial("deskLeg")} position={[0.68, 0.38, 0.3]} scale={[0.16, 0.76, 0.16]} radius={0.025} />
      <FurnitureBox material={furnitureMaterial("monitorPlastic")} position={[0.45, 1.0, -0.18]} scale={[0.42, 0.24, 0.08]} radius={0.02} />
    </group>
  );
}

function OfficeChair() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("chairVinyl")} position={[0, 0.52, 0]} scale={[0.78, 0.14, 0.72]} radius={0.04} />
      <FurnitureBox material={furnitureMaterial("chairVinyl")} position={[0, 1.02, 0.3]} scale={[0.78, 0.78, 0.12]} radius={0.035} />
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.44, 10]} />
        <primitive object={furnitureMaterial("chairBase")} attach="material" />
      </mesh>
      {[-0.32, 0.32].map((x) =>
        [-0.3, 0.3].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.08, z]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.12, 8]} />
            <primitive object={furnitureMaterial("darkRubber")} attach="material" />
          </mesh>
        ))
      )}
    </group>
  );
}

function FilingCabinet() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("cabinetPaint")} position={[0, 0.72, 0]} scale={[0.78, 1.44, 0.58]} radius={0.035} />
      {[0.28, 0.72, 1.16].map((y) => (
        <group key={y}>
          <FurnitureBox material={furnitureMaterial("cabinetDrawer")} position={[0, y, -0.31]} scale={[0.66, 0.05, 0.03]} radius={0.012} />
          <FurnitureBox material={furnitureMaterial("cabinetHandle")} position={[0, y + 0.08, -0.33]} scale={[0.2, 0.035, 0.035]} radius={0.012} />
        </group>
      ))}
    </group>
  );
}

function StackedCardboardBoxes() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("cardboardA")} position={[-0.28, 0.25, 0.08]} scale={[0.72, 0.5, 0.58]} radius={0.025} />
      <FurnitureBox material={furnitureMaterial("cardboardB")} position={[0.28, 0.27, -0.18]} scale={[0.62, 0.54, 0.66]} radius={0.025} />
      <FurnitureBox material={furnitureMaterial("cardboardA")} position={[0.04, 0.75, -0.04]} scale={[0.68, 0.45, 0.54]} radius={0.022} />
      <FurnitureBox material={furnitureMaterial("cardboardB")} position={[0.04, 0.98, -0.04]} scale={[0.04, 0.02, 0.55]} rounded={false} />
    </group>
  );
}

function ServerRack() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("serverBody")} position={[0, 0.92, 0]} scale={[0.82, 1.84, 0.58]} radius={0.03} />
      {[-0.42, -0.18, 0.06, 0.3].map((y, i) => (
        <FurnitureBox key={y} material={i % 2 === 0 ? furnitureMaterial("serverPanel") : furnitureMaterial("monitorPlastic")} position={[0, 0.92 + y, -0.31]} scale={[0.68, 0.08, 0.04]} radius={0.012} />
      ))}
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 1.35, -0.34]}>
          <boxGeometry args={[0.05, 0.05, 0.03]} />
          <primitive object={furnitureMaterial("emissiveGreen")} attach="material" />
        </mesh>
      ))}
      <GlowPanel color="#46e6a1" opacity={0.08} position={[0, 1.35, -0.36]} size={[0.62, 0.14]} />
    </group>
  );
}

function FireExtinguisher() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group position={[0, 0.92, -0.08]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.72, 16]} />
        <primitive object={furnitureMaterial("extinguisherPaint")} attach="material" />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 12]} />
        <primitive object={furnitureMaterial("chairBase")} attach="material" />
      </mesh>
      <FurnitureBox material={furnitureMaterial("paperLabel")} position={[0, 0.1, -0.13]} scale={[0.2, 0.16, 0.02]} rounded={false} />
    </group>
  );
}

function ExitSign() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group position={[0, 2.35, -0.08]}>
      <FurnitureBox material={furnitureMaterial("exitShell")} position={[0, 0, 0]} scale={[1.1, 0.38, 0.08]} radius={0.02} />
      <GlowPanel color="#49ff87" opacity={0.12} position={[0, 0, -0.105]} size={[1.28, 0.5]} />
      {[-0.32, -0.08, 0.16, 0.38].map((x) => (
        <FurnitureBox key={x} material={furnitureMaterial("exitFace")} position={[x, 0, -0.06]} scale={[0.08, 0.22, 0.02]} rounded={false} />
      ))}
    </group>
  );
}

function FloorVent() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group position={[0, 0.012, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.1, 0.72]} />
        <primitive object={furnitureMaterial("ventPlate")} attach="material" />
      </mesh>
      {[-0.36, -0.18, 0, 0.18, 0.36].map((x) => (
        <FurnitureBox key={x} material={furnitureMaterial("ventSlat")} position={[x, 0.035, 0]} scale={[0.035, 0.035, 0.68]} radius={0.01} />
      ))}
    </group>
  );
}

function ExposedPipes() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group position={[0, WALL_HEIGHT - 0.32, 0]}>
      {[-0.18, 0.18].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 1.7, 12]} />
          <primitive object={furnitureMaterial("pipeMetal")} attach="material" />
        </mesh>
      ))}
      <FurnitureBox material={furnitureMaterial("pipeBracket")} position={[-0.45, -0.08, 0]} scale={[0.08, 0.16, 0.62]} radius={0.012} />
      <FurnitureBox material={furnitureMaterial("pipeBracket")} position={[0.45, -0.08, 0]} scale={[0.08, 0.16, 0.62]} radius={0.012} />
    </group>
  );
}

function VendingMachine() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("vendingBody")} position={[0, 0.95, 0]} scale={[0.88, 1.9, 0.5]} radius={0.035} />
      <FurnitureBox material={furnitureMaterial("vendingGlass")} position={[-0.12, 1.1, -0.28]} scale={[0.44, 0.88, 0.04]} radius={0.015} />
      <GlowPanel color="#c94b5f" opacity={0.07} position={[-0.12, 1.1, -0.335]} size={[0.62, 1.08]} />
      <FurnitureBox material={furnitureMaterial("vendingPanel")} position={[0.27, 1.18, -0.31]} scale={[0.14, 0.5, 0.04]} radius={0.012} />
      <FurnitureBox material={furnitureMaterial("darkRubber")} position={[0, 0.22, -0.3]} scale={[0.58, 0.13, 0.06]} radius={0.012} />
    </group>
  );
}

function WetCarpetPatch() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[0.64, 24]} />
      <primitive object={furnitureMaterial("wetCarpet")} attach="material" />
    </mesh>
  );
}

function BrokenMonitor() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      <FurnitureBox material={furnitureMaterial("monitorPlastic")} position={[0, 0.42, 0]} scale={[0.18, 0.5, 0.16]} radius={0.02} />
      <FurnitureBox material={furnitureMaterial("monitorPlastic")} position={[0, 0.68, 0]} scale={[0.76, 0.08, 0.42]} radius={0.025} />
      <RoundedBox args={[0.82, 0.52, 0.08]} radius={0.025} smoothness={3} bevelSegments={2} position={[0, 0.96, -0.1]} rotation={[0.16, 0.2, -0.08]} material={furnitureMaterial("monitorGlass")} castShadow />
      <GlowPanel color="#7df0ff" opacity={0.055} position={[0, 0.96, -0.15]} rotation={[0.16, 0.2, -0.08]} size={[0.96, 0.64]} />
    </group>
  );
}

function RollingCart() {
  const furnitureMaterial = useFurnitureMaterial();
  return (
    <group>
      {[0.38, 0.82].map((y) => (
        <FurnitureBox key={y} material={furnitureMaterial("cartMetal")} position={[0, y, 0]} scale={[1.0, 0.08, 0.58]} radius={0.025} />
      ))}
      {[-0.42, 0.42].map((x) =>
        [-0.22, 0.22].map((z) => (
          <FurnitureBox key={`${x}:${z}`} material={furnitureMaterial("cartMetal")} position={[x, 0.56, z]} scale={[0.06, 0.52, 0.06]} radius={0.012} />
        ))
      )}
      {[-0.36, 0.36].map((x) =>
        [-0.2, 0.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.08, z]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
            <primitive object={furnitureMaterial("darkRubber")} attach="material" />
          </mesh>
        ))
      )}
    </group>
  );
}

export function BackroomFurniture({ kind, position, rotationY = 0, areaLight = false }: BackroomFurnitureProps) {
  const { accent } = backroomFurnitureByKind(kind);

  let body: JSX.Element;
  switch (kind) {
    case "fluorescent_ceiling_light":
      body = <FluorescentCeilingLight accent={accent} areaLight={areaLight} />;
      break;
    case "office_desk":
      body = <OfficeDesk />;
      break;
    case "office_chair":
      body = <OfficeChair />;
      break;
    case "filing_cabinet":
      body = <FilingCabinet />;
      break;
    case "stacked_cardboard_boxes":
      body = <StackedCardboardBoxes />;
      break;
    case "server_rack":
      body = <ServerRack />;
      break;
    case "fire_extinguisher":
      body = <FireExtinguisher />;
      break;
    case "exit_sign":
      body = <ExitSign />;
      break;
    case "floor_vent":
      body = <FloorVent />;
      break;
    case "exposed_pipes":
      body = <ExposedPipes />;
      break;
    case "vending_machine":
      body = <VendingMachine />;
      break;
    case "wet_carpet_patch":
      body = <WetCarpetPatch />;
      break;
    case "broken_monitor":
      body = <BrokenMonitor />;
      break;
    case "rolling_cart":
      body = <RollingCart />;
      break;
    default:
      return assertNever(kind);
  }

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {body}
    </group>
  );
}

export function BackroomFurnitureSet({ items }: { items: readonly BackroomFurniturePlacement[] }) {
  const cache = useMemo(() => new FurnitureMaterialCache<FurnitureMaterialKey>(createFurnitureMaterial), []);
  const lit = useMemo(() => assignAreaLights(items), [items]);
  useEffect(() => () => cache.dispose(), [cache]);

  return (
    <FurnitureMaterialsContext.Provider value={cache}>
      {items.map((item) => (
        <BackroomFurniture key={item.id} kind={item.kind} position={item.position} rotationY={item.rotationY} areaLight={lit.has(item.id)} />
      ))}
    </FurnitureMaterialsContext.Provider>
  );
}

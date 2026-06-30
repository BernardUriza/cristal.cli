import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { WALL_HEIGHT } from "./maze";
import { backroomFurnitureByKind, type BackroomFurnitureKind } from "./backroomFurniture";

export interface BackroomFurnitureProps {
  kind: BackroomFurnitureKind;
  position: [number, number, number];
  rotationY?: number;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled backroom furniture kind: ${value}`);
}

function ThinBox({
  color,
  position,
  scale,
}: {
  color: string;
  position: [number, number, number];
  scale: [number, number, number];
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={scale} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function FluorescentCeilingLight({ accent }: { accent: string }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!mat.current) return;
    const pulse = Math.sin(clock.elapsedTime * 17) > 0.86 ? 0.35 : 1;
    mat.current.emissiveIntensity = 1.2 + pulse * 0.7 + Math.sin(clock.elapsedTime * 2.1) * 0.12;
  });

  return (
    <group position={[0, WALL_HEIGHT - 0.06, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.08, 0.42]} />
        <meshStandardMaterial
          ref={mat}
          color="#e5fff0"
          emissive={accent}
          emissiveIntensity={1.5}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, -0.2, 0]} intensity={0.7} distance={5} decay={2} color={accent} />
    </group>
  );
}

function OfficeDesk() {
  return (
    <group>
      <ThinBox color="#4f453b" position={[0, 0.78, 0]} scale={[1.75, 0.16, 0.92]} />
      <ThinBox color="#3b332c" position={[-0.68, 0.38, -0.3]} scale={[0.16, 0.76, 0.16]} />
      <ThinBox color="#3b332c" position={[0.68, 0.38, -0.3]} scale={[0.16, 0.76, 0.16]} />
      <ThinBox color="#3b332c" position={[-0.68, 0.38, 0.3]} scale={[0.16, 0.76, 0.16]} />
      <ThinBox color="#3b332c" position={[0.68, 0.38, 0.3]} scale={[0.16, 0.76, 0.16]} />
      <ThinBox color="#2a2926" position={[0.45, 1.0, -0.18]} scale={[0.42, 0.24, 0.08]} />
    </group>
  );
}

function OfficeChair() {
  return (
    <group>
      <ThinBox color="#262b2b" position={[0, 0.52, 0]} scale={[0.78, 0.14, 0.72]} />
      <ThinBox color="#202525" position={[0, 1.02, 0.3]} scale={[0.78, 0.78, 0.12]} />
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.44, 10]} />
        <meshStandardMaterial color="#202525" roughness={0.55} />
      </mesh>
      {[-0.32, 0.32].map((x) =>
        [-0.3, 0.3].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.08, z]} castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.12, 8]} />
            <meshStandardMaterial color="#171b1b" roughness={0.5} />
          </mesh>
        ))
      )}
    </group>
  );
}

function FilingCabinet() {
  return (
    <group>
      <ThinBox color="#737d75" position={[0, 0.72, 0]} scale={[0.78, 1.44, 0.58]} />
      {[0.28, 0.72, 1.16].map((y) => (
        <group key={y}>
          <ThinBox color="#626b64" position={[0, y, -0.31]} scale={[0.66, 0.05, 0.03]} />
          <ThinBox color="#c2c8be" position={[0, y + 0.08, -0.33]} scale={[0.2, 0.035, 0.035]} />
        </group>
      ))}
    </group>
  );
}

function StackedCardboardBoxes() {
  return (
    <group>
      <ThinBox color="#8f6a45" position={[-0.28, 0.25, 0.08]} scale={[0.72, 0.5, 0.58]} />
      <ThinBox color="#a47c52" position={[0.28, 0.27, -0.18]} scale={[0.62, 0.54, 0.66]} />
      <ThinBox color="#76583b" position={[0.04, 0.75, -0.04]} scale={[0.68, 0.45, 0.54]} />
      <ThinBox color="#c29a68" position={[0.04, 0.98, -0.04]} scale={[0.04, 0.02, 0.55]} />
    </group>
  );
}

function ServerRack({ accent }: { accent: string }) {
  return (
    <group>
      <ThinBox color="#111615" position={[0, 0.92, 0]} scale={[0.82, 1.84, 0.58]} />
      {[-0.42, -0.18, 0.06, 0.3].map((y, i) => (
        <ThinBox key={y} color={i % 2 === 0 ? "#27302d" : "#1d2422"} position={[0, 0.92 + y, -0.31]} scale={[0.68, 0.08, 0.04]} />
      ))}
      {[-0.22, 0, 0.22].map((x) => (
        <mesh key={x} position={[x, 1.35, -0.34]}>
          <boxGeometry args={[0.05, 0.05, 0.03]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function FireExtinguisher() {
  return (
    <group position={[0, 0.92, -0.08]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.72, 16]} />
        <meshStandardMaterial color="#b51f19" roughness={0.42} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 12]} />
        <meshStandardMaterial color="#30312c" roughness={0.35} metalness={0.4} />
      </mesh>
      <ThinBox color="#e7e4d7" position={[0, 0.1, -0.13]} scale={[0.2, 0.16, 0.02]} />
    </group>
  );
}

function ExitSign({ accent }: { accent: string }) {
  return (
    <group position={[0, 2.35, -0.08]}>
      <mesh>
        <boxGeometry args={[1.1, 0.38, 0.08]} />
        <meshStandardMaterial color="#062813" emissive={accent} emissiveIntensity={1.9} toneMapped={false} />
      </mesh>
      {[-0.32, -0.08, 0.16, 0.38].map((x, i) => (
        <ThinBox key={x} color={i === 3 ? "#b8ffd2" : "#dcffe8"} position={[x, 0, -0.06]} scale={[0.08, 0.22, 0.02]} />
      ))}
    </group>
  );
}

function FloorVent() {
  return (
    <group position={[0, 0.012, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.1, 0.72]} />
        <meshStandardMaterial color="#222927" roughness={0.65} metalness={0.2} />
      </mesh>
      {[-0.36, -0.18, 0, 0.18, 0.36].map((x) => (
        <ThinBox key={x} color="#68716b" position={[x, 0.035, 0]} scale={[0.035, 0.035, 0.68]} />
      ))}
    </group>
  );
}

function ExposedPipes() {
  return (
    <group position={[0, WALL_HEIGHT - 0.32, 0]}>
      {[-0.18, 0.18].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 1.7, 12]} />
          <meshStandardMaterial color="#6d7771" roughness={0.5} metalness={0.35} />
        </mesh>
      ))}
      <ThinBox color="#3a423e" position={[-0.45, -0.08, 0]} scale={[0.08, 0.16, 0.62]} />
      <ThinBox color="#3a423e" position={[0.45, -0.08, 0]} scale={[0.08, 0.16, 0.62]} />
    </group>
  );
}

function VendingMachine({ accent }: { accent: string }) {
  return (
    <group>
      <ThinBox color="#3a2028" position={[0, 0.95, 0]} scale={[0.88, 1.9, 0.5]} />
      <mesh position={[-0.12, 1.1, -0.28]}>
        <boxGeometry args={[0.44, 0.88, 0.04]} />
        <meshStandardMaterial color="#161718" emissive={accent} emissiveIntensity={0.55} roughness={0.3} toneMapped={false} />
      </mesh>
      <ThinBox color="#101312" position={[0.27, 1.18, -0.31]} scale={[0.14, 0.5, 0.04]} />
      <ThinBox color="#0b0c0c" position={[0, 0.22, -0.3]} scale={[0.58, 0.13, 0.06]} />
    </group>
  );
}

function WetCarpetPatch() {
  return (
    <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[0.64, 24]} />
      <meshStandardMaterial color="#102d26" roughness={1} transparent opacity={0.72} />
    </mesh>
  );
}

function BrokenMonitor({ accent }: { accent: string }) {
  return (
    <group>
      <ThinBox color="#111414" position={[0, 0.42, 0]} scale={[0.18, 0.5, 0.16]} />
      <ThinBox color="#181c1b" position={[0, 0.68, 0]} scale={[0.76, 0.08, 0.42]} />
      <mesh position={[0, 0.96, -0.1]} rotation={[0.16, 0.2, -0.08]} castShadow>
        <boxGeometry args={[0.82, 0.52, 0.08]} />
        <meshStandardMaterial color="#070b0d" emissive={accent} emissiveIntensity={0.22} roughness={0.38} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RollingCart() {
  return (
    <group>
      {[0.38, 0.82].map((y) => (
        <ThinBox key={y} color="#68716b" position={[0, y, 0]} scale={[1.0, 0.08, 0.58]} />
      ))}
      {[-0.42, 0.42].map((x) =>
        [-0.22, 0.22].map((z) => (
          <ThinBox key={`${x}:${z}`} color="#505852" position={[x, 0.56, z]} scale={[0.06, 0.52, 0.06]} />
        ))
      )}
      {[-0.36, 0.36].map((x) =>
        [-0.2, 0.2].map((z) => (
          <mesh key={`${x}:${z}`} position={[x, 0.08, z]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
            <meshStandardMaterial color="#161918" roughness={0.6} />
          </mesh>
        ))
      )}
    </group>
  );
}

export function BackroomFurniture({ kind, position, rotationY = 0 }: BackroomFurnitureProps) {
  const { accent } = backroomFurnitureByKind(kind);

  let body: JSX.Element;
  switch (kind) {
    case "fluorescent_ceiling_light":
      body = <FluorescentCeilingLight accent={accent} />;
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
      body = <ServerRack accent={accent} />;
      break;
    case "fire_extinguisher":
      body = <FireExtinguisher />;
      break;
    case "exit_sign":
      body = <ExitSign accent={accent} />;
      break;
    case "floor_vent":
      body = <FloorVent />;
      break;
    case "exposed_pipes":
      body = <ExposedPipes />;
      break;
    case "vending_machine":
      body = <VendingMachine accent={accent} />;
      break;
    case "wet_carpet_patch":
      body = <WetCarpetPatch />;
      break;
    case "broken_monitor":
      body = <BrokenMonitor accent={accent} />;
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

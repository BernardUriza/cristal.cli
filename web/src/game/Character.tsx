import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const CHARACTER_URL = "/models/character.glb";
const CLIP_URLS = {
  idle: "/models/idle.glb",
  walk: "/models/walking.glb",
  run: "/models/running.glb",
} as const;

const TARGET_HEIGHT = 1.8;
const FADE = 0.25;

export type Locomotion = keyof typeof CLIP_URLS;

interface CharacterProps {
  loco: React.MutableRefObject<Locomotion>;
}

function prepare(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    }
  });
}

function GLBCharacter({ loco }: CharacterProps) {
  const gltf = useGLTF(CHARACTER_URL);
  const idleGlb = useGLTF(CLIP_URLS.idle);
  const walkGlb = useGLTF(CLIP_URLS.walk);
  const runGlb = useGLTF(CLIP_URLS.run);

  const model = useMemo(() => {
    const c = skeletonClone(gltf.scene);
    prepare(c);
    return c;
  }, [gltf]);

  const { scale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    const s = height > 0.001 ? TARGET_HEIGHT / height : 1;
    return { scale: s, yOffset: -box.min.y * s };
  }, [model]);

  const clips = useMemo(() => {
    const named = (g: typeof idleGlb, name: Locomotion) => {
      const clip = g.animations[0].clone();
      clip.name = name;
      return clip;
    };
    return [named(idleGlb, "idle"), named(walkGlb, "walk"), named(runGlb, "run")];
  }, [idleGlb, walkGlb, runGlb]);

  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(clips, groupRef);
  const current = useRef<Locomotion>("idle");

  useEffect(() => {
    actions.idle?.reset().fadeIn(FADE).play();
  }, [actions]);

  useFrame(() => {
    const want = loco.current;
    if (want === current.current) return;
    const next = actions[want];
    if (!next) return;
    actions[current.current]?.fadeOut(FADE);
    next.reset().setEffectiveWeight(1).fadeIn(FADE).play();
    current.current = want;
  });

  return (
    <group ref={groupRef} scale={scale} position={[0, yOffset, 0]}>
      <primitive object={model} />
    </group>
  );
}

export function MixamoCharacter(props: CharacterProps) {
  return <GLBCharacter {...props} />;
}

export function CapsuleAvatar({ moving }: { moving: boolean }) {
  return (
    <group position={[0, 0.9, 0]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 1.1, 8, 16]} />
        <meshStandardMaterial
          color={moving ? "#33ddff" : "#33ff99"}
          emissive="#0a3322"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload(CHARACTER_URL);
useGLTF.preload(CLIP_URLS.idle);
useGLTF.preload(CLIP_URLS.walk);
useGLTF.preload(CLIP_URLS.run);

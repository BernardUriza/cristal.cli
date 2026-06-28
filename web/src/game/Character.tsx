import { useEffect, useMemo, useRef } from "react";
import { useFBX, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// Which character/animation files to load from /public/models.
//
// IMPORTANT — model format:
//   three.js's FBXLoader only supports FBX 7.x. The Mixamo files in /Mixamo are
//   the legacy 6100 format (FBX 2010) and will NOT load — re-export them from
//   mixamo.com as "FBX Binary (.fbx)" (now 7.4), or better, convert to .glb
//   (the recommended web format) and point these constants at the .glb files.
//
// Skinning note: there is no `material.skinning` flag in modern three.js (it was
// removed in r125). A SkinnedMesh + skeleton skins automatically, so plain
// MeshStandardMaterial just works — which is what GLTFLoader/FBXLoader produce.
const CHARACTER_FILE = "character.fbx";
const ANIM_FILE = "Rumba Dancing.fbx";

const CHARACTER_URL = `/models/${CHARACTER_FILE}`;
const ANIM_URL = `/models/${ANIM_FILE}`;

interface CharacterProps {
  /** drives animation playback speed; locomotion clips can replace this later */
  moving: boolean;
}

function prepare(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // skinned bounds can be misreported
    }
  });
}

function useClipPlayer(
  groupRef: React.RefObject<THREE.Object3D>,
  clips: THREE.AnimationClip[],
  moving: boolean
) {
  const { actions, names } = useAnimations(clips, groupRef);
  useEffect(() => {
    const action = actions[names[0]];
    if (action) action.reset().fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);
  useEffect(() => {
    const action = actions[names[0]];
    if (action) action.timeScale = moving ? 1.4 : 1.0;
  }, [moving, actions, names]);
}

function FBXCharacter({ moving }: CharacterProps) {
  const base = useFBX(CHARACTER_URL);
  const anim = useFBX(ANIM_URL);
  const model = useMemo(() => {
    const clone = base.clone(true);
    prepare(clone);
    return clone;
  }, [base]);
  const groupRef = useRef<THREE.Group>(null);
  useClipPlayer(groupRef, anim.animations, moving);
  return (
    <group ref={groupRef} scale={0.01}>
      <primitive object={model} />
    </group>
  );
}

function GLBCharacter({ moving }: CharacterProps) {
  const gltf = useGLTF(CHARACTER_URL);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    prepare(clone);
    return clone;
  }, [gltf]);
  const groupRef = useRef<THREE.Group>(null);
  useClipPlayer(groupRef, gltf.animations, moving);
  return (
    <group ref={groupRef}>
      <primitive object={model} />
    </group>
  );
}

/** Mixamo character as a SkinnedMesh (auto-skinned, no material.skinning flag). */
export function MixamoCharacter(props: CharacterProps) {
  return CHARACTER_FILE.endsWith(".glb") || CHARACTER_FILE.endsWith(".gltf") ? (
    <GLBCharacter {...props} />
  ) : (
    <FBXCharacter {...props} />
  );
}

/** Procedural fallback shown if the character model can't be loaded yet. */
export function CapsuleAvatar({ moving }: CharacterProps) {
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

import { useEffect, useMemo, useRef } from "react";
import { useFBX, useGLTF, useAnimations } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

// Which character/animation files to load from /public/models.
//
// character.glb is the committed, web-ready model: it was converted from the
// Mixamo "Rumba Dancing.fbx" (which ships mesh + skeleton + animation) with
// FBX2glTF — see scripts/convert-character.mjs. The legacy /Mixamo FBX files are
// version 6100 (FBX 2010), which three.js's FBXLoader cannot read, hence the
// conversion. The FBX path below remains as a fallback for 7.x FBX exports.
//
// Skinning note: there is no `material.skinning` flag in modern three.js (it was
// removed in r125). A SkinnedMesh + skeleton skins automatically, so plain
// MeshStandardMaterial just works — which is what GLTFLoader/FBXLoader produce.
const CHARACTER_FILE = "character.glb";
const ANIM_FILE = "Rumba Dancing.fbx";

// Mixamo-via-FBX2glTF arrives ~3.8 units tall; normalise to roughly 1.8m.
const TARGET_HEIGHT = 1.8;

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
    const clone = skeletonClone(base);
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
    const clone = skeletonClone(gltf.scene);
    prepare(clone);
    return clone;
  }, [gltf]);

  // Normalise size + drop feet to y=0 from the bind-pose bounding box.
  const { scale, yOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    const s = height > 0.001 ? TARGET_HEIGHT / height : 1;
    return { scale: s, yOffset: -box.min.y * s };
  }, [model]);

  const groupRef = useRef<THREE.Group>(null);
  useClipPlayer(groupRef, gltf.animations, moving);
  return (
    <group ref={groupRef} scale={scale} position={[0, yOffset, 0]}>
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

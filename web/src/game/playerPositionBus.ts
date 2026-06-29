// Lightweight pub/sub for the player's live world pose, kept OUT of the zustand
// store on purpose: the minimap needs ~12Hz position updates that must never
// trigger a React re-render of the 3D scene. The 3D Player publishes; the 2D
// minimap subscribes. Mutable module state, no DOM, no three.js.

export interface PlayerPose {
  x: number; // world X
  z: number; // world Z
  heading: number; // yaw, radians (world forward = sin(yaw), cos(yaw))
}

type Listener = (pose: PlayerPose) => void;

let current: PlayerPose = { x: 0, z: 0, heading: 0 };
const listeners = new Set<Listener>();

export function publishPlayerPose(pose: PlayerPose): void {
  current = pose;
  for (const listener of listeners) listener(pose);
}

export function getPlayerPose(): PlayerPose {
  return current;
}

export function subscribePlayerPose(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

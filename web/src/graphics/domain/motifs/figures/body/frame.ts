import type { Vec2 } from "../../../shapes.ts";
import type { Socket } from "./types.ts";

export type BodyFrame = { o: Vec2; rot: number; s: number; flip: boolean };

const RAD = Math.PI / 180;

export const ROOT_FRAME: BodyFrame = { o: [0, 0], rot: 0, s: 1, flip: false };

export function local(f: BodyFrame, p: Vec2): Vec2 {
  const x = f.flip ? -p[0] : p[0];
  const a = f.rot * RAD;
  const cos = Math.cos(a), sin = Math.sin(a);
  return [(x * cos - p[1] * sin) * f.s, (x * sin + p[1] * cos) * f.s];
}

export function toWorld(f: BodyFrame, p: Vec2): Vec2 {
  const d = local(f, p);
  return [f.o[0] + d[0], f.o[1] + d[1]];
}

const angleOf = (v: Vec2): number => Math.atan2(v[1], v[0]) / RAD;

function alignment(socket: Socket, joint: Socket): number {
  if (joint.name === "center") return 0;
  return angleOf(socket.dir) - angleOf([-joint.dir[0], -joint.dir[1]]);
}

/** The child joint lands on the parent socket (plus offset in parent units); with no explicit angle the limb points along the socket direction. */
export function attach(parent: BodyFrame, socket: Socket, joint: Socket, scale: number, offset: Vec2 = [0, 0], angle = 0): BodyFrame {
  const target = toWorld(parent, [socket.at[0] + offset[0], socket.at[1] + offset[1]]);
  const rel = alignment(socket, joint) + angle;
  const child: BodyFrame = { o: [0, 0], rot: parent.rot + (parent.flip ? -rel : rel), s: parent.s * scale, flip: parent.flip };
  const d = local(child, joint.at);
  return { ...child, o: [target[0] - d[0], target[1] - d[1]] };
}

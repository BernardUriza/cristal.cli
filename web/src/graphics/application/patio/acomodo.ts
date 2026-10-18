import type { Group } from "../../config/scene.ts";
import type { Rect } from "../../domain/architecture/layout.ts";
import type { Vec3 } from "../../domain/math/vec3.ts";

/** The figures of a group laid out on a footing in the group's arrangement, `rise` metres up per step of a stair. */
export function arrange(g: Group, r: Rect, y: number, rise: number): Vec3[] {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const w = (r.x1 - r.x0) * 0.8;
  const d = (r.z1 - r.z0) * 0.8;
  const n = g.count;
  return Array.from({ length: n }, (_, i): Vec3 => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = (i / n) * Math.PI * 2;
    switch (g.arrangement) {
      case "circulo":
      case "corona":
        return [cx + Math.cos(a) * w * 0.4, y, cz + Math.sin(a) * d * 0.4];
      case "espiral": {
        const rr = 0.08 + 0.42 * t;
        return [cx + Math.cos(a * 2.2) * w * rr, y, cz + Math.sin(a * 2.2) * d * rr];
      }
      case "reticula": {
        const cols = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / cols);
        return [cx - w / 2 + (w * ((i % cols) + 0.5)) / cols, y, cz - d / 2 + (d * (Math.floor(i / cols) + 0.5)) / rows];
      }
      case "escalera":
        return [cx - w / 2 + w * t, y + i * rise, cz + d / 2 - d * t];
      case "procesion":
        return [cx - w / 2 + w * t, y, cz + Math.sin(t * Math.PI * 2) * d * 0.25];
      default:
        return [cx - w / 2 + w * t, y, cz];
    }
  });
}

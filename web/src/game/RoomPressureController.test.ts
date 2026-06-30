import { describe, expect, it } from "vitest";
import { resolveRoomPressureAtmosphere } from "./RoomPressureController";

describe("resolveRoomPressureAtmosphere", () => {
  it("keeps low pressure almost calm", () => {
    const atmo = resolveRoomPressureAtmosphere({ pressure: 0.15 });

    expect(atmo.pressure).toBeCloseTo(0.15);
    expect(atmo.fogDensity).toBeLessThan(0.15);
    expect(atmo.lightInstability).toBeLessThan(0.08);
    expect(atmo.wallPulse).toBeLessThan(0.08);
    expect(atmo.vignetteAmount).toBeLessThan(0.08);
  });

  it("interpolates continuously through mid pressure", () => {
    const a = resolveRoomPressureAtmosphere({ pressure: 0.41 });
    const b = resolveRoomPressureAtmosphere({ pressure: 0.42 });
    const c = resolveRoomPressureAtmosphere({ pressure: 0.43 });

    expect(a.wallPulse).toBeLessThan(b.wallPulse);
    expect(b.wallPulse).toBeLessThan(c.wallPulse);
    expect(Math.abs(c.wallPulse - a.wallPulse)).toBeLessThan(0.08);
  });

  it("makes high pressure unstable without binary jumps", () => {
    const severe = resolveRoomPressureAtmosphere({ pressure: 0.73 });
    const hostile = resolveRoomPressureAtmosphere({ pressure: 0.95 });

    expect(severe.wallPulse).toBeGreaterThan(0.45);
    expect(severe.lightInstability).toBeGreaterThan(0.35);
    expect(hostile.fogDensity).toBeGreaterThan(severe.fogDensity);
    expect(hostile.vignetteAmount).toBeGreaterThan(severe.vignetteAmount);
    expect(hostile.portalGlow).toBeLessThan(severe.portalGlow);
  });

  it("clamps invalid pressure", () => {
    expect(resolveRoomPressureAtmosphere({ pressure: -3 }).pressure).toBe(0);
    expect(resolveRoomPressureAtmosphere({ pressure: Number.NaN }).pressure).toBe(0);
    expect(resolveRoomPressureAtmosphere({ pressure: 3 }).pressure).toBe(1);
  });
});

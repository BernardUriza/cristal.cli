import { describe, expect, it } from "vitest";
import { AUTOWALK_IDLE_MS, isIdle, rewardLevel, viajeAtmosphere, viajeFromSearch } from "./viaje";
import { FLASH_OMEGA, MAX_FLASH_HZ } from "./flashSafety";

describe("viaje", () => {
  it("opens the atmosphere as the player writes more, and caps it", () => {
    expect(rewardLevel(0)).toBe(0);
    expect(rewardLevel(4)).toBe(0.5);
    expect(rewardLevel(40)).toBe(1);
    expect(viajeAtmosphere(0).fogFar).toBeLessThan(viajeAtmosphere(1).fogFar);
    expect(viajeAtmosphere(1).ambient).toBeGreaterThan(viajeAtmosphere(0).ambient);
  });

  it("is idle only after the autowalk threshold", () => {
    expect(isIdle(1000, 1000 + AUTOWALK_IDLE_MS - 1)).toBe(false);
    expect(isIdle(1000, 1000 + AUTOWALK_IDLE_MS)).toBe(true);
  });

  it("reads the viaje flag from the url, explicit off included", () => {
    expect(viajeFromSearch("?viaje=1")).toBe(true);
    expect(viajeFromSearch("?viaje=0")).toBe(false);
    expect(viajeFromSearch("?seed=3")).toBeNull();
  });

  it("keeps every light flicker under three flashes per second (WCAG 2.3.1)", () => {
    expect(MAX_FLASH_HZ).toBeLessThan(3);
    expect(FLASH_OMEGA / (2 * Math.PI)).toBeLessThan(3);
  });
});

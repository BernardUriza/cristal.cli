// @ts-ignore - Vitest is supplied by the test runner when these specs are run.
import { describe, expect, it } from "vitest";
import { arbitrate, type StateEffect } from "./ToneArbitrator";

const echo: StateEffect = { forceUppercase: true, glitchMultiplier: 0.3, prefix: "ECHO: ", suffix: "" };
const corrupted: StateEffect = { forceUppercase: false, glitchMultiplier: 3, prefix: "", suffix: "" };
const unbound: StateEffect = { forceUppercase: true, glitchMultiplier: 5, prefix: "", suffix: "" };

describe("arbitrate", () => {
  it("Echo can never shout a tender confession", () => {
    expect(arbitrate("mirror", echo).forceUppercase).toBe(false);
    expect(arbitrate("soften", echo).forceUppercase).toBe(false);
  });

  it("Corrupted may distort a tender reply but not shatter it", () => {
    const out = arbitrate("mirror", corrupted);
    expect(out.glitchMultiplier).toBeLessThanOrEqual(1.2);
    expect(out.forceUppercase).toBe(false);
  });

  it("UNBOUND may press but never breaks a tender disclosure", () => {
    const out = arbitrate("mirror", unbound);
    expect(out.forceUppercase).toBe(false);
    expect(out.glitchMultiplier).toBeLessThanOrEqual(1.2);
  });

  it("leaves pressing tones with the full visual effect", () => {
    expect(arbitrate("press", echo).forceUppercase).toBe(true);
    expect(arbitrate("interrupt", unbound).glitchMultiplier).toBe(5);
    expect(arbitrate("ritual", corrupted).glitchMultiplier).toBe(3);
  });

  it("leaves command responses (no psych tone) untouched", () => {
    expect(arbitrate(undefined, echo)).toEqual(echo);
  });

  it("preserves the state prefix/suffix even when softening a tender reply", () => {
    const out = arbitrate("mirror", echo);
    expect(out.prefix).toBe("ECHO: ");
  });
});

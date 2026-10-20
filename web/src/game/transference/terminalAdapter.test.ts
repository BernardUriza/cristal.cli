import { describe, expect, it } from "vitest";
import { RuntimeTransference } from "../RuntimeTransference";
import type { RuntimeTransferenceSnapshot } from "./snapshot";
import { TERMINAL_ADAPTER_COPY, adaptTerminalResponse } from "./terminalAdapter";

const base = new RuntimeTransference(null).snapshot();
const snapshot = (patch: Partial<RuntimeTransferenceSnapshot>): RuntimeTransferenceSnapshot => ({ ...base, ...patch });
const clock = { turn: 1, lastEchoTurn: -100 };
const reply = { lines: ["uno", "", "dos"] };

describe("adaptTerminalResponse", () => {
  it("greets a drifted identity and asks first when the world still asks", () => {
    const s = snapshot({
      identity: { ...base.identity, identity: "Witness" },
      worldConfidence: { ...base.worldConfidence, terminalMode: "asks" },
    });
    const { response } = adaptTerminalResponse(reply, "welcome", s, clock);
    expect(response.lines[0]).toBe("Witness.");
    expect(response.lines[response.lines.length - 1]).toBe(TERMINAL_ADAPTER_COPY.asksFirst);
  });

  it("names the turn away when resistance outweighs trust", () => {
    const s = snapshot({ relationship: { ...base.relationship, resistance: 0.9, trust: 0.1 } });
    expect(adaptTerminalResponse(reply, "input", s, clock).response.lines[0]).toBe(`${TERMINAL_ADAPTER_COPY.resistancePrefix} uno`);
  });

  it("echoes a memory only after the cooldown and reports it", () => {
    const s = snapshot({ memoryEchoes: [{ ...(base.memoryEchoes[0] ?? {}), text: "eco", intensity: 1 } as RuntimeTransferenceSnapshot["memoryEchoes"][number]] });
    expect(adaptTerminalResponse(reply, "input", s, clock).echoed).toBe(true);
    expect(adaptTerminalResponse(reply, "input", s, { turn: 3, lastEchoTurn: 1 }).echoed).toBe(false);
    expect(adaptTerminalResponse(reply, "welcome", s, clock).echoed).toBe(false);
  });
});

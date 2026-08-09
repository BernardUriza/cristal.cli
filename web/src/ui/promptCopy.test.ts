import { describe, expect, it } from "vitest";
import { promptForNode, roomErrorLine, roomLoadingLine } from "./promptCopy";
import type { WorldNode } from "../game/worldNodes";

const glyph: WorldNode = {
  kind: "glyph",
  id: "glyph_moon",
  label: "LUNA",
  cell: [2, 5],
  archetype: "moon",
  accent: "#7db8ff",
};

const consoleNode: WorldNode = {
  kind: "console",
  id: "console_alpha",
  label: "ALPHA",
  cell: [3, 2],
  accent: "#33ff99",
};

describe("promptForNode", () => {
  it("names the glyph action and carries its accent", () => {
    const copy = promptForNode(glyph, "invoke_glyph");
    expect(copy.action).toBe("invocar LUNA");
    expect(copy.accent).toBe("#7db8ff");
    expect(copy.hint).toContain("confesión");
  });

  it("warns when invoking a glyph before any console", () => {
    expect(promptForNode(glyph, "open_console").hint).toContain("sin consola");
  });

  it("points the player back to the confession mid-rite", () => {
    expect(promptForNode(glyph, "confess").hint).toContain("confiesa primero");
  });

  it("offers variation after the rite is complete", () => {
    expect(promptForNode(glyph, "complete").hint).toContain("variación");
  });

  it("frames the console as the rite's start", () => {
    const copy = promptForNode(consoleNode, "open_console");
    expect(copy.action).toBe("conectar ALPHA");
    expect(copy.hint).toContain("empieza aquí");
  });

  it("drops the console hint once the confession is archived", () => {
    expect(promptForNode(consoleNode, "cross_room").hint).toBeNull();
  });
});

describe("roomLoadingLine", () => {
  it("names the archetype being rewritten", () => {
    expect(roomLoadingLine("moon")).toContain("MOON");
  });

  it("stays generic without an archetype", () => {
    expect(roomLoadingLine(null)).toBe("/dev/prophet-0 reescribiendo el cuarto");
  });
});

describe("roomErrorLine", () => {
  it("strips the Error: prefix", () => {
    expect(roomErrorLine("Error: fetch failed")).toBe("la liturgia falló: fetch failed");
  });

  it("falls back when the message is empty", () => {
    expect(roomErrorLine("")).toBe("la liturgia falló: el cuarto no respondió");
  });
});

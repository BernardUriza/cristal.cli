import { describe, expect, it } from "vitest";
import { INITIAL_VERTICAL_SLICE, objectiveForSlice, type VerticalSliceState } from "../../game/VerticalSlice";
import { ResponseType, type TerminalResponse } from "../../terminal/types";
import { placeLine, plainLine, toLines } from "./lines";
import { scrambleText } from "./scramble";
import { localVoiceLine, sliceTurnLines } from "./turn";

const response = (lines: string[], applyGlitch = false): TerminalResponse =>
  ({ lines, responseType: ResponseType.Memory, applyGlitch }) as unknown as TerminalResponse;

describe("console lines", () => {
  it("maps a response type to its css class and carries the glitch flag", () => {
    expect(toLines(response(["a", "b"], true))).toEqual([
      { text: "a", cls: "mem", scramble: true },
      { text: "b", cls: "mem", scramble: true },
    ]);
  });

  it("appends a streamed line once and then rewrites it in place", () => {
    const first = placeLine([plainLine("x", "out")], -1, plainLine("ho", "voice"));
    expect(first.index).toBe(1);
    const second = placeLine([...first.lines, plainLine("y", "out")], first.index, plainLine("hola", "voice"));
    expect(second.lines.map((l) => l.text)).toEqual(["x", "hola", "y"]);
  });

  it("reveals left to right, keeps spaces and settles on the real text", () => {
    expect(scrambleText("ab cd", 2, () => "#")).toBe("ab ##");
    expect(scrambleText("ab cd", 0, () => "#")).toBe("## ##");
    expect(scrambleText("ab cd", 5, () => "#")).toBe("ab cd");
  });
});

describe("console turn", () => {
  it("echoes the input and announces the archived phrase and the new objective", () => {
    const after: VerticalSliceState = { ...INITIAL_VERTICAL_SLICE, step: "invoke_glyph", confessed: true, confessionFragment: "me pesa" };
    const { lines, objective } = sliceTurnLines("me pesa", { ...INITIAL_VERTICAL_SLICE, step: "confess" }, after);
    expect(objective).toBe(objectiveForSlice(after));
    expect(lines.map((l) => [l.cls, l.scramble])).toEqual([["echo", false], ["mem", true], ["system", false]]);
    expect(lines[1].text).toBe("// frase archivada: «me pesa» — los glifos la usarán.");
    expect(lines[2].text).toBe(`RITO GUIADO: ${objective}`);
  });

  it("only echoes when the rite does not move", () => {
    const { lines, objective } = sliceTurnLines("ls", INITIAL_VERTICAL_SLICE, INITIAL_VERTICAL_SLICE);
    expect(objective).toBeNull();
    expect(lines).toEqual([{ text: "> ls", cls: "echo", scramble: false }]);
  });

  it("joins the local reply into one voice line", () => {
    expect(localVoiceLine(response([" uno ", "", "dos"]))).toBe("uno dos");
  });
});

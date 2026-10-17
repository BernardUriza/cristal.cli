import { describe, expect, it } from "vitest";
import { createBagState, drawReply, DEFAULT_REPLY_CONTEXT, type ReplyContext } from "./ReplyBag";
import type { ReplyLine } from "./replyPool";

const POOL: ReplyLine[] = [
  { text: "a" },
  { text: "b" },
  { text: "c" },
  { text: "d" },
  { text: "repite {palabra}", when: { repeating: true } },
  { text: "frase «{frase}»" },
];

function run(turns: number, ctx: Partial<ReplyContext> = {}, pool = POOL): string[] {
  let state = createBagState();
  const out: string[] = [];
  for (let turn = 0; turn < turns; turn++) {
    const drawn = drawReply("k", pool, { ...DEFAULT_REPLY_CONTEXT, ...ctx, turn }, state);
    state = drawn.state;
    out.push(drawn.text);
  }
  return out;
}

describe("drawReply", () => {
  it("never repeats a line on consecutive turns and exhausts the pool before repeating", () => {
    const out = run(12);
    for (let i = 1; i < out.length; i++) expect(out[i], `turn ${i}`).not.toBe(out[i - 1]);
    expect(new Set(out.slice(0, 4)).size).toBe(4);
    expect(new Set(out.slice(4, 8)).size).toBe(4);
  });

  it("is deterministic for the same session and differs between sessions", () => {
    expect(run(6, { sessionId: "s1" })).toEqual(run(6, { sessionId: "s1" }));
    expect(run(6, { sessionId: "s1" })).not.toEqual(run(6, { sessionId: "s2" }));
  });

  it("the most specific eligible line wins first, then the bag falls through to the generic level", () => {
    const out = run(3, { repeating: true, word: "mapa" });
    expect(out[0]).toBe("repite mapa");
    expect(out[1]).not.toBe("repite mapa");
    expect(out[2]).not.toBe("repite mapa");
    expect(run(1, { confessionFragment: "tengo miedo" })).toEqual(["frase «tengo miedo»"]);
  });

  it("drops lines whose placeholders the context cannot fill", () => {
    const out = run(8);
    expect(out.some((text) => text.includes("{") || text.includes("«»"))).toBe(false);
  });

  it("falls back to unconditional lines when nothing is eligible", () => {
    const only: ReplyLine[] = [{ text: "x", when: { pressureMin: 0.9 } }, { text: "y" }];
    expect(run(2, {}, only)).toEqual(["y", "y"]);
  });
});

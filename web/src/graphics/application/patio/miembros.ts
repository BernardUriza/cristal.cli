import { MORPH_POLICY } from "../../config/morph.ts";
import { MEMBER_VARIATION, type MemberVariation } from "../../config/variation.ts";
import { compileProgram } from "../../domain/motifs/figures/body/program/compile.ts";
import { memberProgram } from "../../domain/motifs/figures/body/program/member.ts";
import type { CompiledCreature, CreatureProgram } from "../../domain/motifs/figures/body/program/types.ts";
import { BodyGraphError } from "../../domain/motifs/figures/body/types.ts";
import { fnv1a } from "../../../shared/rng.ts";
import type { GroupCreature } from "./programa.ts";

export type Member = { compiled: CompiledCreature; heightScale: number; note: string };

export const memberSeed = (workSeed: number, group: number, index: number): number => fnv1a(`${workSeed}:grupo${group}:miembro${index}`);

/** Compiles each member of each group once; a program that does not compile is null, never thrown. A group of one keeps its body: there is nobody to differ from. */
export function memberMaker(bodies: readonly GroupCreature[], workSeed: number, alone: readonly boolean[] = [], v: MemberVariation = MEMBER_VARIATION): (group: number, index: number) => Member {
  const cache = new Map<string, CompiledCreature | null>();
  const compiled = (p: CreatureProgram): CompiledCreature | null => {
    const key = JSON.stringify(p);
    if (!cache.has(key)) {
      try {
        cache.set(key, compileProgram(p, MORPH_POLICY));
      } catch (err) {
        if (!(err instanceof BodyGraphError)) throw err;
        cache.set(key, null);
      }
    }
    return cache.get(key)!;
  };
  return (group, index) => {
    const body = bodies[group];
    if (alone[group]) return { compiled: body.compiled, heightScale: 1, note: "figura sola: sin variación" };
    const m = memberProgram(body.compiled.program, memberSeed(workSeed, group, index), v, (p) => compiled(p) !== null);
    return { compiled: compiled(m.program) ?? body.compiled, heightScale: m.heightScale, note: m.notes.join(", ") };
  };
}

import { describe, expect, it } from "vitest";
import { generateMaze } from "../maze";
import { placeBackroomFurniture } from "../BackroomFurniturePlacer";
import { MAX_FLUORESCENT_AREA_LIGHTS, assignAreaLights, stableFurnitureHash, type AreaLightCandidate } from "./areaLightBudget";

function lights(offset: number, count: number): AreaLightCandidate[] {
  const items: AreaLightCandidate[] = [];
  for (let x = offset; items.length < count; x += 1) {
    if (stableFurnitureHash(x, 0) % 3 === 0) items.push({ id: `l${x}`, kind: "fluorescent_ceiling_light", position: [x, 0, 0] });
  }
  return items;
}

describe("assignAreaLights", () => {
  it("gives a second labyrinth its own budget instead of the first one's leftovers", () => {
    const first = assignAreaLights(lights(0, 12));
    const second = assignAreaLights(lights(1000, 12));
    expect(first.size).toBe(MAX_FLUORESCENT_AREA_LIGHTS);
    expect(second.size).toBe(MAX_FLUORESCENT_AREA_LIGHTS);
  });

  it("is a pure function of the placement", () => {
    const items = lights(500, 10);
    expect([...assignAreaLights(items)]).toEqual([...assignAreaLights(items)]);
    expect([...assignAreaLights(items)]).toEqual(items.slice(0, MAX_FLUORESCENT_AREA_LIGHTS).map((item) => item.id));
  });

  it("only lights fluorescent fixtures whose position hashes in", () => {
    const items: AreaLightCandidate[] = [
      { id: "desk", kind: "office_desk", position: lights(0, 1)[0].position },
      { id: "off", kind: "fluorescent_ceiling_light", position: [1, 0, 0] },
    ];
    const lit = assignAreaLights(items);
    expect(lit.has("desk")).toBe(false);
    expect(lit.has("off")).toBe(stableFurnitureHash(1, 0) % 3 === 0);
  });

  it("lights real labyrinths of different seeds", () => {
    for (const seed of [1337, 99]) {
      const maze = generateMaze(8, 8, seed);
      const lit = assignAreaLights(placeBackroomFurniture(maze, seed, []));
      expect(lit.size).toBe(1);
    }
  });
});

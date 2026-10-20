import { describe, expect, it } from "vitest";

const SOURCES = import.meta.glob<string>("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });

const RENDER_TECH = /^(three|react|react-dom|@react-three)(\/|$)/;

const BOUNDARIES: Array<{ area: string; banned: RegExp[] }> = [
  { area: "./shared/", banned: [/^\.\.\//, RENDER_TECH] },
  { area: "./graphics/", banned: [/(^|\/)(game|terminal|ui|atelier|memorama|landing|minigames|building)\//] },
  { area: "./graphics/domain/", banned: [/\/(application|renderers|presentation)\//, RENDER_TECH] },
  { area: "./graphics/config/", banned: [/\/(application|renderers|presentation)\//, RENDER_TECH] },
  { area: "./graphics/application/", banned: [/\/(renderers|presentation)\//, RENDER_TECH] },
  { area: "./graphics/renderers/", banned: [/\/presentation\//] },
  { area: "./minigames/kit/", banned: [/(^|\/)(game|terminal|ui|atelier|memorama|landing)\//] },
  { area: "./terminal/", banned: [/(^|\/)(game|ui|atelier|memorama)\//, RENDER_TECH] },
  { area: "./game/", banned: [/(^|\/)(ui|atelier|memorama|landing)\//] },
  { area: "./atelier/", banned: [/(^|\/)(game|terminal|ui|memorama)\//] },
  { area: "./memorama/", banned: [/(^|\/)(game|terminal|ui|atelier)\//] },
];

const KNOWN_DEBT: string[] = [];

export function importsOf(source: string): string[] {
  const specs = [
    ...source.matchAll(/\bfrom\s+["']([^"']+)["']/g),
    ...source.matchAll(/^\s*import\s+["']([^"']+)["']/gm),
    ...source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
  ];
  return specs.map((m) => m[1]);
}

function resolve(from: string, spec: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.replace(/\.tsx?$/, "").split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

const modules = Object.entries(SOURCES).filter(([path]) => !/\.test\.tsx?$/.test(path) && path !== "./layering.test.ts");

function offenders(): string[] {
  const found = new Set<string>();
  for (const [path, source] of modules) {
    for (const { area, banned } of BOUNDARIES) {
      if (!path.startsWith(area)) continue;
      for (const spec of importsOf(source)) {
        const target = spec.startsWith(".") ? resolve(path, spec) : spec;
        if (banned.some((re) => re.test(spec) || re.test(target))) found.add(`${path} -> ${spec}`);
      }
    }
  }
  return [...found].sort();
}

describe("layering", () => {
  it("reads every import form", () => {
    expect(importsOf(`import a from 'x';\nimport "./side.css";\nconst m = import("./lazy");\nimport type { B } from "y";`)).toEqual(["x", "y", "./side.css", "./lazy"]);
  });

  it("no module crosses a boundary beyond the recorded debt, and paid debt leaves the list", () => {
    const now = offenders();
    expect(now.filter((o) => !KNOWN_DEBT.includes(o))).toEqual([]);
    expect(KNOWN_DEBT.filter((o) => !now.includes(o))).toEqual([]);
  });

  it("graphics has no import cycles", () => {
    const graph = new Map<string, string[]>();
    for (const [path, source] of modules.filter(([p]) => p.startsWith("./graphics/"))) {
      graph.set(path.replace(/\.tsx?$/, ""), importsOf(source).filter((i) => i.startsWith(".")).map((i) => resolve(path, i)));
    }
    const state = new Map<string, number>();
    const cycles: string[] = [];
    const visit = (node: string, stack: string[]) => {
      if (state.get(node) === 2) return;
      if (state.get(node) === 1) {
        cycles.push([...stack.slice(stack.indexOf(node)), node].join(" -> "));
        return;
      }
      state.set(node, 1);
      for (const dep of graph.get(node) ?? []) visit(dep, [...stack, node]);
      state.set(node, 2);
    };
    for (const node of graph.keys()) visit(node, []);
    expect(cycles).toEqual([]);
    expect(graph.size).toBeGreaterThan(20);
  });
});

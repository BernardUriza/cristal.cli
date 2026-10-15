import { describe, expect, it } from "vitest";

const SOURCES = import.meta.glob<string>("./**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true });

const FORBIDDEN: Record<string, RegExp[]> = {
  "./domain/": [/\/application\//, /\/renderers\//, /\/presentation\//, /^three$/, /^react/],
  "./config/": [/\/application\//, /\/renderers\//, /\/presentation\//, /^three$/, /^react/],
  "./application/": [/\/renderers\//, /\/presentation\//, /^three$/, /^react/],
};

function importsOf(source: string): string[] {
  return [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
}

function resolve(from: string, spec: string): string {
  const parts = from.split("/").slice(0, -1);
  for (const seg of spec.replace(/\.tsx?$/, "").split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

const modules = Object.entries(SOURCES).filter(([path]) => !/\.test\.tsx?$/.test(path));

describe("graphics layering", () => {
  it("lower layers never import higher layers or render technologies", () => {
    const offenders: string[] = [];
    for (const [path, source] of modules) {
      for (const [layer, banned] of Object.entries(FORBIDDEN)) {
        if (!path.startsWith(layer)) continue;
        for (const imp of importsOf(source)) if (banned.some((re) => re.test(imp))) offenders.push(`${path} -> ${imp}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no import cycles", () => {
    const graph = new Map<string, string[]>();
    for (const [path, source] of modules) {
      const id = path.replace(/\.tsx?$/, "");
      graph.set(id, importsOf(source).filter((i) => i.startsWith(".")).map((i) => resolve(path, i)));
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

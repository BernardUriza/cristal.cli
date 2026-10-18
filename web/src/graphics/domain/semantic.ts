export type SemanticKind = "building" | "creature";

export type SemanticRoot = { root: string; kind: SemanticKind };

const ROOTS = new WeakMap<object, SemanticRoot>();

/** Marks each shape as drawn by one building or creature; the shapes and their render stay untouched. */
export function tagRoot<T extends object>(shapes: T[], root: SemanticRoot): T[] {
  for (const s of shapes) ROOTS.set(s, root);
  return shapes;
}

export function rootOf(shape: object): SemanticRoot | undefined {
  return ROOTS.get(shape);
}

const REWRITTEN = new WeakMap<object, string>();

/** Marks the group a rewrite emitted with its output node, so the measurement finds what replaced what. */
export function tagRewrite<T extends object>(shape: T, outputNode: string): T {
  REWRITTEN.set(shape, outputNode);
  return shape;
}

export function rewriteOf(shape: object): string | undefined {
  return REWRITTEN.get(shape);
}

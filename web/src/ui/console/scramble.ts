const SCRAMBLE_CHARS = "▓▒░#@%&*!?/\\|<>=+ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");

export const randGlyph = (random: () => number = Math.random) =>
  SCRAMBLE_CHARS[Math.floor(random() * SCRAMBLE_CHARS.length)];

export function scrambleText(text: string, revealed: number, glyph: () => string = randGlyph): string {
  return [...text].map((c, i) => (c === " " ? " " : i < revealed ? c : glyph())).join("");
}

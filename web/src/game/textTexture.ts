import * as THREE from "three";

export interface TextTextureSpec {
  width: number;
  height: number;
  font: string;
  fill: string;
  glow: string;
  glowBlur: number;
  lineHeight: number;
  margin: number;
  baselineOffset: number;
}

const INSCRIPTION: TextTextureSpec = {
  width: 1024,
  height: 256,
  font: "italic 46px ui-monospace, monospace",
  fill: "#8af5cf",
  glow: "#33ffcc",
  glowBlur: 16,
  lineHeight: 56,
  margin: 80,
  baselineOffset: 0,
};

const DOOR_LABEL: TextTextureSpec = {
  width: 128,
  height: 128,
  font: "bold 88px ui-monospace, monospace",
  fill: "#7dffd0",
  glow: "#33ffcc",
  glowBlur: 18,
  lineHeight: 0,
  margin: 0,
  baselineOffset: 4,
};

function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function makeTextTexture(text: string, spec: TextTextureSpec, wrap: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, spec.width, spec.height);
  ctx.fillStyle = spec.fill;
  ctx.font = spec.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = spec.glow;
  ctx.shadowBlur = spec.glowBlur;
  const lines = wrap ? wrapWords(ctx, text, spec.width - spec.margin) : [text];
  const startY = spec.height / 2 - ((lines.length - 1) * spec.lineHeight) / 2 + spec.baselineOffset;
  lines.forEach((ln, i) => ctx.fillText(ln, spec.width / 2, startY + i * spec.lineHeight));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const makeInscriptionTexture = (text: string) => makeTextTexture(text, INSCRIPTION, true);
export const makeLabelTexture = (label: string) => makeTextTexture(label, DOOR_LABEL, false);

const WALL_INSCRIPTION: Omit<TextTextureSpec, "fill" | "glow"> = {
  width: 512,
  height: 144,
  font: "600 40px ui-monospace, monospace",
  glowBlur: 18,
  lineHeight: 48,
  margin: 40,
  baselineOffset: 0,
};

const CONSOLE_LABEL: Omit<TextTextureSpec, "fill" | "glow"> = {
  width: 256,
  height: 96,
  font: "700 34px ui-monospace, monospace",
  glowBlur: 14,
  lineHeight: 0,
  margin: 0,
  baselineOffset: 2,
};

export const makeWallInscriptionTexture = (text: string, accent: string) =>
  makeTextTexture(text, { ...WALL_INSCRIPTION, fill: accent, glow: accent }, true);
export const makeConsoleLabelTexture = (label: string, accent: string) =>
  makeTextTexture(label, { ...CONSOLE_LABEL, fill: accent, glow: accent }, false);

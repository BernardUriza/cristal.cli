import { useEffect, useMemo, useRef } from "react";
import type { Illustration } from "../application/compose.ts";
import { paintDisplayList } from "../renderers/canvas/paint.ts";
import { toSvg } from "../renderers/svg/serialize.ts";

type Props = { illustration: Illustration; backend: "svg" | "canvas"; scale?: number };

export function CompositionPreview({ illustration, backend, scale = 1 }: Props) {
  const { layers, width, height } = illustration;
  const svg = useMemo(() => (backend === "svg" ? toSvg(layers, width, height) : ""), [backend, layers, width, height]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || backend !== "canvas") return;
    ctx.clearRect(0, 0, width * scale, height * scale);
    paintDisplayList(ctx, layers, scale);
  }, [backend, layers, width, height, scale]);
  if (backend === "svg") return <div data-backend="svg" style={{ width, height }} dangerouslySetInnerHTML={{ __html: svg }} />;
  return <canvas data-backend="canvas" ref={canvasRef} width={width * scale} height={height * scale} style={{ width, height }} />;
}

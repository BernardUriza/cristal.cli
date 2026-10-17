import { useEffect, useRef, useState } from "react";
import { paintDisplayList } from "../graphics/renderers/canvas/paint.ts";
import type { Stroke } from "./strokes.ts";

export const SPEEDS = [1, 4, 16, 64] as const;
export type Speed = (typeof SPEEDS)[number];

export function useDrawing(strokes: readonly Stroke[], width: number, height: number, scale: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<Speed>(16);
  const drawnRef = useRef(0);

  const repaintUpTo = (count: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width * scale, height * scale);
    paintDisplayList(ctx, strokes.slice(0, count).map((s) => s.shape), scale);
    drawnRef.current = count;
    setDrawn(count);
  };

  useEffect(() => {
    repaintUpTo(0);
    setPaused(false);
  }, [strokes]);

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    const step = () => {
      const from = drawnRef.current;
      if (from >= strokes.length) return;
      const to = Math.min(strokes.length, from + speed);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) paintDisplayList(ctx, strokes.slice(from, to).map((s) => s.shape), scale);
      drawnRef.current = to;
      setDrawn(to);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [strokes, paused, speed, scale]);

  return { canvasRef, drawn, paused, setPaused, speed, setSpeed, seek: repaintUpTo, finished: drawn >= strokes.length };
}

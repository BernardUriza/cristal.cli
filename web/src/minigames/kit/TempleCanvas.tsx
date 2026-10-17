import { useEffect, useRef } from "react";
import { templeCanvas } from "./templeCanvas.ts";

export function TempleCanvas({ artSeed, className }: { artSeed: number; className?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    const canvas = templeCanvas(artSeed);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    el.replaceChildren(canvas);
  }, [artSeed]);
  return <div ref={holder} className={className} />;
}

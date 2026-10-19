import { useLayoutEffect, useRef, useState } from "react";
import { fitBoard, type BoardFit } from "./boardFit.ts";

export function useBoardFit(cards: number, gap: number, aspect: number) {
  const ref = useRef<HTMLElement>(null);
  const [fit, setFit] = useState<BoardFit | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setFit(fitBoard({ cards, width: el.clientWidth, height: el.clientHeight, gap, aspect }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cards, gap, aspect]);
  return { ref, fit };
}

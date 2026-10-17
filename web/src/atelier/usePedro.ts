import { useEffect, useRef, useState } from "react";
import type { Direction } from "./director.ts";
import { requestDirection } from "./directorApi.ts";

export type PedroState =
  | { status: "idle" }
  | { status: "thinking"; narration: string }
  | { status: "ready"; narration: string; direction: Direction }
  | { status: "silent"; narration: string };

export function usePedro() {
  const [state, setState] = useState<PedroState>({ status: "idle" });
  const inflight = useRef<AbortController | null>(null);

  const ask = (narration: string, seed: number) => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    setState({ status: "thinking", narration });
    void requestDirection(narration, seed, controller.signal).then((direction) => {
      if (controller.signal.aborted) return;
      setState(direction ? { status: "ready", narration, direction } : { status: "silent", narration });
    });
  };

  const dismiss = () => setState({ status: "idle" });

  useEffect(() => () => inflight.current?.abort(), []);

  return { state, ask, dismiss };
}

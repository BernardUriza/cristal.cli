import { useEffect } from "react";
import { interactWithNearby } from "./interact";

const INTERACT_KEYS = new Set(["KeyE", "Enter", "NumpadEnter"]);

// E, Enter or a click while the mouse is captured: three ways to say "this one".
export function useInteract(canvas: HTMLCanvasElement): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!INTERACT_KEYS.has(e.code) || e.repeat) return;
      if (interactWithNearby()) e.preventDefault();
    };
    const onMouseDown = () => {
      if (document.pointerLockElement === canvas) interactWithNearby();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [canvas]);
}

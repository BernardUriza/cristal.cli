import { useEffect, useRef } from "react";

export interface InputState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
  jump: boolean; // edge-consumed by the controller
}

const KEY_MAP: Record<string, keyof InputState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
  ControlLeft: "crouch",
  ControlRight: "crouch",
  Space: "jump",
};

// Mirrors PlayerInputHandler: aggregates raw key state. Movement keys are
// suppressed while not in exploration so the console overlay owns the keyboard.
export function useKeyboard(enabled: boolean) {
  const input = useRef<InputState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
    crouch: false,
    jump: false,
  });

  useEffect(() => {
    if (!enabled) {
      // Release everything when control is handed off (e.g. console mode).
      input.current = {
        forward: false,
        back: false,
        left: false,
        right: false,
        sprint: false,
        crouch: false,
        jump: false,
      };
      return;
    }

    const onDown = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (action) {
        if (action === "jump" && !input.current.jump) input.current.jump = true;
        else input.current[action] = true;
        if (e.code === "Space") e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (action && action !== "jump") input.current[action] = false;
      if (action === "jump") input.current.jump = false;
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [enabled]);

  return input;
}

import { useEffect, useState } from "react";
import type { Line } from "./lines";
import { scrambleText } from "./scramble";

const REVEAL_TICK_MS = 40;

// Decode-on-reveal: a glitch line arrives as corrupt glyphs and resolves to its
// real text left-to-right, always settling 100% readable.
export function ConsoleLine({ text, cls, scramble }: Line) {
  const [display, setDisplay] = useState(() => (scramble ? scrambleText(text, 0) : text));

  useEffect(() => {
    if (!scramble) {
      setDisplay(text);
      return;
    }
    const length = [...text].length;
    let revealed = 0;
    const id = window.setInterval(() => {
      revealed++;
      setDisplay(scrambleText(text, revealed));
      if (revealed >= length) {
        window.clearInterval(id);
        setDisplay(text);
      }
    }, REVEAL_TICK_MS);
    return () => window.clearInterval(id);
  }, [text, scramble]);

  return <div className={`line ${cls}`}>{display || " "}</div>;
}

export type ShareOutcome = "copied" | "failed";

export async function shareText(text: string): Promise<ShareOutcome> {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  try {
    if (touch && navigator.share && (!navigator.canShare || navigator.canShare({ text }))) {
      await navigator.share({ text });
      return "copied";
    }
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

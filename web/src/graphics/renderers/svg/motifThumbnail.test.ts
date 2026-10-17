import { describe, expect, it } from "vitest";
import { motifThumbnailSvg } from "./motifThumbnail";

describe("motifThumbnailSvg", () => {
  it("serializes a motif into a square svg and rejects unknown ids", () => {
    const svg = motifThumbnailSvg("craneo", 96);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"')).toBe(true);
    expect(svg).toContain("<polygon");
    expect(motifThumbnailSvg("ojo", 64, 3, 2)).toBe(motifThumbnailSvg("ojo", 64, 3, 2));
    expect(() => motifThumbnailSvg("dragon", 64)).toThrow(/dragon/);
  });
});

import { composeIllustration } from "../../graphics/application/compose.ts";
import { rasterize } from "../../graphics/renderers/canvas/rasterize.ts";
import { deviceScale } from "../../shared/display.ts";
import { templeArtInput } from "./templeArt.ts";

export function templeCanvas(artSeed: number, scale = deviceScale()): HTMLCanvasElement {
  const ill = composeIllustration(templeArtInput(artSeed));
  return rasterize(ill.layers, ill.width, ill.height, scale);
}

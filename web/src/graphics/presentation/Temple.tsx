import { useEffect, useMemo } from "react";
import { composeArchitecture } from "../application/compose.ts";
import { PALETTES } from "../config/palettes.ts";
import type { ConfigInput } from "../config/types.ts";
import { resolveConfig } from "../config/validate.ts";
import { lodLevel, projectedHeightPx } from "../domain/lod.ts";
import { buildTemple } from "../renderers/three/buildTemple.ts";
import { canvasTextureFactory } from "../renderers/three/textures.ts";

const PX_PER_METER_BY_LEVEL = [12, 24, 48, 96];
const LEVEL_THRESHOLDS_PX = [40, 120, 320];

export function pxPerMeterFor(columnHeight: number, distance: number, fov: number, viewportPx: number): number {
  return PX_PER_METER_BY_LEVEL[lodLevel(projectedHeightPx(columnHeight, distance, fov, viewportPx), LEVEL_THRESHOLDS_PX)];
}

type TempleProps = {
  input: ConfigInput;
  position?: [number, number, number];
  rotation?: [number, number, number];
  viewDistance?: number;
  fov?: number;
  viewportPx?: number;
};

export function Temple({ input, position = [0, 0, 0], rotation = [0, 0, 0], viewDistance = 20, fov = 60, viewportPx = 900 }: TempleProps) {
  const build = useMemo(() => {
    const cfg = resolveConfig(input);
    const arch = composeArchitecture(cfg);
    const pxPerMeter = pxPerMeterFor(arch.main.columns[0].h, viewDistance, fov, viewportPx);
    return buildTemple(arch, PALETTES[cfg.art.palette], cfg.art, { preset: cfg.tech.shaderPreset, pxPerMeter, textures: canvasTextureFactory, lod: cfg.tech.lod });
  }, [input, viewDistance, fov, viewportPx]);
  useEffect(() => () => build.dispose(), [build]);
  return <primitive object={build.group} position={position} rotation={rotation} />;
}

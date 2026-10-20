import { createContext, useContext } from "react";
import type { FurnitureMaterialCache } from "./materialCache";
import type { FurnitureMaterialKey } from "./materials";

export const FurnitureMaterialsContext = createContext<FurnitureMaterialCache<FurnitureMaterialKey> | null>(null);

export function useFurnitureMaterials() {
  const cache = useContext(FurnitureMaterialsContext);
  if (!cache) throw new Error("Backroom furniture rendered outside BackroomFurnitureSet");
  return cache;
}

export function useFurnitureMaterial() {
  const cache = useFurnitureMaterials();
  return (key: FurnitureMaterialKey) => cache.material(key);
}

# CRISTAL.CLI — Web (Three.js / React Three Fiber)

Migración del juego narrativo de terminal desde Unity/C# a la web con
**React Three Fiber** (Three.js + React) + **Vite** + **TypeScript**.

Esta primera fase reconstruye el **laberinto 3D explorable** y el flujo de
**consola in-world** (Exploration ↔ Console), fiel al diseño de la versión Unity.

## Requisitos

- Node 18+

## Comandos

```bash
npm install
npm run sync-assets   # copia los FBX de ../Mixamo a public/models (gitignored)
npm run dev           # http://localhost:5173
npm run build         # build de producción a /dist
npm run typecheck
```

## Controles

| Tecla            | Acción                          |
| ---------------- | ------------------------------- |
| `W A S D` / flechas | Mover (relativo a cámara)    |
| `Shift`          | Correr                          |
| `Ctrl`           | Agacharse                       |
| `Space`          | Saltar                          |
| ratón (click)    | Pointer-lock + mirar            |
| `E`              | Conectar a la consola cercana   |
| `ESC`            | Desconectar consola             |

## Mapa de arquitectura (Unity → Web)

| Unity (C#)                      | Web (R3F/TS)                          |
| ------------------------------- | ------------------------------------- |
| `LabyrinthManager` + `GameMode` | `src/game/store.ts` (zustand)         |
| `PlayerController`              | `src/game/Player.tsx`                 |
| `PlayerCamera`                  | cámara tercera persona en `Player.tsx`|
| `PlayerInputHandler`            | `src/game/input/useKeyboard.ts`       |
| `PlayerAnimator`               | `src/game/Character.tsx` (AnimationMixer vía drei) |
| `LabyrinthLayout` / rooms       | `src/game/maze.ts` + `Labyrinth.tsx`  |
| `InWorldConsole` / `ConsoleUIBridge` | `src/game/InWorldConsole.tsx` + `ui/ConsoleOverlay.tsx` |
| `FloatingInteractPrompt`        | `src/ui/InteractPrompt.tsx`           |
| `TerminalCore` + `ResponseEngine` + `StateMachine` | `src/terminal/*` |
| `InputParser` / `PatternMatcher` / `ResponseBuilder` | `terminal/inputParser.ts`, `patterns.ts`, `responses.ts`, `responseEngine.ts` |
| `CristalMemory` (subset)        | `terminal/memory.ts` (localStorage)   |
| `ArcanaSystem` (invoke)         | tabla en `terminal/terminalCore.ts`   |

### Terminal (TerminalCore portado)

La consola in-world está conectada al port del `TerminalCore`:
máquina de estados (`CristalState`), parser semántico, pattern matching
(`patterns.json`), generación de respuestas por niveles (literal/narrative/ritual),
modificadores por estado (prefijos, glitch, mayúsculas), memoria persistente
(conteo, keywords, corrupción, emoción dominante) e `invoke arcana [n|nombre]`.

Comandos de prueba: `help`, `status`, `who am i`, `invoke arcana 18`,
`corrupt the system`, o cualquier frase emocional (`tengo miedo`).

## Personaje Mixamo y skinning

En Three.js moderno **no existe la propiedad `material.skinning`** (se eliminó en
la r125). Un `SkinnedMesh` con su `skeleton` se deforma automáticamente, así que
un `MeshStandardMaterial` normal ya respeta el skinning — que es justo lo que
producen `GLTFLoader` y `FBXLoader`. La animación esquelética se reproduce con un
`AnimationMixer` (aquí vía el hook `useAnimations` de drei).

### ⚠️ Formato de los FBX

Los archivos en `/Mixamo` están en el formato **FBX 6100 (FBX 2010)**, que el
`FBXLoader` de Three.js **no soporta** (solo FBX 7.x). Por eso, al cargar el
personaje real, la escena cae a un **avatar procedural (cápsula)** mediante un
`ErrorBoundary` — la escena nunca se rompe.

Para tener el personaje real con skinning, haz **una** de estas:

1. **Recomendado — convertir a `.glb`** (formato ideal para web):
   - Importa el FBX en Blender y exporta como glTF Binary (`.glb`), o usa
     [`FBX2glTF`](https://github.com/facebookincubator/FBX2glTF).
   - Copia el `.glb` a `web/public/models/` y cambia `CHARACTER_FILE` /
     `ANIM_FILE` en `src/game/Character.tsx` a los `.glb`.
2. **Re-exportar desde Mixamo**: descarga de nuevo como "FBX Binary (.fbx)"
   (hoy exporta 7.4) y ejecuta `npm run sync-assets`.

El loader ya prefiere `.glb` si el nombre termina en `.glb`/`.gltf`.

## Pendiente (siguientes fases)

- Respuestas IA dinámicas (Claude API) para los estados conversacionales.
- Clips de locomoción (idle/walk/run) para el blend del personaje.
- Sistemas: Symbolic Forge, Rituals, Dream Tunnels.

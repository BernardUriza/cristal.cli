# CRISTAL.CLI - Donde Quedamos

## Estado Actual: Phase 6.7 - Dream Tunnels Complete

**Version:** 0.6.7
**Ultima actualizacion:** 2026-01-11

---

## Completado

### Phase 1-6.3: Core Systems
- [x] Terminal, Memory, StateMachine, Arcana, AI, Vision system
- [x] Scene cleanup: `Labyrinth.unity` (3D) y `CrystalCLI.unity` (2D)
- [x] URP configurado con Universal Renderer 3D
- [x] Prefabs: RitualOperator, TerminalConsole
- [x] Player scripts: Controller, Camera, Interaction, InputHandler
- [x] Input System configurado
- [x] Terminal Visual Config, ScanlineEffect, TerminalFrame
- [x] SVG Export system
- [x] Floating Interact Prompt

### Phase 6.2: Labyrinth 3D
- [x] LabyrinthBootstrap + RuntimeRoomBuilder
- [x] Labyrinth walls working
- [x] LabyrinthAtmosphere (fog, lighting)

### Phase 6.7: Dream Tunnels System
- [x] DreamTunnelSystem - Orquestador principal
- [x] DreamTunnel, DreamRoom, DreamRoomBuilder - Geometria procedural
- [x] DreamRoomDefinition - ScriptableObject arquetipos
- [x] DreamAIOracle - Generacion AI via Ollama/Qwen3
- [x] DreamSymbolProjector - Proyeccion de simbolos procedurales
- [x] DreamMemoryBridge - Persistencia de suenos

### Phase 8: Symbolic Forge System
- [x] ReactiveSystemBus - Pub/sub eventos
- [x] SymbolicForge - Sistema central
- [x] SVGGenerator - Motor procedural
- [x] SymbolicTemplate - Configuraciones
- [x] SymbolicProjection - Display
- [x] SymbolicMemoryLog - Persistencia

### Phase 9: Ritual System
- [x] RitualExecutor - Orquestador
- [x] RitualDefinition - ScriptableObject rituales
- [x] RitualProgressTracker - Persistencia
- [x] SymbolicTrigger - Interacciones mundo
- [x] VisionManager, VisionInstance

---

## En Progreso

- [ ] Descargar Y Bot de Mixamo
- [ ] Descargar animaciones: Idle, Walk, Run, Jump
- [ ] Configurar Animator Controller
- [ ] Reemplazar capsula del jugador con avatar

---

## MCP Servers

| Server | Estado | Uso |
|--------|--------|-----|
| `mcp-unity` | Puerto 8090 | Control Unity Editor |
| `chrome-devtools` | npx | Navegacion web, descargas |

---

## Estructura de Scripts

```
Assets/Scripts/
├── Terminal/           # Sistema CLI 2D
├── Memory/             # Memoria persistente + DreamMemoryBridge
├── StateMachine/       # Estados del juego
├── Arcana/             # Sistema de arcanos
├── AI/                 # Integracion Ollama/Qwen
│   └── Dreams/         # DreamAIOracle
├── Core/               # Bootstrap, ServiceLocator, CristalLog
│   └── Events/         # ReactiveSystemBus
├── Symbolic/           # Sistema simbolico (Phase 8)
├── Ritual/             # Sistema de rituales (Phase 9)
├── Labyrinth/          # Sistema 3D
│   ├── Core/           # LabyrinthManager, LabyrinthBootstrap
│   ├── Dream/          # Dream Tunnels System (Phase 6.7)
│   ├── Atmosphere/     # Fog, lighting, audio
│   └── Environment/    # RuntimeRoomBuilder
└── VFX/                # DreamSymbolProjector
```

---

## Proximos Pasos

### Opcion A: Avatar del Jugador
1. Descargar Y Bot de Mixamo
2. Importar FBX con Humanoid rig
3. Descargar animaciones (Idle, Walk, Run, Jump)
4. Crear Animator Controller
5. Integrar al PlayerController

### Opcion B: Testing Dream Tunnels
1. Crear DreamRoomDefinition assets
2. Configurar triggers de arcana
3. Probar generacion AI con Ollama
4. Verificar proyeccion de simbolos

### Opcion C: Contenido Ritual
1. Crear RitualDefinition assets
2. Colocar SymbolicTriggers en escena
3. Disenar secuencias de rituales
4. Probar sistema completo

---

## Comandos Unity Editor

```
CRISTAL > Setup 2D Terminal Scene
CRISTAL > SVG Export Window
CRISTAL > Create Terminal Visual Config
CRISTAL > Dream > Room Definition
CRISTAL > Floating Prompt > ...
CRISTAL > Start/Stop Play Mode
```

---

## Notas

- Unity 6 (6000.3.2f1) con URP
- Ollama local para AI (qwen3:8b)
- Git: commits atomicos, mensajes claros

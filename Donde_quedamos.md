# CRISTAL.CLI - Donde Quedamos

## Estado Actual: Phase 6.3 - Terminal 2D Refinement

### Completado Phase 6.2+
- [x] Phase 1-5: Terminal, Memory, StateMachine, Arcana, AI, Vision system
- [x] Scene cleanup: Solo `Labyrinth.unity` (3D) y `CrystalCLI.unity` (2D)
- [x] URP configurado con Universal Renderer 3D (`UniversalRenderer3D.asset`)
- [x] Prefabs creados:
  - `Assets/Prefabs/Labyrinth/Player/RitualOperator.prefab` - Jugador con CharacterController
  - `Assets/Prefabs/Labyrinth/Console/TerminalConsole.prefab` - Consola interactiva
- [x] Scripts del jugador:
  - `PlayerController.cs` - Movimiento third-person
  - `PlayerInputHandler.cs` - Input System
  - `PlayerInteraction.cs` - Sistema de interaccion E
  - `PlayerCamera.cs` - Camara third-person
- [x] Input System configurado en `Assets/Resources/InputSystem_Actions.inputactions`
- [x] Mixamo MCP instalado (`com.mixamo.mcp` package)
- [x] Mixamo MCP server agregado a Claude Code (`.mcp.json`)

### Completado Phase 6.3 (2026-01-06)
- [x] **Terminal 2D Independiente**: Editor setup menu `CRISTAL/Setup 2D Terminal Scene`
- [x] **UI Visual Refinements**:
  - `TerminalVisualConfig.cs` - ScriptableObject para configurar colores/estilos
  - `ScanlineEffect.cs` - Efecto CRT scanlines
  - `TerminalFrame.cs` - Border/frame visual con pulse effect
- [x] **Refactor para Unit Tests**:
  - `ITerminalUI.cs` - Interface para UI testable
  - `IInputProcessor.cs` - Interface para procesamiento de input
  - `IStateContext.cs` - Interface para estado testable
  - `TestableStateMachine.cs` - State machine sin Unity dependencies
  - `TestableStates.cs` - Implementaciones de estados testables
  - `TestableResponseBuilder.cs` - Generador de respuestas testable
- [x] **Sistema SVG Export**:
  - `SVGExporter.cs` - Core modular de exportacion
  - `SVGExportManager.cs` - Unity integration
  - `SVGExportWindow.cs` - Editor window (`CRISTAL/SVG Export Window`)
  - Glyphs: Cursor, Crystal, Eye, Arcana, Fragment, Portal

### En Progreso
- [ ] **Reiniciar Claude Code** para cargar Mixamo MCP
- [ ] Descargar personaje Y Bot de Mixamo
- [ ] Descargar animaciones: Idle, Walk, Run, Jump
- [ ] Configurar Animator Controller

### Pendiente Phase 6
- [ ] Mejorar visual del jugador (reemplazar capsula con avatar Mixamo)
- [ ] Sistema de interaccion con consola (E key)
- [ ] Rooms simbolicos con ProBuilder
- [ ] Gates reactivos a estados
- [ ] Hologram projectors para visiones
- [ ] UNBOUND transformation

---

## Archivos Clave

### Escenas
- `Assets/Scenes/Labyrinth.unity` - Escena principal 3D
- `Assets/Scenes/CrystalCLI.unity` - Escena terminal 2D

### Configuracion URP
- `Assets/Settings/UniversalRP.asset` - Pipeline principal
- `Assets/Settings/UniversalRenderer3D.asset` - Renderer 3D (nuevo)
- `Assets/Settings/Renderer2D.asset` - Renderer 2D original

### Scripts Terminal (nuevos)
```
Assets/Scripts/Terminal/
├── Core/                       # Interfaces testables
│   ├── ITerminalUI.cs
│   └── IInputProcessor.cs
├── UI/                         # Visual components
│   ├── TerminalVisualConfig.cs
│   ├── ScanlineEffect.cs
│   └── TerminalFrame.cs
└── Editor/
    └── Terminal2DSetup.cs

Assets/Scripts/StateMachine/
├── Core/                       # Testable state machine
│   ├── IStateContext.cs
│   ├── TestableStateMachine.cs
│   └── TestableStates.cs

Assets/Scripts/Response/
└── Core/
    └── TestableResponseBuilder.cs

Assets/Scripts/Export/          # SVG export system
├── SVGExporter.cs
├── SVGExportManager.cs
└── Editor/
    └── SVGExportWindow.cs
```

### Scripts Labyrinth
```
Assets/Scripts/Labyrinth/
├── Core/
│   ├── LabyrinthManager.cs
│   └── IInteractable.cs
├── Player/
│   ├── PlayerController.cs
│   ├── PlayerCamera.cs
│   ├── PlayerInteraction.cs
│   └── PlayerInputHandler.cs
└── Console/
    ├── InWorldConsole.cs
    └── ConsoleUIBridge.cs
```

### MCP Servers
- `mcp-unity` - Control de Unity Editor (puerto 8090)
- `mixamo` - Descarga de Mixamo (recien agregado, requiere restart)

---

## Comandos Unity Editor (CRISTAL Menu)

```
CRISTAL > Setup 2D Terminal Scene    # Configura escena 2D completa
CRISTAL > SVG Export Window          # Exportar glyphs/simbolos a SVG
CRISTAL > Create Terminal Visual Config  # Crear ScriptableObject de config
CRISTAL > Start Play Mode
CRISTAL > Stop Play Mode
```

---

## Proximos Pasos Inmediatos

1. **Reiniciar Claude Code** en el proyecto
2. Verificar que Mixamo MCP este conectado
3. Usar `mixamo-search` para buscar personaje
4. Descargar Y Bot + animaciones basicas
5. Configurar Humanoid rig y Animator Controller
6. Reemplazar capsula del jugador con avatar

---

## Comandos Utiles

```bash
# Unity MCP
Tools > MCP Unity > Server Window

# Mixamo MCP
Window > Mixamo MCP > Settings

# ProBuilder
Tools > ProBuilder > Editors > Create Shape

# Play Mode
CRISTAL > Start Play Mode
```

---

## Token Mixamo (expira en ~10 dias)
Obtenido de mixamo.com console: `localStorage.access_token`
Guardado en: Unity > Window > Mixamo MCP > Settings

---

*Ultima actualizacion: 2026-01-06*

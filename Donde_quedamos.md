# CRISTAL.CLI - Donde Quedamos

## Estado Actual: Phase 6.3 - Terminal 2D Refinement

**Version:** 0.6.3
**Ultima actualizacion:** 2026-01-07

---

## Completado

### Phase 1-6.3
- [x] Terminal, Memory, StateMachine, Arcana, AI, Vision system
- [x] Scene cleanup: `Labyrinth.unity` (3D) y `CrystalCLI.unity` (2D)
- [x] URP configurado con Universal Renderer 3D
- [x] Prefabs: RitualOperator, TerminalConsole
- [x] Player scripts: Controller, Camera, Interaction, InputHandler
- [x] Input System configurado
- [x] Terminal Visual Config, ScanlineEffect, TerminalFrame
- [x] SVG Export system
- [x] Floating Interact Prompt (arquitectura senior)

### Fixes 2026-01-07
- [x] **Compilacion arreglada** - Errores de Phase 7-9 resueltos
- [x] **Phase 7-9 preservado** en `Backup_Phase789/` para restauracion futura
- [x] **Chrome DevTools MCP** agregado a `.mcp.json`

---

## Backup Phase 7-9

Codigo incompleto movido a `Backup_Phase789/`:
- `Labyrinth/` - Sistema de laberinto 3D
- `Ritual/` - Sistema de rituales
- `Editor_Dream/` - Editor tools de sueños

Archivos con `// TODO Phase 9` para reactivar:
- `TerminalCore.cs` - RitualSystem, VisionManager
- `CristalBootstrap.cs` - RitualSystem, VisionManager
- `PromptBuilder.cs` - GetVisionContext()

---

## En Progreso

- [ ] Configurar Chrome DevTools MCP (reiniciar Claude Code)
- [ ] Descargar Y Bot de Mixamo via Chrome DevTools
- [ ] Descargar animaciones: Idle, Walk, Run, Jump
- [ ] Configurar Animator Controller
- [ ] Reemplazar capsula del jugador con avatar

---

## MCP Servers

| Server | Estado | Uso |
|--------|--------|-----|
| `mcp-unity` | Puerto 8090 | Control Unity Editor |
| `chrome-devtools` | npx | Navegacion web, descargas |
| `mixamo` | Inestable | (Deprecado - usar Chrome DevTools) |

---

## Archivos Clave

### Escenas
- `Assets/Scenes/Labyrinth.unity` - Escena principal 3D
- `Assets/Scenes/CrystalCLI.unity` - Escena terminal 2D

### Configuracion
- `Assets/Settings/UniversalRP.asset` - Pipeline principal
- `Assets/Settings/UniversalRenderer3D.asset` - Renderer 3D
- `.mcp.json` - Configuracion MCP servers

### Scripts Core
```
Assets/Scripts/
├── Terminal/          # Sistema CLI
├── Memory/            # Memoria persistente
├── StateMachine/      # Estados del juego
├── Arcana/            # Sistema de arcanos
├── AI/                # Integracion Ollama/Qwen
├── Core/              # Bootstrap, ServiceLocator
└── Symbolic/          # Sistema simbolico
```

---

## Comandos Unity Editor

```
CRISTAL > Setup 2D Terminal Scene
CRISTAL > SVG Export Window
CRISTAL > Create Terminal Visual Config
CRISTAL > Floating Prompt > ...
CRISTAL > Start/Stop Play Mode
```

---

## Proximos Pasos

1. Reiniciar Claude Code (cargar Chrome DevTools MCP)
2. Navegar a mixamo.com con Chrome DevTools
3. Descargar Y Bot + animaciones
4. Configurar Humanoid rig y Animator
5. Integrar avatar al jugador

---

## Notas

- Unity 6 (6000.3.2f1) con URP
- Ollama local para AI (qwen3:8b)
- Git: commits atomicos, mensajes claros

# CRISTAL.CLI - Donde Quedamos

## Fecha: 2026-01-06

## Estado Actual: Phase 6.2 - Labyrinth 3D

### Completado
- [x] URP configurado con Universal Renderer 3D (ya no Renderer2D)
- [x] Escena `Labyrinth.unity` creada con Floor, Directional Light, RitualOperator, TerminalConsole
- [x] Escena `CrystalCLI.unity` creada para modo terminal 2D
- [x] Escenas de ejemplo eliminadas (SampleScene, TMP examples, URP2D template)
- [x] Input System configurado - copiado a `Assets/Resources/InputSystem_Actions.inputactions`
- [x] Consola rotada 180° para mirar al jugador
- [x] Mixamo MCP package instalado (`com.mixamo.mcp` v5.0.7)
- [x] Mixamo MCP server agregado a Claude Code (`.mcp.json`)

### Pendiente (Siguiente Sesion)
- [ ] **REINICIAR Claude Code** para cargar Mixamo MCP
- [ ] Descargar personaje Y Bot desde Mixamo
- [ ] Descargar animaciones: Idle, Walking, Running, Jump
- [ ] Configurar Humanoid Rig en FBX imports
- [ ] Crear Animator Controller con estados
- [ ] Conectar animator al PlayerController
- [ ] Reemplazar capsula con modelo Y Bot

### Problemas Conocidos
- 3 Audio Listeners en escena (necesita cleanup)
- PlayerVisual es solo una capsula fea (pendiente reemplazo con Mixamo)

### Archivos Clave Modificados
- `Assets/Settings/UniversalRP.asset` - Ahora usa UniversalRenderer3D
- `Assets/Settings/UniversalRenderer3D.asset` - Nuevo renderer 3D
- `Assets/Resources/InputSystem_Actions.inputactions` - Para PlayerInputHandler
- `.mcp.json` - Configuracion Mixamo MCP server

### Token Mixamo (expira en ~10 dias)
Usuario: Bernard (26B107A5507F37DC0A490D4D@AdobeID)
Token guardado en: Window > Mixamo MCP > Settings (Unity)

### Comandos Utiles Post-Reinicio
```
mixamo-search keyword="idle"
mixamo-download animationIdOrName="idle"
mixamo-batch animations="idle,walk,run,jump"
```

### Plan Original
Ver: `C:\Users\buo45\.claude\plans\robust-coalescing-neumann.md`

# CRISTAL.CLI - Unity Narrative Terminal Game

Owner: Bernard Uriza Orozco
Version: 0.1.0
Updated: 2026-01-06

---

## FLUJO DE TRABAJO CON BERNARD - REGLA CRITICA

```
FLUJO SIMPLE (seguir en orden):
  1. Entender que se pide (NO asumir mas)
  2. Hacer el cambio minimo necesario
  3. Verificar en Unity (Play Mode, logs)
  4. Commit -> Push -> LISTO
  5. NO agregar mas.

PROHIBIDO:
  - Ir por tangentes ("y tambien podriamos...")
  - Ofrecer soluciones no pedidas
  - Complicar lo simple
  - Preguntar sobre cosas no relacionadas
  - Perder el enfoque del task original

CORRECTO:
  - Enfocarse SOLO en lo que se pidio
  - Verificar -> commit -> LISTO
  - Si hay duda, PREGUNTAR antes de actuar
  - Mantener respuestas cortas
```

---

## Git Workflow

```
FLUJO OBLIGATORIO:
  1. Trabajar en rama actual (main por ahora)
  2. Commits atomicos con mensajes claros
  3. Push frecuente

COMMITS:
  - feat: nueva funcionalidad
  - fix: correccion de bug
  - refactor: cambio de estructura
  - docs: documentacion
  - style: formato/estilo

AUTOR:
  - Bernard Uriza Orozco es el UNICO autor
  - NUNCA usar Claude como co-author en este proyecto
```

---

## Project Info

- **Engine**: Unity 6 (6000.3.2f1)
- **Render Pipeline**: URP (Universal Render Pipeline)
- **Type**: 2D Narrative Terminal Game
- **Concept**: CLI interface as core gameplay mechanic

---

## Project Structure

```
cristal.cli/
├── Assets/
│   ├── Scripts/
│   │   └── Terminal/           # Core CLI system
│   │       ├── TerminalCore.cs      # Engine: input processing, responses
│   │       ├── CrystalCLI.cs        # UI controller
│   │       ├── TypewriterEffect.cs  # Text animation
│   │       ├── CommandMemory.cs     # History/log system
│   │       ├── CursorBlink.cs       # Cursor animation
│   │       └── Editor/              # Unity editor tools
│   ├── Scenes/
│   ├── Prefabs/
│   └── TextMesh Pro/           # TMP resources
├── Packages/
├── ProjectSettings/
└── Library/                    # Unity cache (gitignored)
```

---

## Code Style (C#)

```csharp
// Namespaces
namespace Cristal.CLI { }

// Class naming
public class TerminalCore : MonoBehaviour { }

// Public members: PascalCase
public string SessionId { get; }
public void ProcessInput(string input) { }

// Private fields: _camelCase
[SerializeField] private float _responseDelay = 0.3f;
private bool _isFirstInput = true;

// Events
public event Action<string> OnInputReceived;
public event Action<TerminalResponse> OnResponseGenerated;

// Constants
private const string BOOT_SEQUENCE = "...";
```

---

## MCP Unity Integration

```
Start server: Tools -> MCP Unity -> Server Window -> Start Server
Port: 8090 (default)

Control via Claude Code:
  CRISTAL/Setup Simple Terminal  # Configure scene
  CRISTAL/Start Play Mode        # Enter play mode
  CRISTAL/Stop Play Mode         # Exit play mode
  CRISTAL/Import TMP Now         # Import TextMeshPro
```

---

## CRISTAL CLI System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CristalBootstrap                            │
│   [DefaultExecutionOrder(-100)] - Initializes all services      │
│   Registers: Memory, StateMachine, Response, Arcana, Effects    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ServiceLocator                              │
│   Centralized service registry replacing 13+ singletons         │
│   - Register<T>(service) / Get<T>() / TryGet<T>()              │
│   - Auto-unregister on MonoBehaviour destroy                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ CrystalCLI    │  │TerminalCore   │  │LabyrinthMgr   │
│ (2D UI)       │  │(Logic Engine) │  │(3D World)     │
└───────────────┘  └───────────────┘  └───────────────┘

State Machine:
  CristalState enum: Bootstrap, Waiting, Processing, Responding,
                     Seeking, Echo, Corrupted, Remembering,
                     Invoked, Error, Locked, Unbound

Prompt System (3D Labyrinth):
  PromptVocabulary.asset → PromptContextResolver → FloatingPromptController
  → FloatingInteractPrompt (urgency: Normal/Warning/Critical)
```

---

## Logging

```csharp
// Use CristalLog instead of Debug.Log for consistent filtering
using Cristal.CLI.Core;

CristalLog.Info("SystemName", "Message");
CristalLog.Warning("SystemName", "Message");
CristalLog.Error("SystemName", "Message");
CristalLog.State("StateMachine", "Waiting", "Processing");
CristalLog.Event("RitualSystem", "UnboundTriggered");

// Configure via: Create > CRISTAL > Log Config
// Per-system log levels, auto-strip in release builds
```

---

## Game Design Notes

```
CRISTAL is a narrative interface, not an operating system.
Its purpose is to provoke the player to write what they FEEL,
not what they KNOW.

Visual aesthetic:
  - Pure black background
  - Green/cyan terminal text
  - Minimal glitch effects
  - Blinking cursor

Interaction model:
  - Player types freely
  - System responds contextually
  - Memory accumulates meaning
  - Future: Claude API for dynamic responses
```

---

## Terminal Visual Config System

```
Architecture:
  TerminalVisualConfig (ScriptableObject)
  ├── Colors: background, input, output, system, error, memory, arcana, emotional, cursor, border
  ├── Typography: font (TMP_FontAsset), fontSize, lineSpacing
  ├── Layout: padding, inputHeight, cursorWidth
  ├── Effects: typewriterSpeed, glitchChance, cursorBlinkRate, glitchChars[]
  ├── Scanlines: enable, alpha, speed
  └── Border: show, width, color

Default Config Location:
  Assets/Resources/Config/DefaultTerminalVisualConfig.asset

Load Priority (all setups):
  1. Resources.Load("Config/DefaultTerminalVisualConfig")
  2. AssetDatabase search (Terminal2DSetup only)
  3. Hardcoded fallback values

Runtime Application:
  CrystalCLI._visualConfig (optional)
  ├── ApplyVisualConfigIfPresent() in Awake + InitializeCLI
  ├── GetColorForResponseType() delegates to config if present
  ├── Drives: CursorBlink, ScanlineEffect, TerminalFrame
  └── OnValidate() for live editor preview

Editor Tools:
  CRISTAL/Create Terminal Visual Config     # Create new config asset
  CRISTAL/Setup 2D Terminal Scene           # Auto-applies config
  CRISTAL/Setup Terminal Scene              # Auto-applies config
  CRISTAL/Setup Simple Terminal             # Auto-applies config

Console Output:
  [CRISTAL] Terminal config: DefaultTerminalVisualConfig
  [CRISTAL] Terminal config: none (using defaults)
```

---

## Advanced Visual Effects

```
ScanlineEffect (Assets/Scripts/Terminal/UI/ScanlineEffect.cs):
  Modes:
    - Simple: Lightweight texture-based scanlines
    - Advanced: Full CRT shader with procedural effects
  
  Advanced Mode Features:
    - Noise: Procedural film grain
    - Vignette: Screen edge darkening
    - Chromatic Aberration: RGB channel offset
    - Screen Curvature: CRT barrel distortion
    - Flicker: Subtle brightness oscillation
    - Glitch Pulse: TriggerGlitch() for temporary noise boost

  API:
    effect.SetMode(EffectMode.Advanced);
    effect.SetNoiseAlpha(0.05f);
    effect.SetVignette(0.4f);
    effect.SetChromaticAberration(0.003f);
    effect.SetCurvature(0.02f);
    effect.TriggerGlitch();

CRTEffect Shader (Assets/Shaders/Terminal/CRTEffect.shader):
  URP-compatible post-process style shader for UI overlay
  Properties exposed for runtime adjustment

TerminalThemeManager (Assets/Scripts/Terminal/UI/TerminalThemeManager.cs):
  Dynamic theme switching based on game state
  
  Features:
    - Smooth color transitions with AnimationCurve
    - Auto-subscribe to ArcanaSystem events
    - Per-Arcana theme mappings (ScriptableObject configs)
    - Dynamic theme generation from Arcana.effects.colorHex
    - Glitch pulse on theme transition

  API:
    TerminalThemeManager.Instance.TransitionToTheme(config);
    TerminalThemeManager.Instance.ResetToDefault();
    TerminalThemeManager.Instance.GetCurrentTheme();

  Events:
    OnThemeChanged(TerminalVisualConfig config)
    OnThemeTransitionStarted(string themeName, float duration)
    OnPrimaryColorChanged(Color newColor)
    OnGlitchIntensityChanged(float intensity)
    OnThemeApplied(TerminalVisualConfig config)

  Auto-triggers:
    - OnArcanaInvoked → Apply Arcana theme
    - OnArcanaExpired → Return to default
```

---

## Terminal Commands (Phase 6.6)

```
TerminalCommandHandler (Assets/Scripts/Terminal/TerminalCommandHandler.cs):
  Intercepts input before normal processing for system/debug commands.
  
  User Commands:
    set theme [name]      # Switch visual theme (default, corrupted, unbound, etc.)
    set glitch [0-1]      # Set glitch intensity
    set scanlines [on|off]
    set crt [simple|advanced]
    themes                # List available themes
    status                # Show system status
    help                  # Show available commands

  Debug Commands (require debug mode):
    debug state [name]    # Force state transition
    debug arcana [name]   # Force arcana invocation
    debug unbound         # Trigger UNBOUND manually
    debug glitch          # Trigger glitch effect
    debug reset           # Reset to defaults

  Integration:
    Called first in TerminalCore.ProcessInput()
    Returns TerminalResponse with ResponseType.System
```

---

## Theme-Atmosphere Synchronization

```
ThemeAtmosphereBridge (Assets/Scripts/Terminal/UI/ThemeAtmosphereBridge.cs):
  Bridges theme events to atmospheric systems (fog, lighting, audio).
  
  Subscribes to:
    - TerminalThemeManager.OnThemeTransitionStarted
    - TerminalThemeManager.OnPrimaryColorChanged
    - TerminalThemeManager.OnGlitchIntensityChanged
    - TerminalThemeManager.OnThemeApplied

  Controls:
    - RenderSettings.fogColor (influenced by theme primary color)
    - RenderSettings.ambientLight (influenced by theme)
    - Glitch particle emission rate
    - Optional: RoomLighting accent color override

  API:
    bridge.ForceSyncNow();
    bridge.SetColorInfluence(0.7f);
    bridge.TriggerPulse(Color.red, 0.5f);
    bridge.GetDebugInfo();

ThemeDebugPanel (Assets/Scripts/Terminal/UI/ThemeDebugPanel.cs):
  Runtime debug UI for visual QA.
  Toggle: F12 (configurable)
  
  Sections:
    - Current State: View/force CristalState
    - Theme Manager: Apply themes, view transition status
    - Arcana: Invoke arcana for testing
    - Visual Effects: Adjust scanlines, glitch, CRT mode
    - Atmosphere Bridge: Sync controls, pulse effects
    - Render Settings: View fog/ambient values
```

---

## Quick Commands

```csharp
// ServiceLocator (preferred over singletons)
var memory = ServiceLocator.Get<CristalMemory>();
var stateMachine = ServiceLocator.TryGet<TerminalStateMachine>();

// TerminalCore
TerminalCore.Instance.ProcessInput("hello");
TerminalCore.Instance.SetState(TerminalState.Waiting);

// CrystalCLI
cli.InjectText("System message", Color.cyan);
cli.ClearTerminal();

// CommandMemory
memory.LogCommand("input");
memory.GetRecentMemories(10);
memory.FormatForAI();

// Prompt System (3D)
var resolver = ServiceLocator.Get<PromptContextResolver>();
var context = resolver.Resolve(interactable, targetTransform);
// context.ActionText, context.KeyText, context.Urgency
```

---

## Editor Menu

```
CRISTAL/
├── Setup 2D Terminal Scene      # Configure 2D terminal scene
├── SVG Export Window            # Export glyphs to SVG
├── Create Terminal Visual Config
├── Floating Prompt/
│   ├── Create Complete Setup    # Prefab + Config + Vocabulary
│   ├── Create Config Only
│   ├── Create Vocabulary
│   ├── Create Prefab Only
│   └── Setup on Player          # Wire everything to PlayerInteraction
├── Start Play Mode
└── Stop Play Mode
```

---

## Troubleshooting

```
TMP no funciona:
  CRISTAL -> Import TMP Now

InputField no responde:
  - Verificar EventSystem existe en escena
  - Verificar TMP_InputField tiene textComponent asignado

Pantalla negra sin UI:
  CRISTAL -> Setup Simple Terminal

Play Mode via MCP no inicia:
  - Usar boton Play manual en Unity
  - O: CRISTAL -> Start Play Mode
```

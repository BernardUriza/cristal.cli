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
├── Dream/
│   └── Room Definition          # Create DreamRoomDefinition asset
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

## Dream Tunnels System (Phase 6.7)

```
Architecture:
  DreamTunnelSystem
  ├── DreamTunnel (runtime instances)
  │   ├── DreamRoom[] (individual rooms)
  │   ├── Narrative fragments
  │   └── Symbol projections
  ├── DreamAIOracle (AI content generation)
  ├── DreamSymbolProjector (procedural symbols)
  ├── DreamMemoryBridge (memory context)
  └── DreamRoomDefinition (ScriptableObject archetypes)

DreamAIOracle (Assets/Scripts/AI/Dreams/DreamAIOracle.cs):
  Generates AI content via Qwen3/Ollama:
  - Room names: Evocative 2-4 word titles
  - Wall inscriptions: Cryptic prophetic text
  - Narrative fragments: Surreal dream messages
  - Symbol descriptions: Geometric imagery prompts

  API:
    oracle.GenerateRoomName(context, onComplete);
    oracle.GenerateWallInscription(context, onComplete);
    oracle.GenerateNarrativeFragment(context, onComplete);
    oracle.GenerateSymbolDescription(context, onComplete);

  Fallbacks:
    If Ollama unavailable, uses procedural fallback generation

DreamSymbolProjector (Assets/Scripts/VFX/DreamSymbolProjector.cs):
  Projects procedural symbols onto dream surfaces:
  - Eye, Spiral, Mirror, Key, Hourglass, Moon, Star, Ouroboros
  - Animated reveal with glow pulse
  - Mapped to arcana (e.g., Moon -> Moon symbol)

  API:
    projector.ProjectSymbol(definition, position, rotation);
    projector.ProjectOnRandomWall(definition, roomBounds);
    projector.GenerateSymbolTexture(SymbolType.Eye, 256);

DreamMemoryBridge (Assets/Scripts/Memory/DreamMemoryBridge.cs):
  Exposes memory to AI systems:
  - BuildDreamContext() -> DreamContext for prompts
  - GetEmotionalProfile() -> emotion summary
  - GetJourneySummary() -> narrative context
  - Records dream entries/exits for persistence

  Dream-specific tracking:
    - Total dreams entered
    - Total dream time
    - Symbol encounter frequency
    - Inscription history

DreamRoomDefinition (Assets/Scripts/Labyrinth/Dream/DreamRoomDefinition.cs):
  ScriptableObject archetype for dream rooms:
  - Visual: colors, fog, light, particles
  - Geometry: shape (Corridor, Chamber, Spiral, Void, etc.)
  - Symbols: primary/secondary symbols, density
  - Narrative: fallback inscriptions/narratives
  - Audio: ambient loop, entry/exit stingers
  - Triggers: arcana IDs, emotions, corruption threshold

  Create via: CRISTAL > Dream > Room Definition

Dream Triggers:
  - Arcana invocation (Moon, High Priestess, Hanged Man)
  - Emotional threshold (>70% intensity)
  - UNBOUND state (ultimate dream)
  - Manual debug command

Entry Flow:
  1. Trigger detected → CreateDreamFromArcana/Emotion/Unbound
  2. AI generates room name, inscriptions
  3. Symbols projected on walls
  4. Player teleported to dream spawn
  5. Narrative sequence plays
  6. Timer runs until exit condition

Exit Conditions:
  - Time expired
  - Arcana expired
  - Player exits voluntarily
  - Narrative complete
  - Forced (debug)

Glitch Fragment:
  On dream exit, leaves emotional fragment in CLI:
    "// something lingers from the dream..."
```

---

## Symbolic Forge System (Phase 8)

```
Overview:
  Procedural symbol generation system responding to game events.
  Creates visual rituals, arcana glyphs, and ambient symbolism
  that reinforce CRISTAL.cli's occult-terminal aesthetic.

  Use cases:
    - Arcana invocation visuals
    - Corruption manifestation
    - Memory recovery ceremonies
    - UNBOUND ritual sequences
    - AI prompt context enrichment

Architecture:
  ReactiveSystemBus (pub/sub)
       │
       ▼
  SymbolicForge (central system)
       │
       ├── SVGGenerator (procedural engine)
       ├── SymbolicTemplate (configs)
       ├── SymbolicProjection (display)
       └── SymbolicMemoryLog (persistence)
```

### SymbolicTemplate

```
ScriptableObject: Assets/Scripts/Symbolic/SymbolicTemplate.cs

Fields:
  archetype        : SymbolicArchetype (22 Tarot + 8 CRISTAL)
  displayName      : Human-readable name
  description      : Meaning/context for AI prompts
  shapeLanguage    : ShapeLanguage enum (see below)
  
  Visual:
    primaryColor   : Core symbol color
    secondaryColor : Accent/glow color
    glowIntensity  : 0-2 bloom factor
    animationSpeed : Rotation/pulse speed
    complexity     : 1-10 layer count
  
  Projection:
    defaultStyle   : Hologram | Surface | Overlay | Particle
    lifetime       : Duration before fade
    scale          : World-space size
    audioClip      : Optional appearance sound

Create via script:
  SymbolicTemplate.CreateFromArchetype(SymbolicArchetype.TheMoon);
  // Auto-configures appropriate defaults for archetype

Archetypes:
  Tarot (22):
    TheFool, TheMagician, TheHighPriestess, TheEmpress, TheEmperor,
    TheHierophant, TheLovers, TheChariot, Strength, TheHermit,
    WheelOfFortune, Justice, TheHangedMan, Death, Temperance,
    TheDevil, TheTower, TheStar, TheMoon, TheSun, Judgement, TheWorld
  
  CRISTAL (8):
    TheFragment   : Broken memories, partial recovery
    TheEcho       : Recursive patterns, déjà vu
    TheCorruption : System decay, visual noise
    TheMemory     : Recovered context, clarity
    TheUnbound    : Ultimate liberation, transcendence
    TheVoid       : Empty states, null references
    TheGate       : Transitions, thresholds
    TheVision     : AI insight, prophecy
```

### SVGGenerator

```
Engine: Assets/Scripts/Symbolic/SVGGenerator.cs

ShapeLanguages (visual styles):
  Geometric  : Polygons, grids, precise angles
  Circular   : Concentric rings, spirals, mandalas
  Linear     : Rays, lines, crosshatch patterns
  Organic    : Curves, waves, flowing forms
  Fractal    : Self-similar recursive patterns
  Glitch     : Digital corruption, noise bars
  Sacred     : Flower of Life, Metatron's Cube
  Runic      : Ancient symbols, Nordic/Celtic forms

API:
  // From template
  string svg = SVGGenerator.Generate(template, seed);
  
  // From event (auto-selects template)
  GeneratedSymbol symbol = SVGGenerator.GenerateFromEvent(in evt);
  
  // Quick generation
  string svg = SVGGenerator.GenerateQuick(
    SymbolicArchetype.TheMoon,
    ShapeLanguage.Circular,
    Color.cyan
  );

Features:
  - Deterministic: same seed → same output
  - CSS animations: rotation, pulse, glow
  - SVG filters: gaussian blur, glow, noise
  - Gradients: radial/linear with archetype colors
  - Layered complexity: 1-10 nested elements

Shape generators:
  GeneratePolygon()         : N-sided regular polygons
  GenerateConcentricCircles(): Nested rings
  GenerateSpiralPath()      : Logarithmic spirals
  GenerateFlowerOfLife()    : Sacred geometry pattern
  GenerateGlitchPattern()   : Corruption rectangles
  GenerateRunicSymbol()     : Abstract runic forms
  GenerateWavePattern()     : Organic sine waves
  GenerateFractalTree()     : Recursive branching
```

### SymbolicProjection

```
Component: Assets/Scripts/Symbolic/SymbolicProjection.cs

Projection Styles:
  Hologram  : Floating 3D with shader effects
  Surface   : Projected onto world geometry
  Overlay   : UI-space fullscreen
  Particle  : Dissolves into particle system

API:
  projection.Project(
    GeneratedSymbol symbol,
    float duration = 3f,
    ProjectionStyle style = ProjectionStyle.Hologram
  );

Features:
  - Fade in/out with configurable curves
  - Camera-facing billboards (Hologram mode)
  - Floating animation with sine offset
  - Optional audio on appear/disappear
  - Procedural texture from archetype

Integration:
  // Subscribe to forge events
  SymbolicForge.Instance.OnSymbolGenerated += (symbol) => {
    projection.Project(symbol);
  };

Procedural textures:
  DrawPolygon()      : Fill convex shapes
  DrawCircle()       : Filled/outlined circles
  DrawGlitchPattern(): Corruption scanlines
  DrawFlowerPattern(): Sacred geometry fill
```

### SymbolicMemoryLog

```
Component: Assets/Scripts/Symbolic/SymbolicMemoryLog.cs

Purpose:
  Tracks all generated symbols for:
  - Debugging and QA
  - Ritual progression (thresholds)
  - AI context (symbol history)
  - Analytics

Persistence:
  File: [PersistentDataPath]/symbolic_log.json
  Auto-save on pause/quit
  Max entries: 500 (configurable)

Entry fields:
  symbolId     : Unique 8-char hex
  archetype    : SymbolicArchetype
  sourceSignal : SymbolicSignalType
  sourceState  : CristalState
  intensity    : 0-100
  timestamp    : Time.time
  source       : System that triggered
  svgHash      : Content fingerprint

Thresholds (trigger events):
  TheCorruption : 5 → RitualProgress event
  TheEcho       : 7 → RitualProgress event
  TheMemory     : 10 → RitualProgress event
  Death         : 3 → RitualProgress event
  TheMoon       : 3 → RitualProgress event
  TheDevil      : 3 → RitualProgress event

Query API:
  log.GetArchetypeCount(SymbolicArchetype.TheMoon);
  log.GetEntriesBySignal(SymbolicSignalType.ArcanaInvoked, 10);
  log.GetEntriesInTimeRange(startTime, endTime);
  log.HasSeenArchetype(SymbolicArchetype.TheUnbound);
  log.ExportToString();  // Debug dump

Events:
  OnEntryLogged(SymbolicLogEntry entry)
  OnArchetypeThreshold(SymbolicArchetype, int count)
```

### Integration with ReactiveSystemBus

```
SymbolicForge subscribes to:
  - ArcanaInvoked      → Generate arcana symbol
  - MemoryRecovered    → Generate memory symbol
  - CorruptionSpike    → Generate corruption symbol
  - UnboundTriggered   → Generate unbound ritual
  - VisionUnlocked     → Generate vision symbol
  - RitualProgress     → Chain symbol generation
  - GlitchTriggered    → Quick glitch symbol

SymbolicForge publishes:
  - SymbolicUnlocked   → When new archetype first seen
  - ProjectionTriggered→ When symbol displayed

Example flow:
  1. ArcanaSystem invokes Moon
  2. ReactiveSystemBus.Publish(ArcanaInvoked, archetype: TheMoon)
  3. SymbolicForge.OnSymbolicEvent() receives
  4. SVGGenerator.GenerateFromEvent() creates SVG
  5. SymbolicProjection.Project() displays hologram
  6. SymbolicMemoryLog.LogSymbol() records entry
  7. If threshold met → RitualProgress published
```

### How to Extend

```csharp
// Add new archetype (SymbolicArchetype enum)
public enum SymbolicArchetype
{
    // ... existing ...
    TheNewArchetype = 30,
}

// Configure in SVGGenerator.GetDefaultTemplate()
case SymbolicArchetype.TheNewArchetype:
    return new SymbolicTemplate {
        shapeLanguage = ShapeLanguage.Sacred,
        primaryColor = new Color(0.8f, 0.2f, 1f),
        complexity = 7
    };

// Add new ShapeLanguage
public enum ShapeLanguage
{
    // ... existing ...
    NewStyle = 8,
}

// Implement generator in SVGGenerator
private static string GenerateNewStyleShape(int sides, float size, int seed)
{
    // Return SVG path/shape string
}

// Associate symbol with narrative event
ReactiveSystemBus.Subscribe(SymbolicSignalType.CustomEvent, evt => {
    var symbol = SVGGenerator.GenerateFromEvent(in evt);
    var forge = ServiceLocator.Get<SymbolicForge>();
    forge.ProjectSymbol(symbol);
});
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

Dream no genera contenido AI:
  - Verificar Ollama running: http://localhost:11434
  - Verificar modelo: qwen3:8b
  - Fallback procedural activo si AI falla
```

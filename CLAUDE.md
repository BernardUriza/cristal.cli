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
┌─────────────────────────────────────────┐
│          CrystalCLI (UI Layer)          │
│  - TMP_InputField, TextMeshProUGUI      │
│  - Typewriter effect, visual feedback   │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        TerminalCore (Engine)            │
│  - Input processing                     │
│  - Response generation                  │
│  - State management                     │
│  - Future: AI integration (IAIProvider) │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       CommandMemory (Persistence)       │
│  - Input history log                    │
│  - Keyword extraction                   │
│  - Emotional weight analysis            │
│  - AI context formatting                │
└─────────────────────────────────────────┘
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

## Quick Commands

```csharp
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

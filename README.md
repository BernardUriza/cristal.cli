# CRISTAL.CLI

Unity 6 narrative terminal game where the CLI interface is the core gameplay mechanic.

## Overview

CRISTAL is a narrative interface, not an operating system. Its purpose is to provoke the player to write what they *feel*, not what they *know*.

## Features

- **Dual Mode Gameplay**
  - `CrystalCLI.unity` - 2D Terminal (demo/testing)
  - `Labyrinth.unity` - 3D explorable world (main scene)

- **Tarot-Based Arcana System** - 22 Major Arcana + 8 CRISTAL archetypes

- **Procedural Symbol Generation** - SVG-based symbols responding to game events

- **AI-Powered Dream Tunnels** - Dynamic content via Qwen3/Ollama

- **Ritual Progression System** - Multi-step ceremonial sequences

- **In-World Console Integration** - 3D interactive terminals in the labyrinth

## Tech Stack

- **Engine**: Unity 6 (6000.3.2f1)
- **Render Pipeline**: URP (Universal Render Pipeline)
- **UI**: TextMesh Pro
- **AI**: Ollama (Qwen3:8b) for dynamic content
- **Integration**: MCP Unity

## Visual Aesthetic

- Pure black background
- Green/cyan terminal text
- Minimal glitch effects
- CRT shader with scanlines
- Blinking cursor

## Project Structure

```
cristal.cli/
├── Assets/
│   ├── Scripts/
│   │   ├── Terminal/      # Core CLI system
│   │   ├── Labyrinth/     # 3D world systems
│   │   ├── Symbolic/      # Symbol generation
│   │   ├── Ritual/        # Ritual system
│   │   └── AI/            # AI integration
│   ├── Scenes/
│   ├── Prefabs/
│   └── Shaders/
├── Packages/
└── ProjectSettings/
```

## Author

Bernard Uriza Orozco

## License

All rights reserved.

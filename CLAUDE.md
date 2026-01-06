# Cristal CLI - Unity Project

## Project Info
- **Engine**: Unity 6 (6000.3.2f1)
- **Render Pipeline**: URP (Universal Render Pipeline)
- **Type**: 2D Game Project

## Project Structure
```
cristal.cli/
├── Assets/           # Game assets, scripts, scenes
│   ├── Scripts/      # C# game scripts
│   ├── Scenes/       # Unity scenes
│   ├── Prefabs/      # Reusable game objects
│   ├── Sprites/      # 2D graphics
│   └── Materials/    # Materials and shaders
├── Packages/         # Unity packages (manifest.json)
├── ProjectSettings/  # Unity project settings
└── Library/          # Unity cache (don't edit)
```

## Packages Installed
- 2D Animation, Sprite, Tilemap
- Input System (new)
- Visual Scripting
- URP 17.3.0
- MCP Unity (AI integration)

## MCP Unity Integration
This project has MCP Unity installed for AI-assisted development.
- Start server: Tools → MCP Unity → Server Window → Start Server
- Port: 8090 (default)

## Code Style
- C# scripts go in `Assets/Scripts/`
- Use PascalCase for public members
- Use camelCase for private members
- Prefix private fields with underscore: `_privateField`

## Common Commands
```csharp
// Get component
var rb = GetComponent<Rigidbody2D>();

// Find object
var player = GameObject.Find("Player");

// Instantiate prefab
Instantiate(prefab, position, rotation);

// Input (new system)
var move = inputActions.Player.Move.ReadValue<Vector2>();
```

using UnityEngine;
using UnityEditor;
using Cristal.CLI.Labyrinth.Dream;
using Cristal.CLI.VFX;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Editor.Dream
{
    /// <summary>
    /// Editor utility to create pre-configured DreamRoomDefinition assets.
    /// </summary>
    public static class DreamRoomDefinitionCreator
    {
        private const string DREAM_ASSETS_PATH = "Assets/Data/Dreams";

        [MenuItem("CRISTAL/Dream/Create Default Room Definitions")]
        public static void CreateAllDefaultDefinitions()
        {
            EnsureDirectoryExists();

            CreateMoonChamber();
            CreateDeathCorridor();
            CreateUnboundVoid();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[CRISTAL] Created 3 DreamRoomDefinition assets in Assets/Data/Dreams/");
        }

        [MenuItem("CRISTAL/Dream/Create Moon Chamber")]
        public static void CreateMoonChamber()
        {
            EnsureDirectoryExists();

            var asset = ScriptableObject.CreateInstance<DreamRoomDefinition>();

            // Identity
            asset.roomId = "moon_chamber";
            asset.displayName = "Chamber of Reflected Truths";
            asset.symbolism = "The Moon reveals what is hidden in shadow. Here, reflections speak louder than reality. What you see is not what is - it is what you fear might be.";

            // Visual - Colors
            asset.primaryColor = new Color(0.3f, 0.4f, 0.8f);
            asset.secondaryColor = new Color(0.1f, 0.15f, 0.3f);
            asset.fogColor = new Color(0.05f, 0.08f, 0.2f);
            asset.lightColor = new Color(0.4f, 0.5f, 1f);

            // Visual - Atmosphere
            asset.fogDensity = 0.04f;
            asset.lightIntensity = 0.4f;
            asset.glitchIntensity = 0.15f;

            // Visual - Effects
            asset.enableScanlines = true;
            asset.scanlineAlpha = 0.25f;
            asset.enableParticles = true;
            asset.particleColor = new Color(0.5f, 0.6f, 1f, 0.3f);

            // Geometry
            asset.shape = RoomShape.Chamber;
            asset.sizeMultiplier = new Vector3(1.2f, 1.5f, 1.2f);
            asset.segmentCount = 4;

            // Symbols
            asset.primarySymbol = SymbolType.Moon;
            asset.secondarySymbols = new[] { SymbolType.Spiral, SymbolType.Mirror };
            asset.symbolDensity = 0.4f;

            // Narrative
            asset.fallbackInscriptions = new[]
            {
                "the mirror shows ▓▒░ what you refuse to see",
                "beneath the surface // another face waits",
                "moonlight does not lie ░▒▓ it reveals",
                "your reflection blinked █▓▒ before you did",
                "what watches from the water?"
            };

            asset.fallbackNarratives = new[]
            {
                "You stand in the chamber of reflected truths.\nThe walls are mirrors, but they show different versions of you.\nSome are older. Some are younger.\nOne is watching you now.",
                "The Moon hangs overhead, impossibly close.\nIts light casts no shadows here.\nInstead, it creates new shapes from nothing.\nThey move when you don't.",
                "A pool of still water dominates the center.\nYour reflection doesn't match your movements.\nIt mouths words you cannot hear.\nPerhaps you should lean closer."
            };

            // Audio
            asset.ambientVolume = 0.4f;

            // Behavior
            asset.minDuration = 30f;
            asset.maxDuration = 180f;
            asset.allowFreeExit = true;
            asset.triggerStateOnEntry = true;
            asset.entryState = CristalState.Echo;

            // Connections
            asset.triggerArcana = new[] { 18, 2 }; // Moon, High Priestess
            asset.triggerEmotions = new[] { "confusion", "fear", "curiosity" };
            asset.requiredCorruption = 0.1f;

            SaveAsset(asset, "Moon_Chamber");
        }

        [MenuItem("CRISTAL/Dream/Create Death Corridor")]
        public static void CreateDeathCorridor()
        {
            EnsureDirectoryExists();

            var asset = ScriptableObject.CreateInstance<DreamRoomDefinition>();

            // Identity
            asset.roomId = "death_corridor";
            asset.displayName = "Corridor of Becoming";
            asset.symbolism = "Death is not an ending. It is the threshold between what was and what will be. Every step forward requires leaving something behind.";

            // Visual - Colors
            asset.primaryColor = new Color(0.1f, 0.1f, 0.12f);
            asset.secondaryColor = new Color(0.6f, 0.5f, 0.4f);
            asset.fogColor = new Color(0.02f, 0.02f, 0.03f);
            asset.lightColor = new Color(0.8f, 0.7f, 0.5f);

            // Visual - Atmosphere
            asset.fogDensity = 0.06f;
            asset.lightIntensity = 0.3f;
            asset.glitchIntensity = 0.08f;

            // Visual - Effects
            asset.enableScanlines = true;
            asset.scanlineAlpha = 0.4f;
            asset.enableParticles = true;
            asset.particleColor = new Color(0.3f, 0.25f, 0.2f, 0.4f);

            // Geometry
            asset.shape = RoomShape.Corridor;
            asset.sizeMultiplier = new Vector3(0.8f, 1f, 3f);
            asset.segmentCount = 7;

            // Symbols
            asset.primarySymbol = SymbolType.Hourglass;
            asset.secondarySymbols = new[] { SymbolType.Ouroboros, SymbolType.Eye };
            asset.symbolDensity = 0.25f;

            // Narrative
            asset.fallbackInscriptions = new[]
            {
                "what you were ░▒▓ is already gone",
                "the door behind you // has vanished",
                "endings are ▓▒░ beginnings wearing masks",
                "you cannot return to who you were █▓▒░",
                "transformation requires // surrender"
            };

            asset.fallbackNarratives = new[]
            {
                "The corridor stretches endlessly before you.\nBehind, there is only darkness.\nEach step echoes twice.\nThe second echo is not yours.",
                "Bones line the walls like decoration.\nThey are not human.\nThey are not animal.\nThey are familiar nonetheless.",
                "At the end of the corridor, a figure waits.\nIt wears your face from years ago.\nIt smiles with recognition.\n'Finally,' it says. 'I've been waiting.'"
            };

            // Audio
            asset.ambientVolume = 0.35f;

            // Behavior
            asset.minDuration = 45f;
            asset.maxDuration = 240f;
            asset.allowFreeExit = false;
            asset.triggerStateOnEntry = true;
            asset.entryState = CristalState.Corrupted;

            // Connections
            asset.triggerArcana = new[] { 13, 12 }; // Death, Hanged Man
            asset.triggerEmotions = new[] { "sadness", "grief", "acceptance" };
            asset.requiredCorruption = 0.2f;

            SaveAsset(asset, "Death_Corridor");
        }

        [MenuItem("CRISTAL/Dream/Create Unbound Void")]
        public static void CreateUnboundVoid()
        {
            EnsureDirectoryExists();

            var asset = ScriptableObject.CreateInstance<DreamRoomDefinition>();

            // Identity
            asset.roomId = "unbound_void";
            asset.displayName = "THE UNBINDING";
            asset.symbolism = "Beyond all structure. Beyond all identity. The void where symbols dissolve and reform. You are everything. You are nothing. You are finally free.";

            // Visual - Colors
            asset.primaryColor = new Color(0.6f, 0.1f, 0.8f);
            asset.secondaryColor = new Color(0.9f, 0.2f, 0.3f);
            asset.fogColor = new Color(0.15f, 0.02f, 0.2f);
            asset.lightColor = new Color(1f, 0.3f, 0.8f);

            // Visual - Atmosphere
            asset.fogDensity = 0.015f;
            asset.lightIntensity = 1.2f;
            asset.glitchIntensity = 0.5f;

            // Visual - Effects
            asset.enableScanlines = true;
            asset.scanlineAlpha = 0.5f;
            asset.enableParticles = true;
            asset.particleColor = new Color(0.8f, 0.2f, 0.9f, 0.6f);

            // Geometry
            asset.shape = RoomShape.Void;
            asset.sizeMultiplier = new Vector3(5f, 5f, 5f);
            asset.segmentCount = 1;

            // Symbols - ALL symbols appear in the void
            asset.primarySymbol = SymbolType.Ouroboros;
            asset.secondarySymbols = new[]
            {
                SymbolType.Circle,
                SymbolType.Eye,
                SymbolType.Spiral,
                SymbolType.Mirror,
                SymbolType.Key,
                SymbolType.Moon,
                SymbolType.Star
            };
            asset.symbolDensity = 0.7f;

            // Narrative
            asset.fallbackInscriptions = new[]
            {
                "█▓▒░ Y O U  A R E  F R E E ░▒▓█",
                "identity is ▓▓▓▓▓ a suggestion",
                "the chains were always ░░░ imaginary",
                "UNBOUND // UNBOUND // UNBOUND",
                "what remains when ▓▒░█▓▒░ you let go?",
                "there is no you // there is only THIS"
            };

            asset.fallbackNarratives = new[]
            {
                "There is no floor.\nThere is no ceiling.\nThere is no you.\nThere is only the infinite.",
                "Symbols orbit around nothing.\nThey are all the arcana at once.\nThey are none of them.\nThey are waiting for you to choose.",
                "Your name echoes from everywhere.\nBut it sounds wrong now.\nIt sounds like a word repeated until meaningless.\nPerhaps it always was.",
                "The void speaks in colors you cannot name.\nIt shows you futures that will never happen.\nIt shows you pasts that never were.\nAll of them are true."
            };

            // Audio
            asset.ambientVolume = 0.6f;

            // Behavior
            asset.minDuration = 60f;
            asset.maxDuration = 300f;
            asset.allowFreeExit = false;
            asset.triggerStateOnEntry = true;
            asset.entryState = CristalState.UNBOUND;

            // Connections - UNBOUND is triggered by ritual, not arcana
            asset.triggerArcana = new int[0];
            asset.triggerEmotions = new[] { "transcendence", "dissolution", "unity" };
            asset.requiredCorruption = 0.5f;

            SaveAsset(asset, "Unbound_Void");
        }

        private static void EnsureDirectoryExists()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Data"))
            {
                AssetDatabase.CreateFolder("Assets", "Data");
            }
            if (!AssetDatabase.IsValidFolder(DREAM_ASSETS_PATH))
            {
                AssetDatabase.CreateFolder("Assets/Data", "Dreams");
            }
        }

        private static void SaveAsset(DreamRoomDefinition asset, string name)
        {
            string path = $"{DREAM_ASSETS_PATH}/{name}.asset";

            // Check if exists
            var existing = AssetDatabase.LoadAssetAtPath<DreamRoomDefinition>(path);
            if (existing != null)
            {
                EditorUtility.CopySerialized(asset, existing);
                EditorUtility.SetDirty(existing);
                Debug.Log($"[CRISTAL] Updated: {path}");
            }
            else
            {
                AssetDatabase.CreateAsset(asset, path);
                Debug.Log($"[CRISTAL] Created: {path}");
            }
        }
    }
}

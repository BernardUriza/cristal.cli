using System;
using UnityEngine;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.AI.Dreams
{
    /// <summary>
    /// Types of dream content that can be generated.
    /// </summary>
    public enum DreamContentType
    {
        Inscription,
        Narrative,
        Symbol,
        Whisper,
        Vision,
        RoomName,
        WallInscription,
        NarrativeFragment
    }

    /// <summary>
    /// Context for dream generation requests.
    /// </summary>
    [Serializable]
    public class DreamContext
    {
        public string Theme { get; set; }
        public string DreamTheme { get; set; }
        public float Intensity { get; set; }
        public string[] Keywords { get; set; }
        public ArcanaDefinition ActiveArcana { get; set; }
    }
}

namespace Cristal.CLI.Labyrinth.Dream
{
    /// <summary>
    /// Symbol types for dream rooms.
    /// </summary>
    public enum SymbolType
    {
        Eye,
        Moon,
        Star,
        Gate,
        Mirror,
        Spiral,
        Triangle,
        Circle,
        Fragment,
        Void
    }

    /// <summary>
    /// Definition for a symbol placement in dreams.
    /// </summary>
    [Serializable]
    public class SymbolDefinition
    {
        public SymbolType type;
        public Vector3 position;
        public Quaternion rotation;
        public float scale = 1f;
        public Color color = Color.white;
        public Color glowColor = new Color(0.5f, 0.3f, 0.8f);
        public bool animated = false;

        /// <summary>
        /// Create a symbol definition based on an arcana ID.
        /// </summary>
        public static SymbolDefinition FromArcana(int arcanaId)
        {
            // Map arcana to symbol types
            SymbolType symbolType = arcanaId switch
            {
                18 => SymbolType.Moon,      // The Moon
                17 => SymbolType.Star,      // The Star
                2 => SymbolType.Mirror,     // High Priestess
                12 => SymbolType.Spiral,    // Hanged Man
                13 => SymbolType.Void,      // Death
                15 => SymbolType.Triangle,  // The Devil
                16 => SymbolType.Fragment,  // The Tower
                0 => SymbolType.Circle,     // The Fool
                _ => (SymbolType)(arcanaId % 10)
            };

            // Default colors based on symbol type
            Color primaryColor = symbolType switch
            {
                SymbolType.Moon => new Color(0.7f, 0.8f, 1f),
                SymbolType.Star => new Color(1f, 0.95f, 0.7f),
                SymbolType.Eye => new Color(0.9f, 0.4f, 0.4f),
                SymbolType.Mirror => new Color(0.6f, 0.8f, 0.9f),
                SymbolType.Spiral => new Color(0.6f, 0.4f, 0.8f),
                SymbolType.Gate => new Color(0.4f, 0.3f, 0.5f),
                SymbolType.Void => new Color(0.1f, 0.1f, 0.15f),
                SymbolType.Fragment => new Color(0.8f, 0.3f, 0.2f),
                SymbolType.Triangle => new Color(0.9f, 0.2f, 0.3f),
                SymbolType.Circle => new Color(0.9f, 0.9f, 0.9f),
                _ => Color.white
            };

            Color glowColor = symbolType switch
            {
                SymbolType.Moon => new Color(0.4f, 0.5f, 0.9f),
                SymbolType.Star => new Color(1f, 0.9f, 0.5f),
                SymbolType.Eye => new Color(0.8f, 0.2f, 0.2f),
                SymbolType.Void => new Color(0.3f, 0.1f, 0.4f),
                _ => new Color(0.5f, 0.3f, 0.8f)
            };

            return new SymbolDefinition
            {
                type = symbolType,
                color = primaryColor,
                glowColor = glowColor,
                scale = 1f,
                animated = symbolType == SymbolType.Eye || symbolType == SymbolType.Spiral
            };
        }
    }
}

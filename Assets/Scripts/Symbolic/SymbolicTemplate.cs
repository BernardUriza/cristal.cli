using System;
using UnityEngine;

namespace Cristal.CLI.Symbolic
{
    /// <summary>
    /// Archetypal shape language for symbolic generation.
    /// </summary>
    public enum ShapeLanguage
    {
        Geometric,      // Triangles, squares, hexagons
        Circular,       // Circles, arcs, spirals
        Linear,         // Lines, rays, grids
        Organic,        // Flowing curves, waves
        Fractal,        // Recursive, self-similar
        Glitch,         // Broken, distorted, fragmented
        Sacred,         // Vesica piscis, flower of life, mandalas
        Runic           // Angular, symbolic, ancient
    }

    /// <summary>
    /// Visual style for SVG rendering.
    /// </summary>
    public enum SymbolStyle
    {
        Monoline,       // Single stroke weight
        Filled,         // Solid shapes
        Outlined,       // Stroke only
        Gradient,       // Gradient fills
        Dashed,         // Dashed/dotted lines
        Layered,        // Multiple overlapping elements
        Animated        // With CSS animations
    }

    /// <summary>
    /// Symbolic archetype categories.
    /// </summary>
    public enum SymbolicArchetype
    {
        // Tarot Major Arcana
        TheFool,
        TheMagician,
        TheHighPriestess,
        TheEmpress,
        TheEmperor,
        TheHierophant,
        TheLovers,
        TheChariot,
        Strength,
        TheHermit,
        WheelOfFortune,
        Justice,
        TheHangedMan,
        Death,
        Temperance,
        TheDevil,
        TheTower,
        TheStar,
        TheMoon,
        TheSun,
        Judgement,
        TheWorld,

        // CRISTAL-specific
        TheFragment,
        TheEcho,
        TheCorruption,
        TheMemory,
        TheUnbound,
        TheVoid,
        TheGate,
        TheVision
    }

    /// <summary>
    /// Template definition for a single symbolic element.
    /// </summary>
    [Serializable]
    public class SymbolicElementTemplate
    {
        public string name;
        public ShapeLanguage primaryShape;
        public ShapeLanguage secondaryShape;
        public SymbolStyle style;
        [Range(1, 10)]
        public int complexity = 3;
        [Range(0f, 1f)]
        public float symmetry = 1f;
        public bool animated;
        public float animationDuration = 2f;

        [Header("SVG Properties")]
        public string strokeColor = "#99FF99";
        public string fillColor = "none";
        [Range(0.5f, 5f)]
        public float strokeWidth = 1.5f;
        [Range(0f, 1f)]
        public float opacity = 1f;

        [Header("Geometry")]
        [Range(3, 12)]
        public int sides = 6;
        [Range(1, 8)]
        public int layers = 3;
        [Range(0f, 360f)]
        public float rotationOffset = 0f;
        [Range(0.1f, 1f)]
        public float innerRadius = 0.3f;
    }

    /// <summary>
    /// ScriptableObject containing symbolic templates for procedural generation.
    /// Each archetype maps to visual parameters for SVG synthesis.
    /// </summary>
    [CreateAssetMenu(fileName = "SymbolicTemplate", menuName = "CRISTAL/Symbolic/Template")]
    public class SymbolicTemplate : ScriptableObject
    {
        [Header("Identity")]
        public string templateName = "Default";
        public SymbolicArchetype archetype = SymbolicArchetype.TheFragment;

        [Header("Color Palette")]
        public Color primaryColor = new Color(0.6f, 1f, 0.6f);
        public Color secondaryColor = new Color(0.4f, 0.8f, 1f);
        public Color accentColor = new Color(1f, 0.6f, 0.8f);
        public Color backgroundColor = Color.black;

        [Header("Main Element")]
        public SymbolicElementTemplate mainElement = new()
        {
            name = "Core",
            primaryShape = ShapeLanguage.Geometric,
            secondaryShape = ShapeLanguage.Circular,
            style = SymbolStyle.Monoline,
            complexity = 3,
            symmetry = 1f
        };

        [Header("Decorative Elements")]
        public SymbolicElementTemplate[] decorativeElements;

        [Header("Generation Rules")]
        [Range(1, 5)]
        public int minElements = 1;
        [Range(1, 10)]
        public int maxElements = 5;
        [Range(0f, 1f)]
        public float chaosLevel = 0.2f;
        public bool allowMirroring = true;
        public bool allowRotation = true;

        [Header("Animation")]
        public bool enableAnimation = false;
        public float pulseSpeed = 1f;
        public float rotationSpeed = 0f;
        public float glitchProbability = 0f;

        /// <summary>
        /// Get color as hex string for SVG.
        /// </summary>
        public string PrimaryHex => ColorToHex(primaryColor);
        public string SecondaryHex => ColorToHex(secondaryColor);
        public string AccentHex => ColorToHex(accentColor);
        public string BackgroundHex => ColorToHex(backgroundColor);

        private string ColorToHex(Color c)
        {
            return $"#{ColorUtility.ToHtmlStringRGB(c)}";
        }

        /// <summary>
        /// Create a template from an archetype with sensible defaults.
        /// </summary>
        public static SymbolicTemplate CreateFromArchetype(SymbolicArchetype archetype)
        {
            var template = CreateInstance<SymbolicTemplate>();
            template.archetype = archetype;
            template.templateName = archetype.ToString();

            // Configure based on archetype
            switch (archetype)
            {
                case SymbolicArchetype.TheMoon:
                    template.primaryColor = new Color(0.6f, 0.2f, 1f);
                    template.secondaryColor = new Color(0.8f, 0.6f, 1f);
                    template.mainElement.primaryShape = ShapeLanguage.Circular;
                    template.mainElement.secondaryShape = ShapeLanguage.Organic;
                    template.mainElement.layers = 5;
                    template.chaosLevel = 0.3f;
                    break;

                case SymbolicArchetype.Death:
                    template.primaryColor = new Color(0.8f, 0.1f, 0.2f);
                    template.secondaryColor = Color.black;
                    template.mainElement.primaryShape = ShapeLanguage.Geometric;
                    template.mainElement.sides = 8;
                    template.mainElement.layers = 4;
                    template.chaosLevel = 0.1f;
                    break;

                case SymbolicArchetype.TheDevil:
                    template.primaryColor = new Color(1f, 0.3f, 0f);
                    template.secondaryColor = new Color(0.6f, 0f, 0f);
                    template.mainElement.primaryShape = ShapeLanguage.Geometric;
                    template.mainElement.secondaryShape = ShapeLanguage.Linear;
                    template.mainElement.sides = 5;
                    template.chaosLevel = 0.4f;
                    break;

                case SymbolicArchetype.TheCorruption:
                    template.primaryColor = new Color(1f, 0.2f, 0.3f);
                    template.mainElement.primaryShape = ShapeLanguage.Glitch;
                    template.mainElement.style = SymbolStyle.Dashed;
                    template.chaosLevel = 0.8f;
                    template.enableAnimation = true;
                    template.glitchProbability = 0.5f;
                    break;

                case SymbolicArchetype.TheEcho:
                    template.primaryColor = new Color(0.5f, 0.5f, 0.6f);
                    template.mainElement.primaryShape = ShapeLanguage.Circular;
                    template.mainElement.layers = 7;
                    template.mainElement.opacity = 0.6f;
                    template.enableAnimation = true;
                    template.pulseSpeed = 0.5f;
                    break;

                case SymbolicArchetype.TheMemory:
                    template.primaryColor = new Color(0.4f, 0.8f, 1f);
                    template.mainElement.primaryShape = ShapeLanguage.Fractal;
                    template.mainElement.complexity = 5;
                    break;

                case SymbolicArchetype.TheUnbound:
                    template.primaryColor = new Color(1f, 0f, 1f);
                    template.secondaryColor = new Color(0f, 1f, 1f);
                    template.mainElement.primaryShape = ShapeLanguage.Sacred;
                    template.mainElement.secondaryShape = ShapeLanguage.Fractal;
                    template.mainElement.layers = 8;
                    template.chaosLevel = 0.5f;
                    template.enableAnimation = true;
                    break;

                case SymbolicArchetype.TheVoid:
                    template.primaryColor = new Color(0.1f, 0.1f, 0.15f);
                    template.secondaryColor = Color.black;
                    template.mainElement.primaryShape = ShapeLanguage.Circular;
                    template.mainElement.style = SymbolStyle.Gradient;
                    template.mainElement.innerRadius = 0.1f;
                    break;

                case SymbolicArchetype.TheGate:
                    template.primaryColor = new Color(0.8f, 0.6f, 0.2f);
                    template.mainElement.primaryShape = ShapeLanguage.Geometric;
                    template.mainElement.sides = 4;
                    template.mainElement.layers = 3;
                    template.allowRotation = false;
                    break;

                case SymbolicArchetype.TheVision:
                    template.primaryColor = new Color(1f, 1f, 0.6f);
                    template.mainElement.primaryShape = ShapeLanguage.Organic;
                    template.mainElement.style = SymbolStyle.Layered;
                    template.mainElement.complexity = 4;
                    template.enableAnimation = true;
                    break;

                default:
                    // Default green terminal aesthetic
                    template.primaryColor = new Color(0.6f, 1f, 0.6f);
                    template.mainElement.primaryShape = ShapeLanguage.Geometric;
                    break;
            }

            return template;
        }
    }

    /// <summary>
    /// Represents a recurring symbolic pattern identified across dreams.
    /// Used by the dream analysis systems to track thematic connections.
    /// </summary>
    [Serializable]
    public class SymbolicPattern
    {
        public string PatternId;
        public string Description;
        public System.Collections.Generic.List<string> InvolvedSymbols = new System.Collections.Generic.List<string>();
        public float Strength;
        public int OccurrenceCount;
        public DateTime FirstSeen;
        public DateTime LastSeen;

        public SymbolicPattern() { }

        public SymbolicPattern(string id, string description)
        {
            PatternId = id;
            Description = description;
            FirstSeen = DateTime.Now;
            LastSeen = DateTime.Now;
        }
    }
}

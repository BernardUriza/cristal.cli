using System;
using System.Text;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Core.Events;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Symbolic
{
    /// <summary>
    /// Result of SVG generation.
    /// </summary>
    public class GeneratedSymbol
    {
        public string SvgContent { get; set; }
        public SymbolicArchetype Archetype { get; set; }
        public SymbolicSignalType SourceSignal { get; set; }
        public CristalState SourceState { get; set; }
        public float Timestamp { get; set; }
        public int Width { get; set; } = 512;
        public int Height { get; set; } = 512;
        public Dictionary<string, object> Metadata { get; set; } = new();

        public override string ToString()
        {
            return $"[Symbol:{Archetype}] {Width}x{Height} from {SourceSignal}@{SourceState}";
        }
    }

    /// <summary>
    /// Procedural SVG generator for symbolic content.
    /// Creates minimalistic, archetypal SVG symbols based on templates and events.
    /// </summary>
    public static class SVGGenerator
    {
        private const int DEFAULT_SIZE = 512;
        private const float CENTER = 256f;
        private const float MAX_RADIUS = 200f;

        // Cached random for deterministic generation with seeds
        private static System.Random _random = new();

        #region Public API

        /// <summary>
        /// Generate an SVG symbol from a template.
        /// </summary>
        public static GeneratedSymbol Generate(SymbolicTemplate template, int? seed = null)
        {
            if (seed.HasValue)
            {
                _random = new System.Random(seed.Value);
            }

            var sb = new StringBuilder();
            sb.AppendLine(GenerateSvgHeader(DEFAULT_SIZE, DEFAULT_SIZE, template.BackgroundHex));

            // Add definitions (gradients, filters)
            sb.AppendLine(GenerateDefinitions(template));

            // Generate main element
            sb.AppendLine(GenerateElement(template.mainElement, template, CENTER, CENTER, MAX_RADIUS));

            // Generate decorative elements
            if (template.decorativeElements != null)
            {
                foreach (var element in template.decorativeElements)
                {
                    float offsetX = ((float)_random.NextDouble() - 0.5f) * 100f * template.chaosLevel;
                    float offsetY = ((float)_random.NextDouble() - 0.5f) * 100f * template.chaosLevel;
                    float scale = 0.3f + (float)_random.NextDouble() * 0.4f;

                    sb.AppendLine(GenerateElement(element, template, CENTER + offsetX, CENTER + offsetY, MAX_RADIUS * scale));
                }
            }

            // Add animation if enabled
            if (template.enableAnimation)
            {
                sb.AppendLine(GenerateAnimations(template));
            }

            sb.AppendLine("</svg>");

            return new GeneratedSymbol
            {
                SvgContent = sb.ToString(),
                Archetype = template.archetype,
                Timestamp = Time.time,
                Width = DEFAULT_SIZE,
                Height = DEFAULT_SIZE
            };
        }

        /// <summary>
        /// Generate an SVG symbol from a symbolic event.
        /// </summary>
        public static GeneratedSymbol GenerateFromEvent(in SymbolicEvent evt, SymbolicTemplate baseTemplate = null)
        {
            // Determine archetype from event
            var archetype = MapEventToArchetype(evt);

            // Create or modify template
            var template = baseTemplate != null
                ? UnityEngine.Object.Instantiate(baseTemplate)
                : SymbolicTemplate.CreateFromArchetype(archetype);

            // Modify based on event properties
            ModifyTemplateFromEvent(template, in evt);

            // Use event hash as seed for deterministic generation
            int seed = evt.GetHashCode();

            var result = Generate(template, seed);
            result.SourceSignal = evt.Signal;
            result.SourceState = evt.SourceState;
            result.Metadata["intensity"] = evt.Intensity;
            result.Metadata["source"] = evt.Source;

            return result;
        }

        /// <summary>
        /// Generate a simple geometric symbol quickly.
        /// </summary>
        public static string GenerateQuick(ShapeLanguage shape, string color, int sides = 6)
        {
            var sb = new StringBuilder();
            sb.AppendLine(GenerateSvgHeader(DEFAULT_SIZE, DEFAULT_SIZE, "#000000"));

            switch (shape)
            {
                case ShapeLanguage.Geometric:
                    sb.AppendLine(GeneratePolygon(CENTER, CENTER, MAX_RADIUS * 0.8f, sides, color, 1.5f));
                    break;

                case ShapeLanguage.Circular:
                    sb.AppendLine(GenerateConcentricCircles(CENTER, CENTER, MAX_RADIUS * 0.8f, 5, color, 1.5f));
                    break;

                case ShapeLanguage.Linear:
                    sb.AppendLine(GenerateRadialLines(CENTER, CENTER, MAX_RADIUS * 0.8f, 12, color, 1.5f));
                    break;

                case ShapeLanguage.Sacred:
                    sb.AppendLine(GenerateFlowerOfLife(CENTER, CENTER, MAX_RADIUS * 0.6f, 3, color, 1f));
                    break;

                default:
                    sb.AppendLine(GeneratePolygon(CENTER, CENTER, MAX_RADIUS * 0.8f, 6, color, 1.5f));
                    break;
            }

            sb.AppendLine("</svg>");
            return sb.ToString();
        }

        #endregion

        #region SVG Structure

        private static string GenerateSvgHeader(int width, int height, string bgColor)
        {
            return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 {width} {height}"" width=""{width}"" height=""{height}"">
  <rect width=""100%"" height=""100%"" fill=""{bgColor}""/>";
        }

        private static string GenerateDefinitions(SymbolicTemplate template)
        {
            var sb = new StringBuilder();
            sb.AppendLine("  <defs>");

            // Glow filter
            sb.AppendLine($@"    <filter id=""glow"" x=""-50%"" y=""-50%"" width=""200%"" height=""200%"">
      <feGaussianBlur stdDeviation=""3"" result=""coloredBlur""/>
      <feMerge>
        <feMergeNode in=""coloredBlur""/>
        <feMergeNode in=""SourceGraphic""/>
      </feMerge>
    </filter>");

            // Gradient
            sb.AppendLine($@"    <radialGradient id=""coreGradient"" cx=""50%"" cy=""50%"" r=""50%"">
      <stop offset=""0%"" stop-color=""{template.PrimaryHex}"" stop-opacity=""1""/>
      <stop offset=""100%"" stop-color=""{template.SecondaryHex}"" stop-opacity=""0.3""/>
    </radialGradient>");

            // Glitch filter
            if (template.glitchProbability > 0)
            {
                sb.AppendLine($@"    <filter id=""glitch"">
      <feTurbulence type=""fractalNoise"" baseFrequency=""0.05"" numOctaves=""2"" result=""noise""/>
      <feDisplacementMap in=""SourceGraphic"" in2=""noise"" scale=""5"" xChannelSelector=""R"" yChannelSelector=""G""/>
    </filter>");
            }

            sb.AppendLine("  </defs>");
            return sb.ToString();
        }

        private static string GenerateAnimations(SymbolicTemplate template)
        {
            var sb = new StringBuilder();
            sb.AppendLine("  <style>");

            if (template.pulseSpeed > 0)
            {
                float duration = 2f / template.pulseSpeed;
                sb.AppendLine($@"    @keyframes pulse {{
      0%, 100% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.7; transform: scale(0.95); }}
    }}
    .pulsing {{ animation: pulse {duration:F1}s ease-in-out infinite; transform-origin: center; }}");
            }

            if (template.rotationSpeed > 0)
            {
                float duration = 10f / template.rotationSpeed;
                sb.AppendLine($@"    @keyframes rotate {{
      from {{ transform: rotate(0deg); }}
      to {{ transform: rotate(360deg); }}
    }}
    .rotating {{ animation: rotate {duration:F1}s linear infinite; transform-origin: center; }}");
            }

            if (template.glitchProbability > 0)
            {
                sb.AppendLine($@"    @keyframes glitch {{
      0%, 90%, 100% {{ filter: none; }}
      92% {{ filter: url(#glitch); transform: translate(2px, 0); }}
      94% {{ filter: url(#glitch); transform: translate(-2px, 0); }}
    }}
    .glitching {{ animation: glitch 3s linear infinite; }}");
            }

            sb.AppendLine("  </style>");
            return sb.ToString();
        }

        #endregion

        #region Element Generation

        private static string GenerateElement(SymbolicElementTemplate element, SymbolicTemplate template, float cx, float cy, float radius)
        {
            var sb = new StringBuilder();

            string classes = "";
            if (template.enableAnimation)
            {
                if (template.pulseSpeed > 0) classes += "pulsing ";
                if (template.rotationSpeed > 0) classes += "rotating ";
                if (template.glitchProbability > 0 && (float)_random.NextDouble() < template.glitchProbability) classes += "glitching ";
            }

            string groupStart = string.IsNullOrEmpty(classes)
                ? $"  <g opacity=\"{element.opacity:F2}\">"
                : $"  <g opacity=\"{element.opacity:F2}\" class=\"{classes.Trim()}\">";

            sb.AppendLine(groupStart);

            // Generate based on primary shape
            switch (element.primaryShape)
            {
                case ShapeLanguage.Geometric:
                    sb.AppendLine(GenerateGeometricLayers(cx, cy, radius, element, template));
                    break;

                case ShapeLanguage.Circular:
                    sb.AppendLine(GenerateConcentricCircles(cx, cy, radius, element.layers, element.strokeColor, element.strokeWidth));
                    break;

                case ShapeLanguage.Linear:
                    sb.AppendLine(GenerateRadialLines(cx, cy, radius, element.sides * 2, element.strokeColor, element.strokeWidth));
                    break;

                case ShapeLanguage.Organic:
                    sb.AppendLine(GenerateOrganicShape(cx, cy, radius, element, template));
                    break;

                case ShapeLanguage.Fractal:
                    sb.AppendLine(GenerateFractalPattern(cx, cy, radius, element.complexity, element.strokeColor, element.strokeWidth));
                    break;

                case ShapeLanguage.Glitch:
                    sb.AppendLine(GenerateGlitchPattern(cx, cy, radius, element, template));
                    break;

                case ShapeLanguage.Sacred:
                    sb.AppendLine(GenerateFlowerOfLife(cx, cy, radius, element.layers, element.strokeColor, element.strokeWidth));
                    break;

                case ShapeLanguage.Runic:
                    sb.AppendLine(GenerateRunicPattern(cx, cy, radius, element, template));
                    break;
            }

            // Add secondary shape overlay if different
            if (element.secondaryShape != element.primaryShape && element.symmetry < 1f)
            {
                float secondaryRadius = radius * element.innerRadius;
                // Simplified secondary - just add inner element
                sb.AppendLine(GeneratePolygon(cx, cy, secondaryRadius, element.sides + 2, template.SecondaryHex, element.strokeWidth * 0.7f));
            }

            sb.AppendLine("  </g>");
            return sb.ToString();
        }

        #endregion

        #region Shape Generators

        private static string GeneratePolygon(float cx, float cy, float radius, int sides, string stroke, float strokeWidth)
        {
            var points = new List<string>();
            for (int i = 0; i < sides; i++)
            {
                float angle = (i * 2 * Mathf.PI / sides) - Mathf.PI / 2;
                float x = cx + radius * Mathf.Cos(angle);
                float y = cy + radius * Mathf.Sin(angle);
                points.Add($"{x:F1},{y:F1}");
            }

            return $@"    <polygon points=""{string.Join(" ", points)}"" fill=""none"" stroke=""{stroke}"" stroke-width=""{strokeWidth:F1}"" filter=""url(#glow)""/>";
        }

        private static string GenerateGeometricLayers(float cx, float cy, float radius, SymbolicElementTemplate element, SymbolicTemplate template)
        {
            var sb = new StringBuilder();

            for (int layer = 0; layer < element.layers; layer++)
            {
                float layerRadius = radius * (1f - (float)layer / element.layers * (1f - element.innerRadius));
                float rotation = element.rotationOffset + (template.allowRotation ? layer * 15f : 0);

                // Rotate points
                var points = new List<string>();
                for (int i = 0; i < element.sides; i++)
                {
                    float angle = (i * 2 * Mathf.PI / element.sides) - Mathf.PI / 2 + rotation * Mathf.Deg2Rad;
                    float x = cx + layerRadius * Mathf.Cos(angle);
                    float y = cy + layerRadius * Mathf.Sin(angle);
                    points.Add($"{x:F1},{y:F1}");
                }

                string color = layer % 2 == 0 ? element.strokeColor : template.SecondaryHex;
                float opacity = 1f - (float)layer / element.layers * 0.5f;

                sb.AppendLine($@"    <polygon points=""{string.Join(" ", points)}"" fill=""none"" stroke=""{color}"" stroke-width=""{element.strokeWidth:F1}"" opacity=""{opacity:F2}"" filter=""url(#glow)""/>");
            }

            return sb.ToString();
        }

        private static string GenerateConcentricCircles(float cx, float cy, float maxRadius, int count, string stroke, float strokeWidth)
        {
            var sb = new StringBuilder();

            for (int i = 1; i <= count; i++)
            {
                float r = maxRadius * i / count;
                float opacity = 1f - (float)(i - 1) / count * 0.6f;
                sb.AppendLine($@"    <circle cx=""{cx:F1}"" cy=""{cy:F1}"" r=""{r:F1}"" fill=""none"" stroke=""{stroke}"" stroke-width=""{strokeWidth:F1}"" opacity=""{opacity:F2}"" filter=""url(#glow)""/>");
            }

            return sb.ToString();
        }

        private static string GenerateRadialLines(float cx, float cy, float radius, int count, string stroke, float strokeWidth)
        {
            var sb = new StringBuilder();

            for (int i = 0; i < count; i++)
            {
                float angle = i * 2 * Mathf.PI / count;
                float x2 = cx + radius * Mathf.Cos(angle);
                float y2 = cy + radius * Mathf.Sin(angle);

                sb.AppendLine($@"    <line x1=""{cx:F1}"" y1=""{cy:F1}"" x2=""{x2:F1}"" y2=""{y2:F1}"" stroke=""{stroke}"" stroke-width=""{strokeWidth:F1}"" filter=""url(#glow)""/>");
            }

            return sb.ToString();
        }

        private static string GenerateOrganicShape(float cx, float cy, float radius, SymbolicElementTemplate element, SymbolicTemplate template)
        {
            var sb = new StringBuilder();

            // Generate smooth bezier curve
            int points = 8 + element.complexity * 2;
            var pathPoints = new List<(float x, float y)>();

            for (int i = 0; i < points; i++)
            {
                float angle = i * 2 * Mathf.PI / points;
                float variation = 1f + ((float)_random.NextDouble() - 0.5f) * template.chaosLevel * 0.5f;
                float r = radius * variation;
                pathPoints.Add((cx + r * Mathf.Cos(angle), cy + r * Mathf.Sin(angle)));
            }

            // Create smooth path
            var path = new StringBuilder();
            path.Append($"M {pathPoints[0].x:F1},{pathPoints[0].y:F1} ");

            for (int i = 0; i < points; i++)
            {
                var p0 = pathPoints[i];
                var p1 = pathPoints[(i + 1) % points];

                float cpx1 = p0.x + (p1.x - pathPoints[(i + points - 1) % points].x) * 0.2f;
                float cpy1 = p0.y + (p1.y - pathPoints[(i + points - 1) % points].y) * 0.2f;
                float cpx2 = p1.x - (pathPoints[(i + 2) % points].x - p0.x) * 0.2f;
                float cpy2 = p1.y - (pathPoints[(i + 2) % points].y - p0.y) * 0.2f;

                path.Append($"C {cpx1:F1},{cpy1:F1} {cpx2:F1},{cpy2:F1} {p1.x:F1},{p1.y:F1} ");
            }

            path.Append("Z");

            sb.AppendLine($@"    <path d=""{path}"" fill=""none"" stroke=""{element.strokeColor}"" stroke-width=""{element.strokeWidth:F1}"" filter=""url(#glow)""/>");

            return sb.ToString();
        }

        private static string GenerateFractalPattern(float cx, float cy, float radius, int depth, string stroke, float strokeWidth)
        {
            var sb = new StringBuilder();

            GenerateFractalRecursive(sb, cx, cy, radius, depth, 0, stroke, strokeWidth);

            return sb.ToString();
        }

        private static void GenerateFractalRecursive(StringBuilder sb, float cx, float cy, float radius, int maxDepth, int currentDepth, string stroke, float strokeWidth)
        {
            if (currentDepth >= maxDepth || radius < 5) return;

            float opacity = 1f - currentDepth * 0.2f;
            sb.AppendLine($@"    <circle cx=""{cx:F1}"" cy=""{cy:F1}"" r=""{radius:F1}"" fill=""none"" stroke=""{stroke}"" stroke-width=""{strokeWidth:F1}"" opacity=""{opacity:F2}""/>");

            // Spawn child circles
            int children = 3 + currentDepth;
            float childRadius = radius * 0.4f;

            for (int i = 0; i < children; i++)
            {
                float angle = i * 2 * Mathf.PI / children;
                float childCx = cx + (radius - childRadius) * Mathf.Cos(angle);
                float childCy = cy + (radius - childRadius) * Mathf.Sin(angle);

                GenerateFractalRecursive(sb, childCx, childCy, childRadius, maxDepth, currentDepth + 1, stroke, strokeWidth * 0.8f);
            }
        }

        private static string GenerateGlitchPattern(float cx, float cy, float radius, SymbolicElementTemplate element, SymbolicTemplate template)
        {
            var sb = new StringBuilder();

            // Generate broken/displaced rectangles
            int segments = 5 + element.complexity;

            for (int i = 0; i < segments; i++)
            {
                float x = cx - radius + (float)_random.NextDouble() * radius * 2;
                float y = cy - radius + (float)_random.NextDouble() * radius * 2;
                float w = 10 + (float)_random.NextDouble() * 100;
                float h = 2 + (float)_random.NextDouble() * 20;

                float offsetX = ((float)_random.NextDouble() - 0.5f) * 20 * template.chaosLevel;

                string color = (float)_random.NextDouble() > 0.5f ? element.strokeColor : template.AccentHex;

                sb.AppendLine($@"    <rect x=""{x + offsetX:F1}"" y=""{y:F1}"" width=""{w:F1}"" height=""{h:F1}"" fill=""{color}"" opacity=""0.8""/>");
            }

            // Add scan lines
            for (int i = 0; i < 10; i++)
            {
                float y = cy - radius + i * radius * 0.2f;
                if ((float)_random.NextDouble() < 0.3f)
                {
                    sb.AppendLine($@"    <line x1=""{cx - radius:F1}"" y1=""{y:F1}"" x2=""{cx + radius:F1}"" y2=""{y:F1}"" stroke=""{element.strokeColor}"" stroke-width=""1"" opacity=""0.3""/>");
                }
            }

            return sb.ToString();
        }

        private static string GenerateFlowerOfLife(float cx, float cy, float radius, int rings, string stroke, float strokeWidth)
        {
            var sb = new StringBuilder();

            float baseRadius = radius / (rings + 1);

            // Center circle
            sb.AppendLine($@"    <circle cx=""{cx:F1}"" cy=""{cy:F1}"" r=""{baseRadius:F1}"" fill=""none"" stroke=""{stroke}"" stroke-width=""{strokeWidth:F1}"" filter=""url(#glow)""/>");

            // Surrounding circles
            for (int ring = 1; ring <= rings; ring++)
            {
                int count = 6 * ring;
                float ringRadius = baseRadius * ring;

                for (int i = 0; i < count; i++)
                {
                    float angle = i * 2 * Mathf.PI / count + (ring % 2) * Mathf.PI / count;
                    float ccx = cx + ringRadius * Mathf.Cos(angle);
                    float ccy = cy + ringRadius * Mathf.Sin(angle);

                    float opacity = 1f - ring * 0.15f;
                    sb.AppendLine($@"    <circle cx=""{ccx:F1}"" cy=""{ccy:F1}"" r=""{baseRadius:F1}"" fill=""none"" stroke=""{stroke}"" stroke-width=""{strokeWidth:F1}"" opacity=""{opacity:F2}""/>");
                }
            }

            return sb.ToString();
        }

        private static string GenerateRunicPattern(float cx, float cy, float radius, SymbolicElementTemplate element, SymbolicTemplate template)
        {
            var sb = new StringBuilder();

            // Generate angular rune-like lines
            int segments = 4 + element.complexity;

            for (int i = 0; i < segments; i++)
            {
                float startAngle = (float)_random.NextDouble() * 2 * Mathf.PI;
                float length = radius * (0.3f + (float)_random.NextDouble() * 0.7f);

                float x1 = cx + (float)_random.NextDouble() * radius * 0.5f - radius * 0.25f;
                float y1 = cy + (float)_random.NextDouble() * radius * 0.5f - radius * 0.25f;
                float x2 = x1 + length * Mathf.Cos(startAngle);
                float y2 = y1 + length * Mathf.Sin(startAngle);

                sb.AppendLine($@"    <line x1=""{x1:F1}"" y1=""{y1:F1}"" x2=""{x2:F1}"" y2=""{y2:F1}"" stroke=""{element.strokeColor}"" stroke-width=""{element.strokeWidth:F1}"" stroke-linecap=""round"" filter=""url(#glow)""/>");

                // Add branching
                if ((float)_random.NextDouble() > 0.5f)
                {
                    float branchAngle = startAngle + ((float)_random.NextDouble() > 0.5f ? 1 : -1) * Mathf.PI / 4;
                    float branchLength = length * 0.4f;
                    float midX = (x1 + x2) / 2;
                    float midY = (y1 + y2) / 2;

                    sb.AppendLine($@"    <line x1=""{midX:F1}"" y1=""{midY:F1}"" x2=""{midX + branchLength * Mathf.Cos(branchAngle):F1}"" y2=""{midY + branchLength * Mathf.Sin(branchAngle):F1}"" stroke=""{element.strokeColor}"" stroke-width=""{element.strokeWidth * 0.7f:F1}"" stroke-linecap=""round""/>");
                }
            }

            return sb.ToString();
        }

        #endregion

        #region Event Mapping

        private static SymbolicArchetype MapEventToArchetype(in SymbolicEvent evt)
        {
            return evt.Signal switch
            {
                SymbolicSignalType.ArcanaInvoked => MapArcanaPayloadToArchetype(evt.Payload),
                SymbolicSignalType.ArcanaUnlocked => MapArcanaPayloadToArchetype(evt.Payload),
                SymbolicSignalType.MemoryRecovered => SymbolicArchetype.TheMemory,
                SymbolicSignalType.MemoryOversaturation => SymbolicArchetype.TheCorruption,
                SymbolicSignalType.UnboundTriggered => SymbolicArchetype.TheUnbound,
                SymbolicSignalType.EchoTriggered => SymbolicArchetype.TheEcho,
                SymbolicSignalType.CorruptionSpike => SymbolicArchetype.TheCorruption,
                SymbolicSignalType.GlitchTriggered => SymbolicArchetype.TheFragment,
                SymbolicSignalType.VisionUnlocked => SymbolicArchetype.TheVision,
                SymbolicSignalType.GateOpened => SymbolicArchetype.TheGate,
                SymbolicSignalType.FragmentedVisionStart => SymbolicArchetype.TheVision,
                _ => MapStateToArchetype(evt.SourceState)
            };
        }

        private static SymbolicArchetype MapArcanaPayloadToArchetype(object payload)
        {
            if (payload is ArcanaEventPayload arcana)
            {
                return arcana.ArcanaId switch
                {
                    0 => SymbolicArchetype.TheFool,
                    1 => SymbolicArchetype.TheMagician,
                    2 => SymbolicArchetype.TheHighPriestess,
                    13 => SymbolicArchetype.Death,
                    15 => SymbolicArchetype.TheDevil,
                    18 => SymbolicArchetype.TheMoon,
                    _ => SymbolicArchetype.TheFragment
                };
            }
            return SymbolicArchetype.TheFragment;
        }

        private static SymbolicArchetype MapStateToArchetype(CristalState state)
        {
            return state switch
            {
                CristalState.Corrupted => SymbolicArchetype.TheCorruption,
                CristalState.Echo => SymbolicArchetype.TheEcho,
                CristalState.Remembering => SymbolicArchetype.TheMemory,
                CristalState.UNBOUND => SymbolicArchetype.TheUnbound,
                CristalState.Invoked => SymbolicArchetype.TheMagician,
                CristalState.Seeking => SymbolicArchetype.TheHermit,
                CristalState.Locked => SymbolicArchetype.TheVoid,
                _ => SymbolicArchetype.TheFragment
            };
        }

        private static void ModifyTemplateFromEvent(SymbolicTemplate template, in SymbolicEvent evt)
        {
            // Adjust based on intensity
            float intensityFactor = evt.Intensity / 100f;

            template.mainElement.complexity = Mathf.RoundToInt(2 + intensityFactor * 5);
            template.mainElement.layers = Mathf.RoundToInt(2 + intensityFactor * 4);
            template.chaosLevel *= intensityFactor;

            // High intensity = more animation
            if (evt.Intensity > 70)
            {
                template.enableAnimation = true;
                template.pulseSpeed = 1f + (evt.Intensity - 70) / 30f;
            }

            // Corruption events get glitch
            if (evt.Signal == SymbolicSignalType.CorruptionSpike ||
                evt.Signal == SymbolicSignalType.GlitchTriggered)
            {
                template.glitchProbability = intensityFactor;
                template.mainElement.primaryShape = ShapeLanguage.Glitch;
            }
        }

        #endregion
    }
}

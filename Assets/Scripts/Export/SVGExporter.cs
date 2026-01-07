using System;
using System.Collections.Generic;
using System.Text;
using System.Globalization;

namespace Cristal.CLI.Export
{
    /// <summary>
    /// SVG symbol generator for exporting terminal glyphs and symbols.
    /// Converts text and patterns to SVG format.
    /// </summary>
    public class SVGExporter
    {
        private readonly SVGExportSettings _settings;

        public SVGExporter() : this(SVGExportSettings.Default) { }

        public SVGExporter(SVGExportSettings settings)
        {
            _settings = settings ?? SVGExportSettings.Default;
        }

        /// <summary>
        /// Generate SVG from text content.
        /// </summary>
        public string ExportText(string text, TextExportOptions options = null)
        {
            options ??= new TextExportOptions();
            var sb = new StringBuilder();

            float width = CalculateTextWidth(text, options);
            float height = options.FontSize * 1.5f;

            AppendSVGHeader(sb, width, height);
            AppendText(sb, text, options);
            AppendSVGFooter(sb);

            return sb.ToString();
        }

        /// <summary>
        /// Generate SVG glyph/symbol.
        /// </summary>
        public string ExportGlyph(GlyphType glyph, float size = 100)
        {
            var sb = new StringBuilder();
            AppendSVGHeader(sb, size, size);

            switch (glyph)
            {
                case GlyphType.Cursor:
                    AppendCursorGlyph(sb, size);
                    break;
                case GlyphType.Crystal:
                    AppendCrystalGlyph(sb, size);
                    break;
                case GlyphType.Eye:
                    AppendEyeGlyph(sb, size);
                    break;
                case GlyphType.Arcana:
                    AppendArcanaGlyph(sb, size);
                    break;
                case GlyphType.Fragment:
                    AppendFragmentGlyph(sb, size);
                    break;
                case GlyphType.Portal:
                    AppendPortalGlyph(sb, size);
                    break;
            }

            AppendSVGFooter(sb);
            return sb.ToString();
        }

        /// <summary>
        /// Generate terminal frame SVG.
        /// </summary>
        public string ExportTerminalFrame(float width, float height, TerminalFrameStyle style = null)
        {
            style ??= TerminalFrameStyle.Default;
            var sb = new StringBuilder();

            AppendSVGHeader(sb, width, height);
            AppendTerminalFrame(sb, width, height, style);
            AppendSVGFooter(sb);

            return sb.ToString();
        }

        /// <summary>
        /// Export multiple glyphs as symbol definitions.
        /// </summary>
        public string ExportSymbolLibrary(IEnumerable<GlyphType> glyphs, float glyphSize = 100)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.AppendLine("<svg xmlns=\"http://www.w3.org/2000/svg\" version=\"1.1\">");
            sb.AppendLine("  <defs>");

            foreach (var glyph in glyphs)
            {
                sb.AppendLine($"    <symbol id=\"{glyph.ToString().ToLower()}\" viewBox=\"0 0 {glyphSize} {glyphSize}\">");
                AppendGlyphContent(sb, glyph, glyphSize, "      ");
                sb.AppendLine("    </symbol>");
            }

            sb.AppendLine("  </defs>");
            sb.AppendLine("</svg>");

            return sb.ToString();
        }

        private void AppendSVGHeader(StringBuilder sb, float width, float height)
        {
            sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{0}\" height=\"{1}\" viewBox=\"0 0 {0} {1}\">",
                width, height));

            if (_settings.IncludeBackground)
            {
                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "  <rect width=\"{0}\" height=\"{1}\" fill=\"{2}\"/>",
                    width, height, _settings.BackgroundColor));
            }
        }

        private void AppendSVGFooter(StringBuilder sb)
        {
            sb.AppendLine("</svg>");
        }

        private void AppendText(StringBuilder sb, string text, TextExportOptions options)
        {
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "  <text x=\"{0}\" y=\"{1}\" font-family=\"{2}\" font-size=\"{3}\" fill=\"{4}\">",
                options.X, options.Y + options.FontSize, options.FontFamily, options.FontSize, options.Color));
            sb.AppendLine($"    {EscapeXml(text)}");
            sb.AppendLine("  </text>");
        }

        private float CalculateTextWidth(string text, TextExportOptions options)
        {
            // Approximate: 0.6 chars per fontSize for monospace
            return text.Length * options.FontSize * 0.6f + options.X * 2;
        }

        private void AppendGlyphContent(StringBuilder sb, GlyphType glyph, float size, string indent = "  ")
        {
            switch (glyph)
            {
                case GlyphType.Cursor:
                    AppendCursorGlyphContent(sb, size, indent);
                    break;
                case GlyphType.Crystal:
                    AppendCrystalGlyphContent(sb, size, indent);
                    break;
                case GlyphType.Eye:
                    AppendEyeGlyphContent(sb, size, indent);
                    break;
                case GlyphType.Arcana:
                    AppendArcanaGlyphContent(sb, size, indent);
                    break;
                case GlyphType.Fragment:
                    AppendFragmentGlyphContent(sb, size, indent);
                    break;
                case GlyphType.Portal:
                    AppendPortalGlyphContent(sb, size, indent);
                    break;
            }
        }

        private void AppendCursorGlyph(StringBuilder sb, float size)
        {
            AppendCursorGlyphContent(sb, size, "  ");
        }

        private void AppendCursorGlyphContent(StringBuilder sb, float size, string indent)
        {
            float x = size * 0.4f;
            float y = size * 0.2f;
            float w = size * 0.2f;
            float h = size * 0.6f;

            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<rect x=\"{1}\" y=\"{2}\" width=\"{3}\" height=\"{4}\" fill=\"{5}\">",
                indent, x, y, w, h, _settings.PrimaryColor));
            sb.AppendLine($"{indent}  <animate attributeName=\"opacity\" values=\"1;0;1\" dur=\"1s\" repeatCount=\"indefinite\"/>");
            sb.AppendLine($"{indent}</rect>");
        }

        private void AppendCrystalGlyph(StringBuilder sb, float size)
        {
            AppendCrystalGlyphContent(sb, size, "  ");
        }

        private void AppendCrystalGlyphContent(StringBuilder sb, float size, string indent)
        {
            float cx = size * 0.5f;
            float top = size * 0.1f;
            float bottom = size * 0.9f;
            float left = size * 0.2f;
            float right = size * 0.8f;
            float mid = size * 0.4f;

            string points = string.Format(CultureInfo.InvariantCulture,
                "{0},{1} {2},{3} {4},{5} {6},{7} {8},{9}",
                cx, top, right, mid, cx, bottom, left, mid, cx, top);

            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<polygon points=\"{1}\" fill=\"none\" stroke=\"{2}\" stroke-width=\"2\"/>",
                indent, points, _settings.PrimaryColor));

            // Inner line
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<line x1=\"{1}\" y1=\"{2}\" x2=\"{3}\" y2=\"{4}\" stroke=\"{5}\" stroke-width=\"1\"/>",
                indent, cx, top, cx, bottom, _settings.PrimaryColor));
        }

        private void AppendEyeGlyph(StringBuilder sb, float size)
        {
            AppendEyeGlyphContent(sb, size, "  ");
        }

        private void AppendEyeGlyphContent(StringBuilder sb, float size, string indent)
        {
            float cx = size * 0.5f;
            float cy = size * 0.5f;
            float rx = size * 0.35f;
            float ry = size * 0.2f;
            float pupilR = size * 0.1f;

            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<ellipse cx=\"{1}\" cy=\"{2}\" rx=\"{3}\" ry=\"{4}\" fill=\"none\" stroke=\"{5}\" stroke-width=\"2\"/>",
                indent, cx, cy, rx, ry, _settings.PrimaryColor));

            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<circle cx=\"{1}\" cy=\"{2}\" r=\"{3}\" fill=\"{4}\"/>",
                indent, cx, cy, pupilR, _settings.PrimaryColor));
        }

        private void AppendArcanaGlyph(StringBuilder sb, float size)
        {
            AppendArcanaGlyphContent(sb, size, "  ");
        }

        private void AppendArcanaGlyphContent(StringBuilder sb, float size, string indent)
        {
            float cx = size * 0.5f;
            float cy = size * 0.5f;
            float r1 = size * 0.4f;
            float r2 = size * 0.25f;

            // Outer circle
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<circle cx=\"{1}\" cy=\"{2}\" r=\"{3}\" fill=\"none\" stroke=\"{4}\" stroke-width=\"2\"/>",
                indent, cx, cy, r1, _settings.PrimaryColor));

            // Inner circle
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<circle cx=\"{1}\" cy=\"{2}\" r=\"{3}\" fill=\"none\" stroke=\"{4}\" stroke-width=\"1\"/>",
                indent, cx, cy, r2, _settings.PrimaryColor));

            // Cross lines
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<line x1=\"{1}\" y1=\"{2}\" x2=\"{3}\" y2=\"{4}\" stroke=\"{5}\" stroke-width=\"1\"/>",
                indent, cx - r1, cy, cx + r1, cy, _settings.PrimaryColor));
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<line x1=\"{1}\" y1=\"{2}\" x2=\"{3}\" y2=\"{4}\" stroke=\"{5}\" stroke-width=\"1\"/>",
                indent, cx, cy - r1, cx, cy + r1, _settings.PrimaryColor));
        }

        private void AppendFragmentGlyph(StringBuilder sb, float size)
        {
            AppendFragmentGlyphContent(sb, size, "  ");
        }

        private void AppendFragmentGlyphContent(StringBuilder sb, float size, string indent)
        {
            // Broken triangle
            float cx = size * 0.5f;
            float top = size * 0.15f;
            float bottom = size * 0.85f;
            float left = size * 0.15f;
            float right = size * 0.85f;

            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<line x1=\"{1}\" y1=\"{2}\" x2=\"{3}\" y2=\"{4}\" stroke=\"{5}\" stroke-width=\"2\"/>",
                indent, cx, top, right, bottom, _settings.PrimaryColor));
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<line x1=\"{1}\" y1=\"{2}\" x2=\"{3}\" y2=\"{4}\" stroke=\"{5}\" stroke-width=\"2\" stroke-dasharray=\"5,3\"/>",
                indent, right, bottom, left, bottom, _settings.PrimaryColor));
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "{0}<line x1=\"{1}\" y1=\"{2}\" x2=\"{3}\" y2=\"{4}\" stroke=\"{5}\" stroke-width=\"2\"/>",
                indent, left, bottom, cx, top, _settings.PrimaryColor));
        }

        private void AppendPortalGlyph(StringBuilder sb, float size)
        {
            AppendPortalGlyphContent(sb, size, "  ");
        }

        private void AppendPortalGlyphContent(StringBuilder sb, float size, string indent)
        {
            float cx = size * 0.5f;
            float cy = size * 0.5f;

            // Concentric circles
            for (int i = 1; i <= 4; i++)
            {
                float r = size * 0.1f * i;
                float opacity = 1f - (i * 0.2f);

                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "{0}<circle cx=\"{1}\" cy=\"{2}\" r=\"{3}\" fill=\"none\" stroke=\"{4}\" stroke-width=\"1\" opacity=\"{5}\"/>",
                    indent, cx, cy, r, _settings.PrimaryColor, opacity));
            }
        }

        private void AppendTerminalFrame(StringBuilder sb, float width, float height, TerminalFrameStyle style)
        {
            float padding = style.Padding;
            float cornerRadius = style.CornerRadius;

            // Border
            sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                "  <rect x=\"{0}\" y=\"{1}\" width=\"{2}\" height=\"{3}\" rx=\"{4}\" fill=\"none\" stroke=\"{5}\" stroke-width=\"{6}\"/>",
                padding, padding, width - padding * 2, height - padding * 2, cornerRadius, style.BorderColor, style.BorderWidth));

            // Header line
            if (style.ShowHeader)
            {
                float headerY = padding + 30;
                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "  <line x1=\"{0}\" y1=\"{1}\" x2=\"{2}\" y2=\"{3}\" stroke=\"{4}\" stroke-width=\"1\"/>",
                    padding, headerY, width - padding, headerY, style.BorderColor));

                // Header dots
                for (int i = 0; i < 3; i++)
                {
                    float dotX = padding + 15 + (i * 20);
                    float dotY = padding + 15;
                    string dotColor = i == 0 ? "#FF5F56" : (i == 1 ? "#FFBD2E" : "#27CA40");
                    sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                        "  <circle cx=\"{0}\" cy=\"{1}\" r=\"5\" fill=\"{2}\"/>",
                        dotX, dotY, dotColor));
                }
            }

            // Scanlines effect
            if (style.ShowScanlines)
            {
                sb.AppendLine("  <defs>");
                sb.AppendLine("    <pattern id=\"scanlines\" patternUnits=\"userSpaceOnUse\" width=\"4\" height=\"4\">");
                sb.AppendLine("      <line x1=\"0\" y1=\"0\" x2=\"4\" y2=\"0\" stroke=\"rgba(0,0,0,0.1)\" stroke-width=\"1\"/>");
                sb.AppendLine("    </pattern>");
                sb.AppendLine("  </defs>");
                sb.AppendLine(string.Format(CultureInfo.InvariantCulture,
                    "  <rect x=\"{0}\" y=\"{1}\" width=\"{2}\" height=\"{3}\" fill=\"url(#scanlines)\"/>",
                    padding, padding, width - padding * 2, height - padding * 2));
            }
        }

        private string EscapeXml(string text)
        {
            return text
                .Replace("&", "&amp;")
                .Replace("<", "&lt;")
                .Replace(">", "&gt;")
                .Replace("\"", "&quot;")
                .Replace("'", "&apos;");
        }
    }

    /// <summary>
    /// Available glyph types for export.
    /// </summary>
    public enum GlyphType
    {
        Cursor,
        Crystal,
        Eye,
        Arcana,
        Fragment,
        Portal
    }

    /// <summary>
    /// Settings for SVG export.
    /// </summary>
    public class SVGExportSettings
    {
        public string PrimaryColor { get; set; } = "#99FF99";
        public string SecondaryColor { get; set; } = "#5577FF";
        public string BackgroundColor { get; set; } = "#000000";
        public bool IncludeBackground { get; set; } = true;

        public static SVGExportSettings Default => new SVGExportSettings();

        public static SVGExportSettings Terminal => new SVGExportSettings
        {
            PrimaryColor = "#66FF66",
            SecondaryColor = "#4488FF",
            BackgroundColor = "#0a0a0a"
        };

        public static SVGExportSettings Arcana => new SVGExportSettings
        {
            PrimaryColor = "#CC88FF",
            SecondaryColor = "#FFB366",
            BackgroundColor = "#1a0a1a"
        };
    }

    /// <summary>
    /// Options for text export.
    /// </summary>
    public class TextExportOptions
    {
        public float X { get; set; } = 10;
        public float Y { get; set; } = 10;
        public float FontSize { get; set; } = 16;
        public string FontFamily { get; set; } = "monospace";
        public string Color { get; set; } = "#99FF99";
    }

    /// <summary>
    /// Style for terminal frame export.
    /// </summary>
    public class TerminalFrameStyle
    {
        public float Padding { get; set; } = 10;
        public float CornerRadius { get; set; } = 8;
        public float BorderWidth { get; set; } = 2;
        public string BorderColor { get; set; } = "#333333";
        public bool ShowHeader { get; set; } = true;
        public bool ShowScanlines { get; set; } = false;

        public static TerminalFrameStyle Default => new TerminalFrameStyle();

        public static TerminalFrameStyle Minimal => new TerminalFrameStyle
        {
            Padding = 5,
            CornerRadius = 0,
            BorderWidth = 1,
            ShowHeader = false
        };
    }
}

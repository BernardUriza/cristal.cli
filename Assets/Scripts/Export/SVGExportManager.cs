using System;
using System.IO;
using UnityEngine;

namespace Cristal.CLI.Export
{
    /// <summary>
    /// Unity integration for SVG export system.
    /// Provides file export and editor integration.
    /// </summary>
    public class SVGExportManager : MonoBehaviour
    {
        public static SVGExportManager Instance { get; private set; }

        [Header("Export Settings")]
        [SerializeField] private string _exportFolder = "Exports/SVG";
        [SerializeField] private bool _useTimestamp = true;

        [Header("Default Settings")]
        [SerializeField] private Color _primaryColor = new Color(0.6f, 1f, 0.6f);
        [SerializeField] private Color _backgroundColor = Color.black;
        [SerializeField] private bool _includeBackground = true;

        private SVGExporter _exporter;

        public SVGExporter Exporter => _exporter;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                Initialize();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Initialize()
        {
            var settings = new SVGExportSettings
            {
                PrimaryColor = ColorToHex(_primaryColor),
                BackgroundColor = ColorToHex(_backgroundColor),
                IncludeBackground = _includeBackground
            };

            _exporter = new SVGExporter(settings);
            EnsureExportFolder();
        }

        /// <summary>
        /// Export text to SVG file.
        /// </summary>
        public string ExportText(string text, string filename = null)
        {
            string svg = _exporter.ExportText(text);
            return SaveSVG(svg, filename ?? "text");
        }

        /// <summary>
        /// Export glyph to SVG file.
        /// </summary>
        public string ExportGlyph(GlyphType glyph, float size = 100, string filename = null)
        {
            string svg = _exporter.ExportGlyph(glyph, size);
            return SaveSVG(svg, filename ?? glyph.ToString().ToLower());
        }

        /// <summary>
        /// Export terminal frame to SVG file.
        /// </summary>
        public string ExportTerminalFrame(float width, float height, string filename = null)
        {
            string svg = _exporter.ExportTerminalFrame(width, height);
            return SaveSVG(svg, filename ?? "terminal_frame");
        }

        /// <summary>
        /// Export all standard glyphs.
        /// </summary>
        public void ExportAllGlyphs(float size = 100)
        {
            foreach (GlyphType glyph in Enum.GetValues(typeof(GlyphType)))
            {
                ExportGlyph(glyph, size);
            }
            Debug.Log($"[SVGExport] Exported all glyphs to {GetExportPath()}");
        }

        /// <summary>
        /// Export symbol library (all glyphs in one file).
        /// </summary>
        public string ExportSymbolLibrary(float glyphSize = 100)
        {
            var allGlyphs = (GlyphType[])Enum.GetValues(typeof(GlyphType));
            string svg = _exporter.ExportSymbolLibrary(allGlyphs, glyphSize);
            return SaveSVG(svg, "symbol_library");
        }

        private string SaveSVG(string svgContent, string baseName)
        {
            string filename = _useTimestamp
                ? $"{baseName}_{DateTime.Now:yyyyMMdd_HHmmss}.svg"
                : $"{baseName}.svg";

            string path = Path.Combine(GetExportPath(), filename);

            try
            {
                File.WriteAllText(path, svgContent);
                Debug.Log($"[SVGExport] Saved: {path}");
                return path;
            }
            catch (Exception ex)
            {
                Debug.LogError($"[SVGExport] Failed to save {path}: {ex.Message}");
                return null;
            }
        }

        private string GetExportPath()
        {
            return Path.Combine(Application.dataPath, _exportFolder);
        }

        private void EnsureExportFolder()
        {
            string path = GetExportPath();
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
        }

        private string ColorToHex(Color color)
        {
            return $"#{ColorUtility.ToHtmlStringRGB(color)}";
        }
    }
}

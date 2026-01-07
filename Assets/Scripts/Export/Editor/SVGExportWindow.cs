using UnityEditor;
using UnityEngine;

namespace Cristal.CLI.Export.Editor
{
    /// <summary>
    /// Editor window for SVG export tools.
    /// </summary>
    public class SVGExportWindow : EditorWindow
    {
        private GlyphType _selectedGlyph = GlyphType.Crystal;
        private float _glyphSize = 100f;
        private float _frameWidth = 800f;
        private float _frameHeight = 600f;
        private string _textContent = "CRISTAL.CLI";
        private bool _includeBackground = true;
        private Color _primaryColor = new Color(0.6f, 1f, 0.6f);
        private Color _backgroundColor = Color.black;

        private SVGExporter _exporter;
        private string _lastExportPath;
        private string _previewSVG;

        [MenuItem("CRISTAL/SVG Export Window")]
        public static void ShowWindow()
        {
            var window = GetWindow<SVGExportWindow>("SVG Export");
            window.minSize = new Vector2(400, 500);
        }

        private void OnEnable()
        {
            UpdateExporter();
        }

        private void UpdateExporter()
        {
            var settings = new SVGExportSettings
            {
                PrimaryColor = $"#{ColorUtility.ToHtmlStringRGB(_primaryColor)}",
                BackgroundColor = $"#{ColorUtility.ToHtmlStringRGB(_backgroundColor)}",
                IncludeBackground = _includeBackground
            };
            _exporter = new SVGExporter(settings);
        }

        private void OnGUI()
        {
            GUILayout.Label("CRISTAL SVG Export", EditorStyles.boldLabel);
            EditorGUILayout.Space();

            // Settings section
            EditorGUILayout.LabelField("Settings", EditorStyles.boldLabel);
            EditorGUI.BeginChangeCheck();
            _primaryColor = EditorGUILayout.ColorField("Primary Color", _primaryColor);
            _backgroundColor = EditorGUILayout.ColorField("Background Color", _backgroundColor);
            _includeBackground = EditorGUILayout.Toggle("Include Background", _includeBackground);
            if (EditorGUI.EndChangeCheck())
            {
                UpdateExporter();
            }

            EditorGUILayout.Space();

            // Glyph export section
            EditorGUILayout.LabelField("Glyph Export", EditorStyles.boldLabel);
            _selectedGlyph = (GlyphType)EditorGUILayout.EnumPopup("Glyph Type", _selectedGlyph);
            _glyphSize = EditorGUILayout.FloatField("Size", _glyphSize);

            EditorGUILayout.BeginHorizontal();
            if (GUILayout.Button("Export Glyph"))
            {
                ExportGlyph();
            }
            if (GUILayout.Button("Export All Glyphs"))
            {
                ExportAllGlyphs();
            }
            EditorGUILayout.EndHorizontal();

            if (GUILayout.Button("Preview Glyph"))
            {
                _previewSVG = _exporter.ExportGlyph(_selectedGlyph, _glyphSize);
            }

            EditorGUILayout.Space();

            // Terminal frame export section
            EditorGUILayout.LabelField("Terminal Frame Export", EditorStyles.boldLabel);
            _frameWidth = EditorGUILayout.FloatField("Width", _frameWidth);
            _frameHeight = EditorGUILayout.FloatField("Height", _frameHeight);

            if (GUILayout.Button("Export Terminal Frame"))
            {
                ExportTerminalFrame();
            }

            EditorGUILayout.Space();

            // Text export section
            EditorGUILayout.LabelField("Text Export", EditorStyles.boldLabel);
            _textContent = EditorGUILayout.TextField("Text", _textContent);

            if (GUILayout.Button("Export Text"))
            {
                ExportText();
            }

            EditorGUILayout.Space();

            // Symbol library section
            EditorGUILayout.LabelField("Symbol Library", EditorStyles.boldLabel);
            if (GUILayout.Button("Export Symbol Library"))
            {
                ExportSymbolLibrary();
            }

            EditorGUILayout.Space();

            // Status
            if (!string.IsNullOrEmpty(_lastExportPath))
            {
                EditorGUILayout.HelpBox($"Last export: {_lastExportPath}", MessageType.Info);
            }

            // Preview
            if (!string.IsNullOrEmpty(_previewSVG))
            {
                EditorGUILayout.Space();
                EditorGUILayout.LabelField("Preview (SVG code)", EditorStyles.boldLabel);
                EditorGUILayout.TextArea(_previewSVG, GUILayout.Height(150));
            }
        }

        private void ExportGlyph()
        {
            string path = EditorUtility.SaveFilePanel(
                "Save SVG Glyph",
                GetExportFolder(),
                $"{_selectedGlyph.ToString().ToLower()}.svg",
                "svg"
            );

            if (!string.IsNullOrEmpty(path))
            {
                string svg = _exporter.ExportGlyph(_selectedGlyph, _glyphSize);
                System.IO.File.WriteAllText(path, svg);
                _lastExportPath = path;
                AssetDatabase.Refresh();
            }
        }

        private void ExportAllGlyphs()
        {
            string folder = EditorUtility.SaveFolderPanel("Save All Glyphs", GetExportFolder(), "");
            if (!string.IsNullOrEmpty(folder))
            {
                foreach (GlyphType glyph in System.Enum.GetValues(typeof(GlyphType)))
                {
                    string svg = _exporter.ExportGlyph(glyph, _glyphSize);
                    string path = System.IO.Path.Combine(folder, $"{glyph.ToString().ToLower()}.svg");
                    System.IO.File.WriteAllText(path, svg);
                }
                _lastExportPath = folder;
                AssetDatabase.Refresh();
            }
        }

        private void ExportTerminalFrame()
        {
            string path = EditorUtility.SaveFilePanel(
                "Save Terminal Frame SVG",
                GetExportFolder(),
                "terminal_frame.svg",
                "svg"
            );

            if (!string.IsNullOrEmpty(path))
            {
                string svg = _exporter.ExportTerminalFrame(_frameWidth, _frameHeight);
                System.IO.File.WriteAllText(path, svg);
                _lastExportPath = path;
                AssetDatabase.Refresh();
            }
        }

        private void ExportText()
        {
            string path = EditorUtility.SaveFilePanel(
                "Save Text SVG",
                GetExportFolder(),
                "text.svg",
                "svg"
            );

            if (!string.IsNullOrEmpty(path))
            {
                string svg = _exporter.ExportText(_textContent);
                System.IO.File.WriteAllText(path, svg);
                _lastExportPath = path;
                AssetDatabase.Refresh();
            }
        }

        private void ExportSymbolLibrary()
        {
            string path = EditorUtility.SaveFilePanel(
                "Save Symbol Library SVG",
                GetExportFolder(),
                "symbol_library.svg",
                "svg"
            );

            if (!string.IsNullOrEmpty(path))
            {
                var allGlyphs = (GlyphType[])System.Enum.GetValues(typeof(GlyphType));
                string svg = _exporter.ExportSymbolLibrary(allGlyphs, _glyphSize);
                System.IO.File.WriteAllText(path, svg);
                _lastExportPath = path;
                AssetDatabase.Refresh();
            }
        }

        private string GetExportFolder()
        {
            return System.IO.Path.Combine(Application.dataPath, "Exports/SVG");
        }
    }
}

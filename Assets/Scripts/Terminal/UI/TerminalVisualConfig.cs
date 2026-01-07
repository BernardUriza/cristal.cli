using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Visual configuration for the terminal UI.
    /// Centralizes styling, colors, and layout settings.
    /// </summary>
    [CreateAssetMenu(fileName = "TerminalVisualConfig", menuName = "CRISTAL/Terminal Visual Config")]
    public class TerminalVisualConfig : ScriptableObject
    {
        [Header("Colors")]
        public Color backgroundColor = new Color(0.02f, 0.02f, 0.02f, 1f);
        public Color inputColor = new Color(0.8f, 0.8f, 0.8f, 1f);
        public Color outputColor = new Color(0.6f, 0.9f, 0.6f, 1f);
        public Color systemColor = new Color(0.5f, 0.7f, 1f, 1f);
        public Color errorColor = new Color(1f, 0.4f, 0.4f, 1f);
        public Color memoryColor = new Color(1f, 0.8f, 0.4f, 1f);
        public Color arcanaColor = new Color(0.8f, 0.5f, 1f, 1f);
        public Color cursorColor = new Color(0.6f, 1f, 0.6f, 1f);

        [Header("Typography")]
        public TMP_FontAsset font;
        public float fontSize = 18f;
        public float lineSpacing = 1.2f;

        [Header("Layout")]
        public float padding = 20f;
        public float inputHeight = 40f;
        public float cursorWidth = 10f;

        [Header("Effects")]
        public float typewriterSpeed = 0.03f;
        public float glitchChance = 0.05f;
        public float cursorBlinkRate = 0.5f;

        [Header("Glitch Characters")]
        public string[] glitchChars = { "█", "▓", "▒", "░", "Δ", "◊", "●", "○" };

        [Header("Scanline Effect")]
        public bool enableScanlines = true;
        public float scanlineAlpha = 0.03f;
        public float scanlineSpeed = 0.1f;

        [Header("Border")]
        public bool showBorder = true;
        public float borderWidth = 2f;
        public Color borderColor = new Color(0.2f, 0.4f, 0.2f, 1f);

        /// <summary>
        /// Get color for response type.
        /// </summary>
        public Color GetColorForType(string type)
        {
            switch (type?.ToLower())
            {
                case "system":
                    return systemColor;
                case "error":
                    return errorColor;
                case "memory":
                    return memoryColor;
                case "arcana":
                case "identity":
                    return arcanaColor;
                default:
                    return outputColor;
            }
        }

        /// <summary>
        /// Get random glitch character.
        /// </summary>
        public string GetRandomGlitchChar()
        {
            if (glitchChars == null || glitchChars.Length == 0)
                return "█";
            return glitchChars[Random.Range(0, glitchChars.Length)];
        }

        /// <summary>
        /// Create default config.
        /// </summary>
        public static TerminalVisualConfig CreateDefault()
        {
            var config = CreateInstance<TerminalVisualConfig>();
            return config;
        }
    }
}

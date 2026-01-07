namespace Cristal.CLI.Core
{
    /// <summary>
    /// Interface for terminal UI operations - enables testing without Unity dependencies.
    /// </summary>
    public interface ITerminalUI
    {
        /// <summary>
        /// Display text with optional styling.
        /// </summary>
        void DisplayText(string text, TerminalTextStyle style = null);

        /// <summary>
        /// Display response lines with typewriter effect.
        /// </summary>
        void DisplayResponse(TerminalResponse response);

        /// <summary>
        /// Clear terminal output.
        /// </summary>
        void Clear();

        /// <summary>
        /// Enable/disable input.
        /// </summary>
        void SetInputEnabled(bool enabled);

        /// <summary>
        /// Focus input field.
        /// </summary>
        void Focus();

        /// <summary>
        /// Scroll to bottom of output.
        /// </summary>
        void ScrollToBottom();
    }

    /// <summary>
    /// Text styling options for terminal display.
    /// </summary>
    public class TerminalTextStyle
    {
        public string ColorHex { get; set; } = "#99FF99";
        public bool Glitch { get; set; } = false;
        public float GlitchIntensity { get; set; } = 0.05f;
        public float TypeSpeed { get; set; } = 0.03f;
        public bool Instant { get; set; } = false;

        public static TerminalTextStyle Default => new TerminalTextStyle();
        public static TerminalTextStyle System => new TerminalTextStyle { ColorHex = "#5577FF" };
        public static TerminalTextStyle Error => new TerminalTextStyle { ColorHex = "#FF4444" };
        public static TerminalTextStyle Memory => new TerminalTextStyle { ColorHex = "#FFCC66" };
        public static TerminalTextStyle Corrupted => new TerminalTextStyle 
        { 
            ColorHex = "#FF4444", 
            Glitch = true, 
            GlitchIntensity = 0.3f 
        };
    }
}

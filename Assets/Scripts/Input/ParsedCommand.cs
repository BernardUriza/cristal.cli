using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

namespace Cristal.CLI.Input
{
    /// <summary>
    /// Represents a parsed player input with command, arguments, and metadata.
    /// </summary>
    public struct ParsedCommand
    {
        /// <summary>
        /// The original raw input string.
        /// </summary>
        public string Raw;

        /// <summary>
        /// The command keyword (first word) or null if no command structure.
        /// </summary>
        public string Command;

        /// <summary>
        /// Array of arguments following the command.
        /// </summary>
        public string[] Arguments;

        /// <summary>
        /// All arguments as a single string.
        /// </summary>
        public string ArgumentString;

        /// <summary>
        /// Whether this input has a recognizable command structure.
        /// </summary>
        public bool IsCommand;

        /// <summary>
        /// Whether this is a semantic signal (meaningful non-command input).
        /// </summary>
        public bool IsSemanticSignal;

        /// <summary>
        /// The type of semantic signal if detected.
        /// </summary>
        public SemanticSignalType SignalType;

        /// <summary>
        /// Emotional weight detected in the input.
        /// </summary>
        public float EmotionalWeight;

        /// <summary>
        /// Keywords extracted from the input.
        /// </summary>
        public List<string> Keywords;

        /// <summary>
        /// Check if a specific argument exists.
        /// </summary>
        public bool HasArgument(string arg)
        {
            if (Arguments == null) return false;
            foreach (var a in Arguments)
            {
                if (a.Equals(arg, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        /// <summary>
        /// Get argument at index, or null if not present.
        /// </summary>
        public string GetArgument(int index)
        {
            if (Arguments == null || index < 0 || index >= Arguments.Length)
                return null;
            return Arguments[index];
        }

        /// <summary>
        /// Get the number of arguments.
        /// </summary>
        public int ArgumentCount => Arguments?.Length ?? 0;

        public override string ToString()
        {
            if (IsCommand)
            {
                return $"[CMD] {Command} [{string.Join(", ", Arguments ?? new string[0])}]";
            }
            return $"[SIGNAL:{SignalType}] {Raw}";
        }
    }

    /// <summary>
    /// Types of semantic signals detected in non-command inputs.
    /// </summary>
    public enum SemanticSignalType
    {
        None,
        Question,       // Contains ?
        Emotional,      // Contains emotional keywords
        Philosophical,  // Deep/existential questions
        Identity,       // Who/what am I
        Memory,         // Remember/recall
        Ritual,         // Invoke/summon/arcana
        Vision,         // See/vision/look
        Affirmation,    // Yes/ok/continue
        Negation,       // No/stop/cancel
        Greeting,       // Hello/hi
        Farewell,       // Bye/exit/quit
        Profanity,      // Frustrated input
        Nonsense,       // Random characters
        Empty           // Whitespace only
    }

    /// <summary>
    /// Known commands that CRISTAL recognizes.
    /// </summary>
    public static class KnownCommands
    {
        public static readonly HashSet<string> Commands = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            // System commands
            "help",
            "status",
            "clear",
            "reset",
            "save",
            "load",
            "export",

            // Navigation commands
            "read",
            "list",
            "show",
            "view",

            // Vision commands
            "see",
            "visions",
            "vision",

            // Interaction commands
            "invoke",
            "summon",
            "activate",
            "unlock",

            // Memory commands
            "remember",
            "recall",
            "forget",
            "log",

            // Meta commands
            "echo",
            "corrupt",
            "stabilize",
            "seek"
        };

        public static bool IsKnownCommand(string word)
        {
            return Commands.Contains(word);
        }
    }
}

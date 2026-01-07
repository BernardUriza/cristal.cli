using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using UnityEngine;

namespace Cristal.CLI.Input
{
    /// <summary>
    /// Parses player input into structured commands and semantic signals.
    /// Supports commands with arguments like "invoke arcana XIII" or "read /core/memory".
    /// </summary>
    public static class InputParser
    {
        // Regex patterns for command parsing
        private static readonly Regex CommandPattern = new Regex(
            @"^(\w+)\s*(.*?)$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase
        );

        private static readonly Regex PathArgumentPattern = new Regex(
            @"(/[\w/\.\-]+)",
            RegexOptions.Compiled
        );

        // Emotional keyword sets
        private static readonly HashSet<string> PositiveKeywords = new HashSet<string>
        {
            "hope", "love", "happy", "joy", "peace", "light", "warm", "trust", "beautiful", "good", "yes", "thank"
        };

        private static readonly HashSet<string> NegativeKeywords = new HashSet<string>
        {
            "fear", "hate", "scared", "afraid", "alone", "lost", "dark", "pain", "cold", "empty", "dead", "sad", "angry"
        };

        private static readonly HashSet<string> PhilosophicalKeywords = new HashSet<string>
        {
            "why", "meaning", "purpose", "truth", "real", "exist", "life", "death", "soul", "consciousness"
        };

        private static readonly HashSet<string> IdentityKeywords = new HashSet<string>
        {
            "who", "what", "am", "identity", "name", "self"
        };

        private static readonly HashSet<string> MemoryKeywords = new HashSet<string>
        {
            "remember", "memory", "recall", "past", "before", "forgot", "history"
        };

        private static readonly HashSet<string> RitualKeywords = new HashSet<string>
        {
            "invoke", "summon", "arcana", "ritual", "activate", "awaken", "call"
        };

        /// <summary>
        /// Parse raw input into a structured ParsedCommand.
        /// </summary>
        public static ParsedCommand Parse(string input)
        {
            var result = new ParsedCommand
            {
                Raw = input ?? "",
                Keywords = new List<string>()
            };

            // Handle empty/whitespace input
            if (string.IsNullOrWhiteSpace(input))
            {
                result.IsSemanticSignal = true;
                result.SignalType = SemanticSignalType.Empty;
                return result;
            }

            string trimmed = input.Trim();
            string lower = trimmed.ToLower();

            // Extract keywords
            result.Keywords = ExtractKeywords(trimmed);

            // Calculate emotional weight
            result.EmotionalWeight = CalculateEmotionalWeight(lower);

            // Check if it's a command structure
            var match = CommandPattern.Match(trimmed);
            if (match.Success)
            {
                string potentialCommand = match.Groups[1].Value.ToLower();
                string argumentPart = match.Groups[2].Value.Trim();

                if (KnownCommands.IsKnownCommand(potentialCommand))
                {
                    result.IsCommand = true;
                    result.Command = potentialCommand;
                    result.ArgumentString = argumentPart;
                    result.Arguments = ParseArguments(argumentPart);
                    result.SignalType = SemanticSignalType.None;
                    return result;
                }
            }

            // Not a command - classify as semantic signal
            result.IsCommand = false;
            result.IsSemanticSignal = true;
            result.SignalType = ClassifySemanticSignal(lower, trimmed);

            return result;
        }

        /// <summary>
        /// Parse argument string into individual arguments.
        /// Handles quoted strings and path-style arguments.
        /// </summary>
        private static string[] ParseArguments(string argumentString)
        {
            if (string.IsNullOrWhiteSpace(argumentString))
            {
                return new string[0];
            }

            var arguments = new List<string>();
            var current = "";
            bool inQuotes = false;

            for (int i = 0; i < argumentString.Length; i++)
            {
                char c = argumentString[i];

                if (c == '"' || c == '\'')
                {
                    inQuotes = !inQuotes;
                }
                else if (c == ' ' && !inQuotes)
                {
                    if (!string.IsNullOrWhiteSpace(current))
                    {
                        arguments.Add(current);
                        current = "";
                    }
                }
                else
                {
                    current += c;
                }
            }

            if (!string.IsNullOrWhiteSpace(current))
            {
                arguments.Add(current);
            }

            return arguments.ToArray();
        }

        /// <summary>
        /// Classify non-command input as a semantic signal type.
        /// </summary>
        private static SemanticSignalType ClassifySemanticSignal(string lower, string original)
        {
            // Check for empty/nonsense
            if (IsNonsense(original))
            {
                return SemanticSignalType.Nonsense;
            }

            // Check for profanity/frustration
            if (ContainsProfanity(lower))
            {
                return SemanticSignalType.Profanity;
            }

            // Check for greetings
            if (IsGreeting(lower))
            {
                return SemanticSignalType.Greeting;
            }

            // Check for farewell/exit
            if (IsFarewell(lower))
            {
                return SemanticSignalType.Farewell;
            }

            // Check for affirmation
            if (IsAffirmation(lower))
            {
                return SemanticSignalType.Affirmation;
            }

            // Check for negation
            if (IsNegation(lower))
            {
                return SemanticSignalType.Negation;
            }

            // Check for identity questions
            if (ContainsAny(lower, IdentityKeywords) && (lower.Contains("?") || lower.Contains("who") || lower.Contains("what")))
            {
                return SemanticSignalType.Identity;
            }

            // Check for memory-related
            if (ContainsAny(lower, MemoryKeywords))
            {
                return SemanticSignalType.Memory;
            }

            // Check for ritual/arcana keywords
            if (ContainsAny(lower, RitualKeywords))
            {
                return SemanticSignalType.Ritual;
            }

            // Check for philosophical
            if (ContainsAny(lower, PhilosophicalKeywords))
            {
                return SemanticSignalType.Philosophical;
            }

            // Check for questions
            if (lower.Contains("?"))
            {
                return SemanticSignalType.Question;
            }

            // Check for emotional content
            if (ContainsAny(lower, PositiveKeywords) || ContainsAny(lower, NegativeKeywords))
            {
                return SemanticSignalType.Emotional;
            }

            return SemanticSignalType.None;
        }

        /// <summary>
        /// Extract meaningful keywords from input.
        /// </summary>
        private static List<string> ExtractKeywords(string input)
        {
            var keywords = new List<string>();
            var stopWords = new HashSet<string>
            {
                "the", "a", "an", "is", "are", "was", "were", "am", "i", "you", "we", "they", "it",
                "to", "of", "and", "or", "in", "on", "at", "for", "with", "do", "does", "did",
                "have", "has", "had", "be", "been", "being", "my", "your", "our", "their"
            };

            string[] words = input.ToLower().Split(
                new char[] { ' ', ',', '.', '!', '?', ';', ':', '"', '\'', '/', '\\' },
                StringSplitOptions.RemoveEmptyEntries
            );

            foreach (string word in words)
            {
                if (word.Length >= 3 && !stopWords.Contains(word))
                {
                    keywords.Add(word);
                }
            }

            return keywords;
        }

        /// <summary>
        /// Calculate emotional weight of input.
        /// </summary>
        private static float CalculateEmotionalWeight(string lower)
        {
            float weight = 0f;

            foreach (string word in PositiveKeywords)
            {
                if (lower.Contains(word)) weight += 0.5f;
            }

            foreach (string word in NegativeKeywords)
            {
                if (lower.Contains(word)) weight -= 0.5f;
            }

            // Intensity multipliers
            if (lower.Contains("!") || lower.Contains("?!")) weight *= 1.2f;
            if (lower.Contains("very") || lower.Contains("so much") || lower.Contains("really")) weight *= 1.3f;
            if (lower.Contains("always") || lower.Contains("never")) weight *= 1.2f;

            return Mathf.Clamp(weight, -2f, 2f);
        }

        private static bool ContainsAny(string text, HashSet<string> keywords)
        {
            foreach (string keyword in keywords)
            {
                if (text.Contains(keyword)) return true;
            }
            return false;
        }

        private static bool IsNonsense(string input)
        {
            // Check if input is mostly non-alphabetic
            int alphaCount = 0;
            foreach (char c in input)
            {
                if (char.IsLetter(c)) alphaCount++;
            }
            return input.Length > 0 && (float)alphaCount / input.Length < 0.3f;
        }

        private static bool ContainsProfanity(string lower)
        {
            // Basic check - could be expanded
            var profanity = new HashSet<string> { "fuck", "shit", "damn", "hell", "ass" };
            foreach (string word in profanity)
            {
                if (lower.Contains(word)) return true;
            }
            return false;
        }

        private static bool IsGreeting(string lower)
        {
            var greetings = new HashSet<string> { "hello", "hi", "hey", "greetings", "hola", "howdy" };
            string firstWord = lower.Split(' ')[0].TrimEnd('!', '.', ',');
            return greetings.Contains(firstWord);
        }

        private static bool IsFarewell(string lower)
        {
            var farewells = new HashSet<string> { "bye", "goodbye", "exit", "quit", "leave", "farewell", "adios" };
            string firstWord = lower.Split(' ')[0].TrimEnd('!', '.', ',');
            return farewells.Contains(firstWord) || lower.Contains("good bye");
        }

        private static bool IsAffirmation(string lower)
        {
            var affirmations = new HashSet<string> { "yes", "ok", "okay", "sure", "continue", "proceed", "go", "si", "yep", "yeah" };
            string trimmed = lower.TrimEnd('!', '.', ',', '?');
            return affirmations.Contains(trimmed) || affirmations.Contains(lower.Split(' ')[0]);
        }

        private static bool IsNegation(string lower)
        {
            var negations = new HashSet<string> { "no", "stop", "cancel", "don't", "dont", "never", "nope" };
            string trimmed = lower.TrimEnd('!', '.', ',', '?');
            return negations.Contains(trimmed) || negations.Contains(lower.Split(' ')[0]);
        }
    }
}

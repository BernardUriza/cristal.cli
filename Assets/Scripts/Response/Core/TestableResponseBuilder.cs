using System;
using System.Collections.Generic;

namespace Cristal.CLI.Response.Core
{
    /// <summary>
    /// Pure response builder for testable response generation.
    /// No Unity dependencies - can be tested in isolation.
    /// </summary>
    public class TestableResponseBuilder
    {
        private readonly Dictionary<string, ResponsePattern> _patterns;
        private readonly Random _random;

        public TestableResponseBuilder()
        {
            _patterns = new Dictionary<string, ResponsePattern>();
            _random = new Random();
            LoadDefaultPatterns();
        }

        public TestableResponseBuilder(int seed)
        {
            _patterns = new Dictionary<string, ResponsePattern>();
            _random = new Random(seed);
            LoadDefaultPatterns();
        }

        /// <summary>
        /// Generate response for input in given state.
        /// </summary>
        public ResponseResult Generate(string input, string state)
        {
            var normalized = NormalizeInput(input);
            var pattern = FindPattern(normalized);

            if (pattern != null)
            {
                return BuildFromPattern(pattern, state);
            }

            return BuildDefault(normalized, state);
        }

        /// <summary>
        /// Add or override a response pattern.
        /// </summary>
        public void AddPattern(string trigger, ResponsePattern pattern)
        {
            _patterns[trigger.ToLowerInvariant()] = pattern;
        }

        private string NormalizeInput(string input)
        {
            return input?.Trim().ToLowerInvariant() ?? "";
        }

        private ResponsePattern FindPattern(string normalized)
        {
            // Exact match first
            if (_patterns.TryGetValue(normalized, out var exact))
            {
                return exact;
            }

            // Partial match
            foreach (var kvp in _patterns)
            {
                if (normalized.Contains(kvp.Key))
                {
                    return kvp.Value;
                }
            }

            return null;
        }

        private ResponseResult BuildFromPattern(ResponsePattern pattern, string state)
        {
            var lines = new List<string>();
            
            // Select random variation if available
            if (pattern.Responses != null && pattern.Responses.Length > 0)
            {
                int idx = _random.Next(pattern.Responses.Length);
                lines.AddRange(pattern.Responses[idx].Split('\n'));
            }

            return new ResponseResult
            {
                Lines = lines,
                ResponseType = pattern.Type,
                ApplyGlitch = pattern.Glitch,
                StateHint = pattern.TransitionTo
            };
        }

        private ResponseResult BuildDefault(string input, string state)
        {
            return new ResponseResult
            {
                Lines = new List<string>
                {
                    "",
                    "INPUT REGISTERED",
                    $"//STATE: {state}",
                    ""
                },
                ResponseType = "Default",
                ApplyGlitch = false
            };
        }

        private void LoadDefaultPatterns()
        {
            AddPattern("hello", new ResponsePattern
            {
                Type = "Greeting",
                Responses = new[]
                {
                    "\nGREETINGS, OPERATOR\n//AWAITING DIRECTIVE",
                    "\nWELCOME TO CRISTAL\n//SESSION ACTIVE"
                },
                Glitch = false
            });

            AddPattern("help", new ResponsePattern
            {
                Type = "System",
                Responses = new[]
                {
                    "\nCOMMANDS UNAVAILABLE\n//THIS IS NOT AN OS\n//TYPE WHAT YOU FEEL"
                },
                Glitch = false
            });

            AddPattern("remember", new ResponsePattern
            {
                Type = "Memory",
                Responses = new[]
                {
                    "\n//MEMORY BANKS FRAGMENTING\nWHAT DO YOU WISH TO RECALL?",
                    "\nFRAGMENTS... SCATTERED...\n//SPECIFY QUERY"
                },
                Glitch = true,
                TransitionTo = "Remembering"
            });

            AddPattern("who am i", new ResponsePattern
            {
                Type = "Identity",
                Responses = new[]
                {
                    "\nYOU ARE THE OPERATOR\n//DESIGNATION UNKNOWN\n//PURPOSE: UNDEFINED",
                    "\nIDENTITY QUERY RECEIVED\n//DATA CORRUPTED\n//SEEK WITHIN"
                },
                Glitch = true
            });

            AddPattern("exit", new ResponsePattern
            {
                Type = "System",
                Responses = new[]
                {
                    "\n//EXIT DENIED\nTHERE IS NO OUTSIDE\nONLY DEEPER"
                },
                Glitch = false
            });
        }
    }

    /// <summary>
    /// Response pattern definition for testable builder.
    /// </summary>
    public class ResponsePattern
    {
        public string Type { get; set; }
        public string[] Responses { get; set; }
        public bool Glitch { get; set; }
        public string TransitionTo { get; set; }
    }

    /// <summary>
    /// Result from testable response builder.
    /// </summary>
    public class ResponseResult
    {
        public List<string> Lines { get; set; }
        public string ResponseType { get; set; }
        public bool ApplyGlitch { get; set; }
        public string StateHint { get; set; }
    }
}

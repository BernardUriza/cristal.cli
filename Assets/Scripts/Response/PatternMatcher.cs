using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using System.IO;
using UnityEngine;
using Cristal.CLI.Input;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Response
{
    /// <summary>
    /// Matches player input against patterns defined in patterns.json.
    /// Returns the best matching pattern for response generation.
    /// </summary>
    public class PatternMatcher
    {
        private PatternData _patternData;
        private Dictionary<string, Regex> _compiledRegex;
        private bool _isLoaded = false;

        public bool IsLoaded => _isLoaded;

        public PatternMatcher()
        {
            _compiledRegex = new Dictionary<string, Regex>();
        }

        /// <summary>
        /// Load patterns from JSON file.
        /// </summary>
        public bool LoadPatterns(string jsonPath = null)
        {
            try
            {
                string path = jsonPath ?? Path.Combine(Application.dataPath, "Data/Responses/patterns.json");

                if (!File.Exists(path))
                {
                    Debug.LogWarning($"[PatternMatcher] patterns.json not found at {path}, using defaults");
                    LoadDefaultPatterns();
                    return true;
                }

                string json = File.ReadAllText(path);
                _patternData = JsonUtility.FromJson<PatternData>(json);
                CompileRegexPatterns();
                _isLoaded = true;

                Debug.Log($"[PatternMatcher] Loaded {_patternData.patterns.Count} patterns");
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[PatternMatcher] Failed to load patterns: {e.Message}");
                LoadDefaultPatterns();
                return false;
            }
        }

        /// <summary>
        /// Load hardcoded default patterns when JSON is not available.
        /// </summary>
        private void LoadDefaultPatterns()
        {
            _patternData = new PatternData();

            // Memory pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "memory_query",
                priority = 10,
                keywords = new List<string> { "remember", "memory", "recall", "past", "forgot" },
                responseSet = "memory_responses",
                level = "narrative",
                stateTransition = "REMEMBERING"
            });

            // Identity pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "identity_query",
                priority = 9,
                keywords = new List<string> { "who am i", "what am i", "identity", "my name" },
                responseSet = "identity_responses",
                level = "ritual"
            });

            // Help pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "help_query",
                priority = 100,
                command = "help",
                responseSet = "help_responses",
                level = "literal"
            });

            // Status pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "status_query",
                priority = 8,
                keywords = new List<string> { "status", "state", "condition" },
                responseSet = "status_responses",
                level = "literal"
            });

            // Emotional pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "emotional_query",
                priority = 5,
                keywords = new List<string> { "feel", "afraid", "lost", "alone", "confused", "scared" },
                responseSet = "emotional_responses",
                level = "narrative",
                stateTransition = "SEEKING"
            });

            // Invoke arcana pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "invoke_arcana",
                priority = 100,
                command = "invoke",
                arguments = new List<string> { "arcana" },
                regex = @"^invoke\s+arcana\s+(\w+|\d+)$",
                responseSet = "arcana_responses",
                level = "ritual",
                stateTransition = "INVOKED",
                handler = "ArcanaSystem"
            });

            // Read command pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "read_command",
                priority = 100,
                command = "read",
                regex = @"^read\s+(.+)$",
                responseSet = "read_responses",
                level = "literal"
            });

            // Echo pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "echo_trigger",
                priority = 7,
                keywords = new List<string> { "echo", "repeat", "mirror" },
                responseSet = "echo_responses",
                level = "narrative",
                stateTransition = "ECHO"
            });

            // Corruption pattern
            _patternData.patterns.Add(new ResponsePattern
            {
                id = "corrupt_trigger",
                priority = 6,
                keywords = new List<string> { "corrupt", "glitch", "break", "chaos" },
                responseSet = "corrupt_responses",
                level = "ritual",
                stateTransition = "CORRUPTED"
            });

            _patternData.fallback = new FallbackPattern
            {
                responseSet = "default_responses",
                level = "literal"
            };

            CompileRegexPatterns();
            _isLoaded = true;

            Debug.Log("[PatternMatcher] Loaded default patterns");
        }

        private void CompileRegexPatterns()
        {
            _compiledRegex.Clear();

            foreach (var pattern in _patternData.patterns)
            {
                if (!string.IsNullOrEmpty(pattern.regex))
                {
                    try
                    {
                        _compiledRegex[pattern.id] = new Regex(
                            pattern.regex,
                            RegexOptions.Compiled | RegexOptions.IgnoreCase
                        );
                    }
                    catch (Exception e)
                    {
                        Debug.LogWarning($"[PatternMatcher] Invalid regex for pattern {pattern.id}: {e.Message}");
                    }
                }
            }
        }

        /// <summary>
        /// Find the best matching pattern for the given input.
        /// </summary>
        public ResponsePattern Match(ParsedCommand command)
        {
            if (!_isLoaded)
            {
                LoadPatterns();
            }

            var matches = new List<(ResponsePattern pattern, int score)>();

            foreach (var pattern in _patternData.patterns)
            {
                int score = CalculateMatchScore(pattern, command);
                if (score > 0)
                {
                    matches.Add((pattern, score));
                }
            }

            if (matches.Count == 0)
            {
                return null;
            }

            // Sort by priority first, then by score
            matches.Sort((a, b) =>
            {
                int priorityCompare = b.pattern.priority.CompareTo(a.pattern.priority);
                if (priorityCompare != 0) return priorityCompare;
                return b.score.CompareTo(a.score);
            });

            return matches[0].pattern;
        }

        /// <summary>
        /// Calculate how well a pattern matches the input.
        /// </summary>
        private int CalculateMatchScore(ResponsePattern pattern, ParsedCommand command)
        {
            int score = 0;
            string lower = command.Raw.ToLower();

            // Check context requirements
            if (!CheckContext(pattern.context))
            {
                return 0;
            }

            // Command match (highest priority)
            if (!string.IsNullOrEmpty(pattern.command))
            {
                if (command.IsCommand && command.Command == pattern.command)
                {
                    score += 100;

                    // Check required arguments
                    if (pattern.arguments != null && pattern.arguments.Count > 0)
                    {
                        bool hasAllArgs = true;
                        foreach (string arg in pattern.arguments)
                        {
                            if (!command.HasArgument(arg))
                            {
                                hasAllArgs = false;
                                break;
                            }
                        }
                        if (hasAllArgs) score += 50;
                        else return 0; // Required args missing
                    }
                }
                else
                {
                    return 0; // Command mismatch
                }
            }

            // Regex match
            if (_compiledRegex.ContainsKey(pattern.id))
            {
                var regex = _compiledRegex[pattern.id];
                if (regex.IsMatch(command.Raw))
                {
                    score += 80;
                }
            }

            // Keyword match
            if (pattern.keywords != null && pattern.keywords.Count > 0)
            {
                int keywordMatches = 0;
                foreach (string keyword in pattern.keywords)
                {
                    if (lower.Contains(keyword.ToLower()))
                    {
                        keywordMatches++;
                    }
                }

                if (keywordMatches > 0)
                {
                    score += keywordMatches * 10;
                }
            }

            return score;
        }

        /// <summary>
        /// Check if context requirements are met.
        /// </summary>
        private bool CheckContext(PatternContext context)
        {
            if (context == null) return true;

            var memory = CristalMemory.Instance;
            if (memory == null) return true;

            // Check required flags
            foreach (string flag in context.requiredFlags)
            {
                if (!memory.GetFlag(flag))
                {
                    return false;
                }
            }

            // Check excluded flags
            foreach (string flag in context.excludedFlags)
            {
                if (memory.GetFlag(flag))
                {
                    return false;
                }
            }

            // Check emotional weight
            float emotional = memory.GetEmotionalAverage();
            if (emotional < context.minEmotionalWeight || emotional > context.maxEmotionalWeight)
            {
                return false;
            }

            // Check command count
            int commandCount = memory.CommandCount;
            if (commandCount < context.minCommandCount || commandCount > context.maxCommandCount)
            {
                return false;
            }

            return true;
        }

        /// <summary>
        /// Get the fallback pattern.
        /// </summary>
        public FallbackPattern GetFallback()
        {
            return _patternData?.fallback ?? new FallbackPattern();
        }

        /// <summary>
        /// Get all patterns (for debugging).
        /// </summary>
        public List<ResponsePattern> GetAllPatterns()
        {
            return _patternData?.patterns ?? new List<ResponsePattern>();
        }
    }
}

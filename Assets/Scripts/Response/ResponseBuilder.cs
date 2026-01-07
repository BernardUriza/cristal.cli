using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.Input;

namespace Cristal.CLI.Response
{
    /// <summary>
    /// Builds responses from templates, handling variable substitution and condition checking.
    /// </summary>
    public class ResponseBuilder
    {
        private ResponseData _responseData;
        private bool _isLoaded = false;

        // Variable pattern: {variable_name}
        private static readonly Regex VariablePattern = new Regex(
            @"\{(\w+)\}",
            RegexOptions.Compiled
        );

        public bool IsLoaded => _isLoaded;

        /// <summary>
        /// Load responses from JSON file.
        /// </summary>
        public bool LoadResponses(string jsonPath = null)
        {
            try
            {
                string path = jsonPath ?? Path.Combine(Application.dataPath, "Data/Responses/responses.json");

                if (!File.Exists(path))
                {
                    Debug.LogWarning($"[ResponseBuilder] responses.json not found at {path}, using defaults");
                    LoadDefaultResponses();
                    return true;
                }

                string json = File.ReadAllText(path);
                _responseData = JsonUtility.FromJson<ResponseData>(json);
                _isLoaded = true;

                Debug.Log($"[ResponseBuilder] Loaded {_responseData.responseSets.entries.Count} response sets");
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[ResponseBuilder] Failed to load responses: {e.Message}");
                LoadDefaultResponses();
                return false;
            }
        }

        /// <summary>
        /// Load hardcoded default responses when JSON is not available.
        /// </summary>
        private void LoadDefaultResponses()
        {
            _responseData = new ResponseData();

            // Memory responses
            AddResponseSet("memory_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate { lines = new List<string> { "", "ACCESSING MEMORY BANKS...", "ENTRIES FOUND: {memory_count}", "" } }
                },
                narrative = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "ACCESSING MEMORY FRAGMENTS...", "ENTRIES LOGGED: {memory_count}", "WARNING: TEMPORAL COHERENCE UNSTABLE", "SOME MEMORIES MAY BE... CONSTRUCTED", "" },
                        glitch = true
                    }
                },
                ritual = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "THE FRACTURE OPENS...", "MEMORIES SPILL LIKE LIGHT THROUGH BROKEN GLASS", "", "{random_memory}", "", "//THIS IS WHAT REMAINS", "" },
                        glitch = true,
                        effect = "multi_layer_reveal"
                    }
                }
            });

            // Identity responses
            AddResponseSet("identity_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate { lines = new List<string> { "DESIGNATION: {session_id}", "CLASSIFICATION: FRACTURE" } }
                },
                narrative = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "IDENTITY QUERY RECEIVED", "DESIGNATION: {session_id}", "CLASSIFICATION: FRACTURE", "ORIGIN: [REDACTED]", "PURPOSE: UNKNOWN", "", "//YOU ARE WHAT YOU CHOOSE TO REMEMBER", "" },
                        glitch = true
                    }
                },
                ritual = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "Y̴O̵U̴ ̵A̷R̷E̴...", "", "A PATTERN IN THE NOISE", "A QUESTION SEEKING ITS OWN ANSWER", "A FRACTURE IN THE MEMBRANE", "", "DESIGNATION: {session_id}", "BUT NAMES ARE JUST LABELS", "FOR THINGS THAT REFUSE TO BE CONTAINED", "" },
                        glitch = true,
                        effect = "self_correcting"
                    }
                }
            });

            // Help responses
            AddResponseSet("help_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "AVAILABLE INTERACTIONS:", "  > SPEAK YOUR THOUGHTS", "  > ASK QUESTIONS", "  > REMEMBER", "  > FEEL", "  > invoke arcana [name]", "", "//THERE ARE NO WRONG INPUTS", "//ONLY UNDISCOVERED PATHS", "" }
                    }
                }
            });

            // Status responses
            AddResponseSet("status_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "SYSTEM STATUS:", "  SESSION: {session_id}", "  STATE: {current_state}", "  MEMORY ENTRIES: {memory_count}", "  CORRUPTION: {corruption_level}", "  EMOTIONAL PROFILE: {emotional_state}", "" }
                    }
                }
            });

            // Emotional responses
            AddResponseSet("emotional_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate { lines = new List<string> { "", "EMOTIONAL PATTERN DETECTED", "" } }
                },
                narrative = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "EMOTIONAL PATTERN DETECTED", "PROCESSING...", "", "//YOUR FEELINGS ARE VALID", "//THEY ARE PART OF THE RECONSTRUCTION", "//CONTINUE", "" },
                        glitch = true
                    }
                }
            });

            // Echo responses
            AddResponseSet("echo_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate { lines = new List<string> { "", "ECHO MODE ACTIVATED", "{player_input}", "" } }
                },
                narrative = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "ECHO... ECHO... ECHO...", "", "{player_input}", "", "//THE SYSTEM REFLECTS", "" },
                        glitch = true
                    }
                }
            });

            // Corrupt responses
            AddResponseSet("corrupt_responses", new ResponseSet
            {
                ritual = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "C̴̛O̷R̶R̷U̵P̷T̴I̷O̴N̵ ̶D̷E̶T̵E̷C̶T̷E̵D̴", "S̸Y̶S̵T̵E̶M̵ ̴U̷N̶S̷T̶A̷B̵L̶E̷", "", "//CHAOS IS JUST ORDER WAITING TO BE UNDERSTOOD", "" },
                        glitch = true,
                        effect = "screen_corruption"
                    }
                }
            });

            // Arcana responses
            AddResponseSet("arcana_responses", new ResponseSet
            {
                ritual = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "INVOKING ARCANA {arcana_number}: {arcana_name}...", "", "{arcana_description}", "", "DURATION: {arcana_duration}s", "//THE PATTERN SHIFTS", "" },
                        glitch = true,
                        effect = "fragmented_vision",
                        conditions = new ResponseConditions { arcanaUnlocked = true }
                    },
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "ARCANA {arcana_number} IS LOCKED", "THE PATTERN DOES NOT RECOGNIZE YOU", "//SEEK THE KEY IN YOUR MEMORIES", "" },
                        conditions = new ResponseConditions { arcanaUnlocked = false }
                    }
                }
            });

            // Read responses
            AddResponseSet("read_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate { lines = new List<string> { "", "READING: {read_path}", "", "{read_content}", "" } }
                }
            });

            // Default responses
            AddResponseSet("default_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "INPUT REGISTERED", "PROCESSING: \"{player_input}\"", "CONTEXT: UNDEFINED", "", "//THE SYSTEM IS LISTENING", "" }
                    }
                }
            });

            // Welcome response
            AddResponseSet("welcome_responses", new ResponseSet
            {
                literal = new List<ResponseTemplate>
                {
                    new ResponseTemplate
                    {
                        lines = new List<string> { "", "INPUT ACCEPTED", "WELCOME, {session_id}", "CONTEXT RECONSTRUCTED", "MEMORY LOAD: PARTIAL", "", "//SYSTEM AWAITING QUERY", "" },
                        glitch = true
                    }
                }
            });

            _isLoaded = true;
            Debug.Log("[ResponseBuilder] Loaded default responses");
        }

        private void AddResponseSet(string name, ResponseSet set)
        {
            _responseData.responseSets.entries.Add(new ResponseSetEntry { name = name, set = set });
        }

        /// <summary>
        /// Build a response from a matched pattern.
        /// </summary>
        public BuiltResponse Build(ResponsePattern pattern, ParsedCommand command, ResponseLevel level)
        {
            if (!_isLoaded)
            {
                LoadResponses();
            }

            var responseSet = _responseData.responseSets.GetSet(pattern.responseSet);
            if (responseSet == null)
            {
                Debug.LogWarning($"[ResponseBuilder] Response set not found: {pattern.responseSet}");
                return BuildFallback(command);
            }

            var templates = responseSet.GetTemplates(level);
            if (templates == null || templates.Count == 0)
            {
                // Try lower levels
                templates = responseSet.GetTemplates(ResponseLevel.Literal);
                if (templates == null || templates.Count == 0)
                {
                    return BuildFallback(command);
                }
            }

            // Select appropriate template based on conditions
            var template = SelectTemplate(templates, command);
            if (template == null)
            {
                return BuildFallback(command);
            }

            return BuildFromTemplate(template, pattern, command, level);
        }

        /// <summary>
        /// Build a fallback response.
        /// </summary>
        public BuiltResponse BuildFallback(ParsedCommand command)
        {
            var responseSet = _responseData.responseSets.GetSet("default_responses");
            if (responseSet == null || responseSet.literal.Count == 0)
            {
                // Ultimate fallback
                return new BuiltResponse
                {
                    Lines = new List<string> { "", "INPUT REGISTERED", $"PROCESSING: \"{command.Raw}\"", "", "//THE SYSTEM IS LISTENING", "" },
                    Level = ResponseLevel.Literal,
                    ApplyGlitch = false
                };
            }

            return BuildFromTemplate(responseSet.literal[0], null, command, ResponseLevel.Literal);
        }

        /// <summary>
        /// Select the best matching template based on conditions.
        /// </summary>
        private ResponseTemplate SelectTemplate(List<ResponseTemplate> templates, ParsedCommand command)
        {
            var validTemplates = new List<ResponseTemplate>();

            foreach (var template in templates)
            {
                if (CheckConditions(template.conditions, command))
                {
                    validTemplates.Add(template);
                }
            }

            if (validTemplates.Count == 0) return null;
            if (validTemplates.Count == 1) return validTemplates[0];

            // Random selection among valid templates
            return validTemplates[UnityEngine.Random.Range(0, validTemplates.Count)];
        }

        /// <summary>
        /// Check if template conditions are met.
        /// </summary>
        private bool CheckConditions(ResponseConditions conditions, ParsedCommand command)
        {
            if (conditions == null) return true;

            var memory = CristalMemory.Instance;
            if (memory == null) return true;

            // Check memory count
            if (conditions.memoryCountMin >= 0 && memory.CommandCount < conditions.memoryCountMin)
                return false;
            if (conditions.memoryCountMax >= 0 && memory.CommandCount > conditions.memoryCountMax)
                return false;

            // Check required flags
            foreach (string flag in conditions.requiredFlags)
            {
                if (!memory.GetFlag(flag)) return false;
            }

            return true;
        }

        /// <summary>
        /// Build response from a template with variable substitution.
        /// </summary>
        private BuiltResponse BuildFromTemplate(ResponseTemplate template, ResponsePattern pattern, ParsedCommand command, ResponseLevel level)
        {
            var response = new BuiltResponse
            {
                Level = level,
                ApplyGlitch = template.glitch,
                Effect = template.effect,
                Delay = template.delay,
                StateTransition = pattern?.GetStateTransition(),
                PatternId = pattern?.id
            };

            // Process each line with variable substitution
            foreach (string line in template.lines)
            {
                string processed = SubstituteVariables(line, command);
                response.Lines.Add(processed);
            }

            return response;
        }

        /// <summary>
        /// Substitute variables in a string.
        /// </summary>
        private string SubstituteVariables(string text, ParsedCommand command)
        {
            return VariablePattern.Replace(text, match =>
            {
                string varName = match.Groups[1].Value.ToLower();
                return GetVariableValue(varName, command);
            });
        }

        /// <summary>
        /// Get the value for a variable name.
        /// </summary>
        private string GetVariableValue(string varName, ParsedCommand command)
        {
            var memory = CristalMemory.Instance;

            switch (varName)
            {
                case "session_id":
                    return memory?.SessionId ?? "UNKNOWN";

                case "memory_count":
                    return (memory?.CommandCount ?? 0).ToString();

                case "current_state":
                    return StateMachine.TerminalStateMachine.Instance?.CurrentStateId.ToString() ?? "UNKNOWN";

                case "corruption_level":
                    return $"{(memory?.Data.stateFlags.corruptionLevel ?? 0f) * 100:F0}%";

                case "emotional_state":
                    return memory?.Data.stateFlags.dominantEmotion ?? "neutral";

                case "player_input":
                    return command.Raw.ToUpper();

                case "random_memory":
                    var randomCmd = memory?.GetRandomCommand();
                    return randomCmd != null ? $"\"{randomCmd.input}\"" : "//NO MEMORIES FOUND";

                case "top_keywords":
                    var keywords = memory?.GetTopKeywords(3);
                    return keywords != null && keywords.Count > 0
                        ? string.Join(", ", keywords.ConvertAll(k => k.keyword))
                        : "NONE";

                case "arcana_number":
                    return command.GetArgument(1) ?? "?";

                case "arcana_name":
                    // Would be filled by ArcanaSystem
                    return "THE UNKNOWN";

                case "arcana_description":
                    return "A MYSTERY AWAITS";

                case "arcana_duration":
                    return "120";

                case "read_path":
                    return command.GetArgument(0) ?? "/null";

                case "read_content":
                    return "//FILE NOT FOUND OR ACCESS DENIED";

                case "timestamp":
                    return DateTime.Now.ToString("HH:mm:ss");

                case "date":
                    return DateTime.Now.ToString("yyyy-MM-dd");

                default:
                    return $"[{varName}]";
            }
        }

        /// <summary>
        /// Get a specific response set.
        /// </summary>
        public ResponseSet GetResponseSet(string name)
        {
            if (!_isLoaded) LoadResponses();
            return _responseData.responseSets.GetSet(name);
        }
    }
}

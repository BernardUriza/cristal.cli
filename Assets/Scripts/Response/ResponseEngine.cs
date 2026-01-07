using System;
using UnityEngine;
using Cristal.CLI.Input;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Response
{
    /// <summary>
    /// Main response generation coordinator.
    /// Combines pattern matching, response building, and state management.
    /// </summary>
    public class ResponseEngine : MonoBehaviour
    {
        public static ResponseEngine Instance { get; private set; }

        [Header("Settings")]
        [SerializeField] private bool _autoElevateLevel = true;
        [SerializeField] private float _narrativeThreshold = 0.3f;
        [SerializeField] private float _ritualThreshold = 0.6f;

        // Events
        public event Action<BuiltResponse> OnResponseGenerated;
        public event Action<string> OnSpecialHandlerTriggered;

        private PatternMatcher _patternMatcher;
        private ResponseBuilder _responseBuilder;
        private bool _isInitialized = false;

        public bool IsInitialized => _isInitialized;

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
            _patternMatcher = new PatternMatcher();
            _responseBuilder = new ResponseBuilder();

            _patternMatcher.LoadPatterns();
            _responseBuilder.LoadResponses();

            _isInitialized = true;
            Debug.Log("[ResponseEngine] Initialized");
        }

        /// <summary>
        /// Generate a response for the given input.
        /// </summary>
        public BuiltResponse GenerateResponse(string input)
        {
            if (!_isInitialized)
            {
                Initialize();
            }

            // Parse the input
            ParsedCommand command = InputParser.Parse(input);

            // Log to memory
            CristalMemory.Instance?.LogCommand(
                input,
                "Processing",
                TerminalStateMachine.Instance?.CurrentStateId.ToString() ?? "Unknown"
            );

            // Let state machine process first (might block or modify)
            if (TerminalStateMachine.Instance?.ProcessInput(input) == true)
            {
                // State fully handled the input
                return GenerateStateResponse();
            }

            // Match pattern
            ResponsePattern pattern = _patternMatcher.Match(command);

            // Determine response level
            ResponseLevel level = DetermineLevel(command, pattern);

            // Build response
            BuiltResponse response;
            if (pattern != null)
            {
                // Check for special handlers
                if (!string.IsNullOrEmpty(pattern.handler))
                {
                    OnSpecialHandlerTriggered?.Invoke(pattern.handler);
                    // Handler might modify the response
                }

                response = _responseBuilder.Build(pattern, command, level);

                // Handle state transition
                if (response.StateTransition.HasValue)
                {
                    TerminalStateMachine.Instance?.TransitionTo(response.StateTransition.Value);
                }
            }
            else
            {
                response = _responseBuilder.BuildFallback(command);
            }

            // Apply state modifiers
            ApplyStateModifiers(response);

            OnResponseGenerated?.Invoke(response);
            return response;
        }

        /// <summary>
        /// Generate a welcome response (first input).
        /// </summary>
        public BuiltResponse GenerateWelcomeResponse()
        {
            var welcomeSet = _responseBuilder.GetResponseSet("welcome_responses");
            if (welcomeSet != null && welcomeSet.literal.Count > 0)
            {
                var template = welcomeSet.literal[0];
                var response = new BuiltResponse
                {
                    Lines = new System.Collections.Generic.List<string>(),
                    Level = ResponseLevel.Literal,
                    ApplyGlitch = template.glitch
                };

                foreach (string line in template.lines)
                {
                    // Simple variable substitution for session_id
                    string processed = line.Replace("{session_id}", CristalMemory.Instance?.SessionId ?? "UNKNOWN");
                    response.Lines.Add(processed);
                }

                return response;
            }

            return new BuiltResponse
            {
                Lines = new System.Collections.Generic.List<string>
                {
                    "",
                    "INPUT ACCEPTED",
                    $"WELCOME, {CristalMemory.Instance?.SessionId ?? "UNKNOWN"}",
                    "CONTEXT RECONSTRUCTED",
                    "MEMORY LOAD: PARTIAL",
                    "",
                    "//SYSTEM AWAITING QUERY",
                    ""
                },
                Level = ResponseLevel.Literal,
                ApplyGlitch = true
            };
        }

        /// <summary>
        /// Generate a response based on current state.
        /// </summary>
        private BuiltResponse GenerateStateResponse()
        {
            var state = TerminalStateMachine.Instance?.CurrentState;
            if (state == null)
            {
                return _responseBuilder.BuildFallback(new ParsedCommand { Raw = "" });
            }

            var modifier = state.GetResponseModifier();

            return new BuiltResponse
            {
                Lines = new System.Collections.Generic.List<string>
                {
                    "",
                    $"STATE: {state.DisplayName}",
                    "",
                    modifier.Prefix + "PROCESSING...",
                    ""
                },
                Level = ResponseLevel.Literal,
                ApplyGlitch = modifier.GlitchMultiplier > 1f
            };
        }

        /// <summary>
        /// Determine the appropriate response level based on context.
        /// </summary>
        private ResponseLevel DetermineLevel(ParsedCommand command, ResponsePattern pattern)
        {
            // Pattern explicitly specifies level
            if (pattern != null)
            {
                return pattern.GetLevel();
            }

            if (!_autoElevateLevel)
            {
                return ResponseLevel.Literal;
            }

            // Auto-elevate based on context
            var memory = CristalMemory.Instance;
            if (memory == null)
            {
                return ResponseLevel.Literal;
            }

            float progression = CalculateProgressionScore();

            if (progression >= _ritualThreshold)
            {
                return ResponseLevel.Ritual;
            }
            else if (progression >= _narrativeThreshold)
            {
                return ResponseLevel.Narrative;
            }

            // Elevate based on emotional intensity
            if (Mathf.Abs(command.EmotionalWeight) >= 1.5f)
            {
                return ResponseLevel.Narrative;
            }

            // Elevate based on semantic signal type
            if (command.SignalType == SemanticSignalType.Philosophical ||
                command.SignalType == SemanticSignalType.Identity ||
                command.SignalType == SemanticSignalType.Ritual)
            {
                return ResponseLevel.Narrative;
            }

            return ResponseLevel.Literal;
        }

        /// <summary>
        /// Calculate a progression score (0-1) based on player engagement.
        /// </summary>
        private float CalculateProgressionScore()
        {
            var memory = CristalMemory.Instance;
            if (memory == null) return 0f;

            float score = 0f;

            // Command count factor (up to 0.3)
            score += Mathf.Min(memory.CommandCount / 50f, 0.3f);

            // Keyword discovery factor (up to 0.2)
            int uniqueKeywords = memory.Data.discoveredKeywords.entries.Count;
            score += Mathf.Min(uniqueKeywords / 20f, 0.2f);

            // Arcana unlocked factor (up to 0.3)
            int unlockedArcana = memory.Data.arcana.unlocked.Count;
            score += Mathf.Min(unlockedArcana / 7f, 0.3f);

            // Major events factor (up to 0.2)
            int majorEvents = memory.Data.progression.majorEvents.Count;
            score += Mathf.Min(majorEvents / 5f, 0.2f);

            return Mathf.Clamp01(score);
        }

        /// <summary>
        /// Apply state-based modifiers to the response.
        /// </summary>
        private void ApplyStateModifiers(BuiltResponse response)
        {
            var state = TerminalStateMachine.Instance?.CurrentState;
            if (state == null) return;

            var modifier = state.GetResponseModifier();

            // Apply glitch multiplier
            if (modifier.GlitchMultiplier > 1f && !response.ApplyGlitch)
            {
                response.ApplyGlitch = UnityEngine.Random.value < (modifier.GlitchMultiplier - 1f);
            }

            // Apply prefix
            if (!string.IsNullOrEmpty(modifier.Prefix) && response.Lines.Count > 0)
            {
                // Find first non-empty line
                for (int i = 0; i < response.Lines.Count; i++)
                {
                    if (!string.IsNullOrWhiteSpace(response.Lines[i]))
                    {
                        response.Lines[i] = modifier.Prefix + response.Lines[i];
                        break;
                    }
                }
            }

            // Apply suffix
            if (!string.IsNullOrEmpty(modifier.Suffix) && response.Lines.Count > 0)
            {
                response.Lines.Add(modifier.Suffix);
            }

            // Force uppercase
            if (modifier.ForceUppercase)
            {
                for (int i = 0; i < response.Lines.Count; i++)
                {
                    response.Lines[i] = response.Lines[i].ToUpper();
                }
            }
        }

        /// <summary>
        /// Get the pattern matcher for external use.
        /// </summary>
        public PatternMatcher GetPatternMatcher()
        {
            return _patternMatcher;
        }

        /// <summary>
        /// Get the response builder for external use.
        /// </summary>
        public ResponseBuilder GetResponseBuilder()
        {
            return _responseBuilder;
        }

        /// <summary>
        /// Reload patterns and responses from disk.
        /// </summary>
        public void ReloadData()
        {
            _patternMatcher.LoadPatterns();
            _responseBuilder.LoadResponses();
            Debug.Log("[ResponseEngine] Data reloaded");
        }
    }
}

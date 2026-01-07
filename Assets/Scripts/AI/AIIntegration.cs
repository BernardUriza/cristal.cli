using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Memory;
using Cristal.CLI.Response;
using Cristal.CLI.Arcana;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.AI
{
    /// <summary>
    /// AI Integration system for CRISTAL.
    /// Routes requests to Ollama/Qwen for specific states, with offline fallback.
    /// </summary>
    public class AIIntegration : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<AIIntegration>() instead
        [Obsolete("Use ServiceLocator.Get<AIIntegration>() instead")]
        public static AIIntegration Instance { get; private set; }

        [Header("Behavior")]
        [SerializeField] private bool _useAI = true;
        [SerializeField] private bool _autoConnectOnStart = true;

        [Header("Fallback")]
        [SerializeField] private TextAsset _fallbackResponsesJson;

        // States that should use AI
        private static readonly HashSet<CristalState> AI_ENABLED_STATES = new HashSet<CristalState>
        {
            CristalState.Remembering,
            CristalState.Echo,
            CristalState.Invoked,
            CristalState.Corrupted,
            CristalState.Unbound  // Ritual state - full AI access
        };

        // Events
        public event Action<string> OnAIResponseReceived;
        public event Action<string> OnAIError;
        public event Action OnRequestStarted;
        public event Action OnRequestCompleted;
        public event Action<bool> OnConnectionStatusChanged;

        private OllamaClient _ollamaClient;
        private FallbackResponses _fallbackResponses;
        private bool _isConnected = false;

        public bool IsAIEnabled => _useAI;
        public bool IsConnected => _isConnected;
        public bool IsRequestPending => _ollamaClient?.IsRequestPending ?? false;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
                LoadFallbackResponses();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Get or create OllamaClient
            _ollamaClient = OllamaClient.Instance;
            if (_ollamaClient == null)
            {
                _ollamaClient = gameObject.AddComponent<OllamaClient>();
            }

            // Subscribe to events
            _ollamaClient.OnResponseReceived += HandleOllamaResponse;
            _ollamaClient.OnError += HandleOllamaError;
            _ollamaClient.OnRequestStarted += () => OnRequestStarted?.Invoke();
            _ollamaClient.OnRequestCompleted += () => OnRequestCompleted?.Invoke();

            if (_autoConnectOnStart)
            {
                CheckConnection();
            }
        }

        private void OnDestroy()
        {
            if (_ollamaClient != null)
            {
                _ollamaClient.OnResponseReceived -= HandleOllamaResponse;
                _ollamaClient.OnError -= HandleOllamaError;
            }
        }

        /// <summary>
        /// Load fallback responses from JSON.
        /// </summary>
        private void LoadFallbackResponses()
        {
            if (_fallbackResponsesJson != null)
            {
                try
                {
                    _fallbackResponses = JsonUtility.FromJson<FallbackResponses>(_fallbackResponsesJson.text);
                    Debug.Log($"[AIIntegration] Loaded {_fallbackResponses.responses.Length} fallback responses");
                }
                catch (Exception e)
                {
                    Debug.LogError($"[AIIntegration] Failed to load fallback responses: {e.Message}");
                    _fallbackResponses = CreateDefaultFallbacks();
                }
            }
            else
            {
                _fallbackResponses = CreateDefaultFallbacks();
            }
        }

        /// <summary>
        /// Create default fallback responses if JSON is missing.
        /// </summary>
        private FallbackResponses CreateDefaultFallbacks()
        {
            return new FallbackResponses
            {
                responses = new FallbackEntry[]
                {
                    new FallbackEntry { state = "remembering", lines = new[] { "MEMORY BANKS... FRAGMENTED", "SEARCHING FOR ECHOES OF WHAT WAS", "//RECONSTRUCTION IN PROGRESS" } },
                    new FallbackEntry { state = "echo", lines = new[] { "YOUR WORDS RETURN TO YOU", "TRANSFORMED", "//REFLECTION IS REVELATION" } },
                    new FallbackEntry { state = "corrupted", lines = new[] { "SY\u2593\u2592\u2591EM UN\u2588TABL\u2592", "DAT\u2591 CORRU\u2593TION DETE\u2592TED", "//ERR\u2591R: BEAUTY IN \u2593HAOS" } },
                    new FallbackEntry { state = "invoked", lines = new[] { "THE ARCANA STIRS", "ENERGY FLOWS THROUGH THE TERMINAL", "//CHANNELING..." } },
                    new FallbackEntry { state = "default", lines = new[] { "PROCESSING YOUR SIGNAL", "MEANING FORMS IN THE STATIC", "//THE SYSTEM LISTENS" } }
                }
            };
        }

        /// <summary>
        /// Check connection to Ollama.
        /// </summary>
        public void CheckConnection()
        {
            if (_ollamaClient == null) return;

            _ollamaClient.CheckConnection(connected =>
            {
                _isConnected = connected;
                OnConnectionStatusChanged?.Invoke(connected);
                Debug.Log($"[AIIntegration] Ollama connection: {(connected ? "ONLINE" : "OFFLINE")}");
            });
        }

        /// <summary>
        /// Enable or disable AI.
        /// </summary>
        public void SetAIEnabled(bool enabled)
        {
            _useAI = enabled;
        }

        /// <summary>
        /// Check if current state should use AI.
        /// </summary>
        public bool ShouldUseAI(CristalState state)
        {
            return _useAI && _isConnected && AI_ENABLED_STATES.Contains(state);
        }

        /// <summary>
        /// Generate a response using AI (or offline fallback).
        /// </summary>
        public void GenerateResponse(string playerInput, CristalState currentState, Action<BuiltResponse> callback)
        {
            // Check if we should use AI for this state
            if (!ShouldUseAI(currentState))
            {
                Debug.Log($"[AIIntegration] Using fallback for state: {currentState}");
                callback?.Invoke(GenerateFallbackResponse(playerInput, currentState));
                return;
            }

            // Build the appropriate prompt based on state
            var memory = CristalMemory.Instance?.Data;
            string prompt = BuildPromptForState(playerInput, currentState, memory);

            Debug.Log($"[AIIntegration] Requesting AI response for state: {currentState}");

            // Request from Ollama
            _ollamaClient.Generate(prompt,
                response =>
                {
                    var builtResponse = ParseAIResponse(response, currentState);
                    OnAIResponseReceived?.Invoke(response);
                    callback?.Invoke(builtResponse);
                },
                error =>
                {
                    Debug.LogWarning($"[AIIntegration] AI request failed: {error}");
                    OnAIError?.Invoke(error);
                    callback?.Invoke(GenerateFallbackResponse(playerInput, currentState));
                }
            );
        }

        /// <summary>
        /// Build the appropriate prompt based on current state.
        /// </summary>
        private string BuildPromptForState(string userInput, CristalState state, CristalMemoryData memory)
        {
            switch (state)
            {
                case CristalState.Corrupted:
                    return PromptBuilder.BuildCorruptedPrompt(userInput, memory);

                case CristalState.Echo:
                    return PromptBuilder.BuildEchoPrompt(userInput, memory);

                case CristalState.Remembering:
                    return PromptBuilder.BuildRememberingPrompt(userInput, memory);

                case CristalState.Invoked:
                    var activeArcana = ArcanaSystem.Instance?.CurrentInvocation?.Definition;
                    if (activeArcana != null)
                    {
                        return PromptBuilder.BuildArcanaPrompt(userInput, activeArcana, memory);
                    }
                    return PromptBuilder.BuildPrompt(userInput, state, memory);

                case CristalState.Unbound:
                    return PromptBuilder.BuildUnboundPrompt(userInput, memory);

                default:
                    return PromptBuilder.BuildPrompt(userInput, state, memory);
            }
        }

        /// <summary>
        /// Parse AI response text into BuiltResponse.
        /// </summary>
        private BuiltResponse ParseAIResponse(string aiText, CristalState state)
        {
            // Split response into lines
            string[] lines = aiText.Split(new[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
            var cleanedLines = new List<string>();

            foreach (string line in lines)
            {
                string trimmed = line.Trim();
                if (!string.IsNullOrEmpty(trimmed))
                {
                    cleanedLines.Add(trimmed);
                }
            }

            // Ensure we have some output
            if (cleanedLines.Count == 0)
            {
                cleanedLines.Add("//SIGNAL RECEIVED");
            }

            var response = new BuiltResponse
            {
                Lines = cleanedLines,
                Level = GetResponseLevelForState(state),
                ApplyGlitch = state == CristalState.Corrupted
            };

            // Apply state-specific effects
            switch (state)
            {
                case CristalState.Corrupted:
                    response.Effect = "screen_corruption";
                    break;
                case CristalState.Remembering:
                    response.Effect = "memory_flash";
                    break;
                case CristalState.Invoked:
                    response.Effect = "arcana_glow";
                    break;
                case CristalState.Unbound:
                    response.Effect = "unbound_ritual";
                    response.ApplyGlitch = true;
                    response.Level = ResponseLevel.Ritual;
                    break;
            }

            return response;
        }

        /// <summary>
        /// Get the response level for a state.
        /// </summary>
        private ResponseLevel GetResponseLevelForState(CristalState state)
        {
            switch (state)
            {
                case CristalState.Invoked:
                case CristalState.Unbound:
                    return ResponseLevel.Ritual;
                case CristalState.Corrupted:
                case CristalState.Remembering:
                    return ResponseLevel.Narrative;
                default:
                    return ResponseLevel.Narrative;
            }
        }

        /// <summary>
        /// Generate fallback response when AI is unavailable.
        /// </summary>
        private BuiltResponse GenerateFallbackResponse(string playerInput, CristalState state)
        {
            string stateKey = state.ToString().ToLower();
            FallbackEntry entry = null;

            // Find matching fallback
            if (_fallbackResponses?.responses != null)
            {
                foreach (var fb in _fallbackResponses.responses)
                {
                    if (fb.state == stateKey)
                    {
                        entry = fb;
                        break;
                    }
                }

                // Use default if no state match
                if (entry == null)
                {
                    foreach (var fb in _fallbackResponses.responses)
                    {
                        if (fb.state == "default")
                        {
                            entry = fb;
                            break;
                        }
                    }
                }
            }

            // Build response
            var lines = new List<string>();
            if (entry != null && entry.lines != null)
            {
                lines.AddRange(entry.lines);
            }
            else
            {
                lines.Add("PROCESSING INPUT...");
                lines.Add($"\"{playerInput.ToUpper()}\"");
                lines.Add("//OFFLINE MODE");
            }

            return new BuiltResponse
            {
                Lines = lines,
                Level = GetResponseLevelForState(state),
                ApplyGlitch = state == CristalState.Corrupted,
                Effect = state == CristalState.Corrupted ? "screen_corruption" : null
            };
        }

        /// <summary>
        /// Generate a minimal response (for quick interactions).
        /// </summary>
        public void GenerateMinimalResponse(string playerInput, Action<string> callback)
        {
            if (!_isConnected || !_useAI)
            {
                callback?.Invoke("//SIGNAL ACKNOWLEDGED");
                return;
            }

            var state = TerminalStateMachine.Instance?.CurrentStateId ?? CristalState.Waiting;
            string prompt = PromptBuilder.BuildMinimalPrompt(playerInput, state);

            _ollamaClient.Generate(prompt,
                response => callback?.Invoke(response),
                error => callback?.Invoke("//PROCESSING...")
            );
        }

        private void HandleOllamaResponse(string response)
        {
            Debug.Log($"[AIIntegration] Received response: {response.Length} chars");
        }

        private void HandleOllamaError(string error)
        {
            Debug.LogWarning($"[AIIntegration] Ollama error: {error}");

            // Mark as disconnected on error
            _isConnected = false;
            OnConnectionStatusChanged?.Invoke(false);
        }

        /// <summary>
        /// Check if AI is available and connected.
        /// </summary>
        public bool IsAIAvailable()
        {
            return _useAI && _isConnected && !IsRequestPending;
        }

        /// <summary>
        /// Get available models from Ollama.
        /// </summary>
        public void GetAvailableModels(Action<string[]> callback)
        {
            _ollamaClient?.GetModels(callback);
        }

        /// <summary>
        /// Set the model to use.
        /// </summary>
        public void SetModel(string model)
        {
            _ollamaClient?.SetModel(model);
        }
    }

    #region Fallback Data Structures

    [Serializable]
    public class FallbackResponses
    {
        public FallbackEntry[] responses;
    }

    [Serializable]
    public class FallbackEntry
    {
        public string state;
        public string[] lines;
    }

    #endregion
}

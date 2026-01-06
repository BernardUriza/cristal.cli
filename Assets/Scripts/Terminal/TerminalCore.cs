using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI
{
    /// <summary>
    /// Core terminal engine - handles input processing and response generation.
    /// Designed to be extensible for future AI integration.
    /// </summary>
    public class TerminalCore : MonoBehaviour
    {
        public static TerminalCore Instance { get; private set; }

        [Header("Terminal State")]
        [SerializeField] private TerminalState _currentState = TerminalState.Waiting;
        [SerializeField] private string _sessionId;

        [Header("Response Configuration")]
        [SerializeField] private float _responseDelay = 0.3f;
        [SerializeField] private bool _enableGlitchEffects = true;

        // Events for external systems
        public event Action<string> OnInputReceived;
        public event Action<TerminalResponse> OnResponseGenerated;
        public event Action<TerminalState> OnStateChanged;

        private bool _isFirstInput = true;
        private CommandMemory _memory;

        public TerminalState CurrentState => _currentState;
        public bool IsFirstInput => _isFirstInput;
        public string SessionId => _sessionId;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                InitializeTerminal();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitializeTerminal()
        {
            _sessionId = GenerateSessionId();
            _memory = GetComponent<CommandMemory>();

            if (_memory == null)
            {
                _memory = gameObject.AddComponent<CommandMemory>();
            }

            Debug.Log($"[TerminalCore] Initialized. Session: {_sessionId}");
        }

        private string GenerateSessionId()
        {
            return $"FRACTURE_00_{Convert.ToChar(UnityEngine.Random.Range(65, 91))}{UnityEngine.Random.Range(0, 99):D2}";
        }

        /// <summary>
        /// Process player input and generate appropriate response.
        /// This method is the main entry point for all terminal interactions.
        /// </summary>
        public void ProcessInput(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return;

            string trimmedInput = input.Trim();

            OnInputReceived?.Invoke(trimmedInput);
            _memory?.LogCommand(trimmedInput);

            SetState(TerminalState.Processing);

            StartCoroutine(GenerateResponseAsync(trimmedInput));
        }

        private System.Collections.IEnumerator GenerateResponseAsync(string input)
        {
            yield return new WaitForSeconds(_responseDelay);

            TerminalResponse response = GenerateResponse(input);

            SetState(TerminalState.Responding);
            OnResponseGenerated?.Invoke(response);

            if (_isFirstInput)
            {
                _isFirstInput = false;
            }
        }

        /// <summary>
        /// Generate response based on input.
        /// Future: This will integrate with AI (Claude API).
        /// </summary>
        private TerminalResponse GenerateResponse(string input)
        {
            // First input - welcome sequence
            if (_isFirstInput)
            {
                return CreateWelcomeResponse();
            }

            // Parse input for known patterns (expandable)
            string lowerInput = input.ToLower();

            // Memory/introspection commands
            if (ContainsAny(lowerInput, "remember", "memory", "recall", "past"))
            {
                return CreateMemoryResponse();
            }

            // Identity queries
            if (ContainsAny(lowerInput, "who am i", "what am i", "identity", "name"))
            {
                return CreateIdentityResponse();
            }

            // Help/system commands
            if (ContainsAny(lowerInput, "help", "commands", "?"))
            {
                return CreateHelpResponse();
            }

            // Status queries
            if (ContainsAny(lowerInput, "status", "state", "condition"))
            {
                return CreateStatusResponse();
            }

            // Emotional/feeling inputs
            if (ContainsAny(lowerInput, "feel", "afraid", "lost", "alone", "confused", "scared"))
            {
                return CreateEmotionalResponse(input);
            }

            // Default - echo with cryptic acknowledgment
            return CreateDefaultResponse(input);
        }

        private TerminalResponse CreateWelcomeResponse()
        {
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "INPUT ACCEPTED",
                    $"WELCOME, {_sessionId}",
                    "CONTEXT RECONSTRUCTED",
                    "MEMORY LOAD: PARTIAL",
                    "",
                    "//SYSTEM AWAITING QUERY",
                    ""
                },
                ResponseType = ResponseType.System,
                ApplyGlitch = _enableGlitchEffects
            };
        }

        private TerminalResponse CreateMemoryResponse()
        {
            int commandCount = _memory?.GetCommandCount() ?? 0;
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "ACCESSING MEMORY FRAGMENTS...",
                    $"ENTRIES LOGGED: {commandCount}",
                    "WARNING: TEMPORAL COHERENCE UNSTABLE",
                    "SOME MEMORIES MAY BE... CONSTRUCTED",
                    ""
                },
                ResponseType = ResponseType.Memory,
                ApplyGlitch = true
            };
        }

        private TerminalResponse CreateIdentityResponse()
        {
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "IDENTITY QUERY RECEIVED",
                    $"DESIGNATION: {_sessionId}",
                    "CLASSIFICATION: FRACTURE",
                    "ORIGIN: [REDACTED]",
                    "PURPOSE: UNKNOWN",
                    "",
                    "//YOU ARE WHAT YOU CHOOSE TO REMEMBER",
                    ""
                },
                ResponseType = ResponseType.Identity,
                ApplyGlitch = true
            };
        }

        private TerminalResponse CreateHelpResponse()
        {
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "AVAILABLE INTERACTIONS:",
                    "  > SPEAK YOUR THOUGHTS",
                    "  > ASK QUESTIONS",
                    "  > REMEMBER",
                    "  > FEEL",
                    "",
                    "//THERE ARE NO WRONG INPUTS",
                    "//ONLY UNDISCOVERED PATHS",
                    ""
                },
                ResponseType = ResponseType.System,
                ApplyGlitch = false
            };
        }

        private TerminalResponse CreateStatusResponse()
        {
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "SYSTEM STATUS:",
                    $"  SESSION: {_sessionId}",
                    $"  STATE: {_currentState}",
                    $"  MEMORY ENTRIES: {_memory?.GetCommandCount() ?? 0}",
                    "  COHERENCE: FLUCTUATING",
                    "  CONNECTION: PARTIAL",
                    ""
                },
                ResponseType = ResponseType.System,
                ApplyGlitch = false
            };
        }

        private TerminalResponse CreateEmotionalResponse(string input)
        {
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "EMOTIONAL PATTERN DETECTED",
                    "PROCESSING...",
                    "",
                    "//YOUR FEELINGS ARE VALID",
                    "//THEY ARE PART OF THE RECONSTRUCTION",
                    "//CONTINUE",
                    ""
                },
                ResponseType = ResponseType.Emotional,
                ApplyGlitch = true
            };
        }

        private TerminalResponse CreateDefaultResponse(string input)
        {
            return new TerminalResponse
            {
                Lines = new List<string>
                {
                    "",
                    "INPUT REGISTERED",
                    $"PROCESSING: \"{input.ToUpper()}\"",
                    "CONTEXT: UNDEFINED",
                    "",
                    "//THE SYSTEM IS LISTENING",
                    ""
                },
                ResponseType = ResponseType.Default,
                ApplyGlitch = false
            };
        }

        private bool ContainsAny(string text, params string[] keywords)
        {
            foreach (string keyword in keywords)
            {
                if (text.Contains(keyword)) return true;
            }
            return false;
        }

        public void SetState(TerminalState newState)
        {
            if (_currentState != newState)
            {
                _currentState = newState;
                OnStateChanged?.Invoke(_currentState);
            }
        }

        /// <summary>
        /// Prepare for AI integration - placeholder for future Claude API calls
        /// </summary>
        public void SetAIProvider(IAIProvider provider)
        {
            // Future: Connect to Claude or other AI
            Debug.Log("[TerminalCore] AI Provider registered (placeholder)");
        }
    }

    public enum TerminalState
    {
        Waiting,
        Processing,
        Responding,
        Error,
        Locked
    }

    public enum ResponseType
    {
        System,
        Memory,
        Identity,
        Emotional,
        Default,
        AI,
        Error
    }

    [Serializable]
    public class TerminalResponse
    {
        public List<string> Lines;
        public ResponseType ResponseType;
        public bool ApplyGlitch;
        public float CustomDelay;
    }

    /// <summary>
    /// Interface for future AI integration
    /// </summary>
    public interface IAIProvider
    {
        void ProcessAsync(string input, Action<TerminalResponse> callback);
    }
}

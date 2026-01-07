using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Input;
using Cristal.CLI.Response;
using Cristal.CLI.Arcana;
using Cristal.CLI.Effects;
using Cristal.CLI.AI;
using Cristal.CLI.Ritual;

namespace Cristal.CLI
{
    /// <summary>
    /// Core terminal engine - handles input processing and response generation.
    /// Phase 2: Integrated with modular response system, state machine, and AI prep.
    /// </summary>
    public class TerminalCore : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<TerminalCore>() instead
        [Obsolete("Use ServiceLocator.Get<TerminalCore>() instead")]
        public static TerminalCore Instance { get; private set; }

        [Header("Terminal State")]
        [SerializeField] private TerminalState _currentState = TerminalState.Waiting;
        [SerializeField] private string _sessionId;

        [Header("Response Configuration")]
        [SerializeField] private float _responseDelay = 0.3f;
        [SerializeField] private bool _enableGlitchEffects = true;
        [SerializeField] private bool _usePhase2Systems = true;

        [Header("Phase 2 Systems")]
        [SerializeField] private bool _autoInitializeSystems = true;

        // Events for external systems
        public event Action<string> OnInputReceived;
        public event Action<TerminalResponse> OnResponseGenerated;
        public event Action<TerminalState> OnStateChanged;

        private bool _isFirstInput = true;
        private CommandMemory _legacyMemory; // Backwards compatibility

        // Phase 2 references
        private CristalMemory _memory;
        private TerminalStateMachine _stateMachine;
        private ResponseEngine _responseEngine;
        private ArcanaSystem _arcanaSystem;
        private VisualEffectsController _effectsController;
        private AIIntegration _aiIntegration;
        private RitualSystem _ritualSystem;
        private VisionManager _visionManager;

        public TerminalState CurrentState => _currentState;
        public bool IsFirstInput => _isFirstInput;
        public string SessionId => _sessionId ?? _memory?.SessionId;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
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
            if (_usePhase2Systems && _autoInitializeSystems)
            {
                InitializePhase2Systems();
            }
            else
            {
                InitializeLegacySystems();
            }
        }

        private void InitializePhase2Systems()
        {
            Debug.Log("[TerminalCore] Initializing Phase 2 systems...");

            // Initialize CristalMemory
            _memory = GetComponent<CristalMemory>();
            if (_memory == null)
            {
                _memory = gameObject.AddComponent<CristalMemory>();
            }

            // Initialize StateMachine
            _stateMachine = GetComponent<TerminalStateMachine>();
            if (_stateMachine == null)
            {
                _stateMachine = gameObject.AddComponent<TerminalStateMachine>();
            }

            // Initialize ResponseEngine
            _responseEngine = GetComponent<ResponseEngine>();
            if (_responseEngine == null)
            {
                _responseEngine = gameObject.AddComponent<ResponseEngine>();
            }

            // Initialize ArcanaSystem
            _arcanaSystem = GetComponent<ArcanaSystem>();
            if (_arcanaSystem == null)
            {
                _arcanaSystem = gameObject.AddComponent<ArcanaSystem>();
            }

            // Initialize VisualEffectsController
            _effectsController = GetComponent<VisualEffectsController>();
            if (_effectsController == null)
            {
                _effectsController = gameObject.AddComponent<VisualEffectsController>();
            }

            // Initialize AIIntegration
            _aiIntegration = GetComponent<AIIntegration>();
            if (_aiIntegration == null)
            {
                _aiIntegration = gameObject.AddComponent<AIIntegration>();
            }

            // Initialize RitualSystem
            _ritualSystem = GetComponent<RitualSystem>();
            if (_ritualSystem == null)
            {
                _ritualSystem = gameObject.AddComponent<RitualSystem>();
            }

            // Initialize VisionManager
            _visionManager = GetComponent<VisionManager>();
            if (_visionManager == null)
            {
                _visionManager = gameObject.AddComponent<VisionManager>();
            }

            // Subscribe to events
            SubscribeToPhase2Events();

            // Use session ID from memory
            _sessionId = _memory.SessionId;

            Debug.Log($"[TerminalCore] Phase 2 initialized. Session: {_sessionId}");
        }

        private void InitializeLegacySystems()
        {
            _sessionId = GenerateSessionId();
            _legacyMemory = GetComponent<CommandMemory>();

            if (_legacyMemory == null)
            {
                _legacyMemory = gameObject.AddComponent<CommandMemory>();
            }

            Debug.Log($"[TerminalCore] Legacy mode initialized. Session: {_sessionId}");
        }

        private void SubscribeToPhase2Events()
        {
            // Subscribe to state machine events
            if (_stateMachine != null)
            {
                _stateMachine.OnStateTransition += HandleStateTransition;
            }

            // Subscribe to response engine events
            if (_responseEngine != null)
            {
                _responseEngine.OnSpecialHandlerTriggered += HandleSpecialHandler;
            }

            // Subscribe to arcana events
            if (_arcanaSystem != null)
            {
                _arcanaSystem.OnArcanaUnlocked += HandleArcanaUnlocked;
                _arcanaSystem.OnArcanaInvoked += HandleArcanaInvoked;
            }

            // Subscribe to ritual events
            if (_ritualSystem != null)
            {
                _ritualSystem.OnRitualComplete += HandleRitualComplete;
                _ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
                _ritualSystem.OnUnboundEnded += HandleUnboundEnded;
            }

            // Subscribe to vision events
            if (_visionManager != null)
            {
                _visionManager.OnVisionUnlocked += HandleVisionUnlocked;
                _visionManager.OnVisionViewed += HandleVisionViewed;
                _visionManager.OnNewVisionsAvailable += HandleNewVisionsAvailable;
            }
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

            if (_usePhase2Systems)
            {
                ProcessInputPhase2(trimmedInput);
            }
            else
            {
                ProcessInputLegacy(trimmedInput);
            }
        }

        private void ProcessInputPhase2(string input)
        {
            // Parse the input
            ParsedCommand command = InputParser.Parse(input);

            // Process through ritual system to check for ritual phrases
            _ritualSystem?.ProcessInput(input);

            // Set processing state
            _stateMachine?.TransitionTo(CristalState.Processing);
            SetState(TerminalState.Processing);

            StartCoroutine(GenerateResponsePhase2Async(input, command));
        }

        private IEnumerator GenerateResponsePhase2Async(string input, ParsedCommand command)
        {
            yield return new WaitForSeconds(_responseDelay);

            BuiltResponse builtResponse = null;

            // Check for vision commands first
            if (command.IsCommand && (command.Command == "see" || command.Command == "visions" || command.Command == "vision"))
            {
                builtResponse = HandleVisionCommand(command);
            }
            // Check for arcana invoke command
            else if (command.IsCommand && command.Command == "invoke" && command.HasArgument("arcana"))
            {
                builtResponse = _arcanaSystem?.HandleInvokeCommand(command);
            }
            else
            {
                // Determine if we should use AI based on current state
                CristalState currentState = _stateMachine?.CurrentStateId ?? CristalState.Waiting;

                // Check if state machine detected a state transition based on input
                CristalState? suggestedState = _stateMachine?.DetermineStateFromInput(input);
                if (suggestedState.HasValue)
                {
                    _stateMachine?.TransitionTo(suggestedState.Value);
                    currentState = suggestedState.Value;
                }

                // Check if AI should handle this state
                if (_aiIntegration != null && _aiIntegration.ShouldUseAI(currentState))
                {
                    bool responseReceived = false;

                    _aiIntegration.GenerateResponse(input, currentState, response =>
                    {
                        builtResponse = response;
                        responseReceived = true;
                    });

                    // Wait for AI response (with timeout)
                    float timeout = 30f;
                    float elapsed = 0f;
                    while (!responseReceived && elapsed < timeout)
                    {
                        elapsed += Time.deltaTime;
                        yield return null;
                    }

                    if (!responseReceived)
                    {
                        Debug.LogWarning("[TerminalCore] AI response timeout, using fallback");
                        builtResponse = _responseEngine?.GenerateResponse(input);
                    }
                }
                else
                {
                    // Use response engine for non-AI states
                    builtResponse = _responseEngine?.GenerateResponse(input);
                }
            }

            // Handle first input welcome
            if (_isFirstInput && builtResponse == null)
            {
                builtResponse = _responseEngine?.GenerateWelcomeResponse();
                _isFirstInput = false;
            }

            // Fallback if no response generated
            if (builtResponse == null)
            {
                builtResponse = new BuiltResponse
                {
                    Lines = new List<string> { "", "INPUT REGISTERED", "", "//PROCESSING", "" },
                    Level = ResponseLevel.Literal,
                    ApplyGlitch = false
                };
            }

            // Apply visual effects
            if (builtResponse.ApplyGlitch && _effectsController != null)
            {
                float multiplier = _effectsController.GetCurrentGlitchMultiplier();
                for (int i = 0; i < builtResponse.Lines.Count; i++)
                {
                    builtResponse.Lines[i] = _effectsController.ApplyGlitch(builtResponse.Lines[i], multiplier);
                }
            }

            // Trigger effect if specified
            if (!string.IsNullOrEmpty(builtResponse.Effect))
            {
                _effectsController?.TriggerEffect(builtResponse.Effect);
            }

            // Convert to legacy TerminalResponse for compatibility
            TerminalResponse response = builtResponse.ToTerminalResponse();

            // Set responding state
            _stateMachine?.TransitionTo(CristalState.Responding);
            SetState(TerminalState.Responding);

            OnResponseGenerated?.Invoke(response);

            if (_isFirstInput)
            {
                _isFirstInput = false;
                _memory?.SetFlag("hasSeenWelcome", true);
            }
        }

        private void ProcessInputLegacy(string input)
        {
            _legacyMemory?.LogCommand(input);
            SetState(TerminalState.Processing);
            StartCoroutine(GenerateResponseLegacyAsync(input));
        }

        private IEnumerator GenerateResponseLegacyAsync(string input)
        {
            yield return new WaitForSeconds(_responseDelay);

            TerminalResponse response = GenerateResponseLegacy(input);

            SetState(TerminalState.Responding);
            OnResponseGenerated?.Invoke(response);

            if (_isFirstInput)
            {
                _isFirstInput = false;
            }
        }

        /// <summary>
        /// Legacy response generation for backwards compatibility.
        /// </summary>
        private TerminalResponse GenerateResponseLegacy(string input)
        {
            if (_isFirstInput)
            {
                return CreateWelcomeResponse();
            }

            string lowerInput = input.ToLower();

            if (ContainsAny(lowerInput, "remember", "memory", "recall", "past"))
            {
                return CreateMemoryResponse();
            }

            if (ContainsAny(lowerInput, "who am i", "what am i", "identity", "name"))
            {
                return CreateIdentityResponse();
            }

            if (ContainsAny(lowerInput, "help", "commands", "?"))
            {
                return CreateHelpResponse();
            }

            if (ContainsAny(lowerInput, "status", "state", "condition"))
            {
                return CreateStatusResponse();
            }

            if (ContainsAny(lowerInput, "feel", "afraid", "lost", "alone", "confused", "scared"))
            {
                return CreateEmotionalResponse(input);
            }

            return CreateDefaultResponse(input);
        }

        #region Legacy Response Methods

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
            int commandCount = _legacyMemory?.GetCommandCount() ?? _memory?.CommandCount ?? 0;
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
            var lines = new List<string>
            {
                "",
                "AVAILABLE INTERACTIONS:",
                "  > SPEAK YOUR THOUGHTS",
                "  > ASK QUESTIONS",
                "  > REMEMBER",
                "  > FEEL"
            };

            // Add Phase 2 commands if enabled
            if (_usePhase2Systems)
            {
                lines.Add("  > invoke arcana [name/number]");
                lines.Add("  > see visions");
                lines.Add("  > status");
            }

            lines.Add("");
            lines.Add("//THERE ARE NO WRONG INPUTS");
            lines.Add("//ONLY UNDISCOVERED PATHS");
            lines.Add("");

            return new TerminalResponse
            {
                Lines = lines,
                ResponseType = ResponseType.System,
                ApplyGlitch = false
            };
        }

        private TerminalResponse CreateStatusResponse()
        {
            var lines = new List<string>
            {
                "",
                "SYSTEM STATUS:",
                $"  SESSION: {_sessionId}",
                $"  STATE: {_currentState}"
            };

            if (_usePhase2Systems && _memory != null)
            {
                lines.Add($"  MEMORY ENTRIES: {_memory.CommandCount}");
                lines.Add($"  CORRUPTION: {_memory.Data.stateFlags.corruptionLevel:P0}");
                lines.Add($"  EMOTIONAL PROFILE: {_memory.Data.stateFlags.dominantEmotion}");
                lines.Add($"  ARCANA UNLOCKED: {_memory.Data.arcana.unlocked.Count}");
            }
            else
            {
                lines.Add($"  MEMORY ENTRIES: {_legacyMemory?.GetCommandCount() ?? 0}");
            }

            lines.Add("  COHERENCE: FLUCTUATING");
            lines.Add("  CONNECTION: PARTIAL");
            lines.Add("");

            return new TerminalResponse
            {
                Lines = lines,
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

        #endregion

        #region Vision Handlers

        private BuiltResponse HandleVisionCommand(ParsedCommand command)
        {
            if (_visionManager == null)
            {
                return new BuiltResponse
                {
                    Lines = new List<string> { "", "VISION SYSTEM OFFLINE", "" },
                    Level = ResponseLevel.Literal,
                    ApplyGlitch = false
                };
            }

            // "see visions" or just "visions" - show list
            if (command.Command == "visions" ||
                command.Command == "vision" ||
                (command.Command == "see" && (command.ArgumentCount == 0 || command.HasArgument("visions"))))
            {
                return _visionManager.GenerateSeeVisionsResponse();
            }

            // "see [vision name]" - view specific vision
            if (command.Command == "see" && command.ArgumentCount > 0)
            {
                string visionName = command.ArgumentString;
                // Filter out "visions" if it's the first arg
                if (visionName.ToLower().StartsWith("visions "))
                {
                    visionName = visionName.Substring(8).Trim();
                }
                return _visionManager.GenerateViewVisionResponse(visionName);
            }

            return _visionManager.GenerateSeeVisionsResponse();
        }

        private void HandleVisionUnlocked(VisionInstance vision)
        {
            Debug.Log($"[TerminalCore] Vision unlocked: {vision.Definition.displayName}");
        }

        private void HandleVisionViewed(VisionInstance vision)
        {
            Debug.Log($"[TerminalCore] Vision viewed: {vision.Definition.displayName} (Level {vision.CurrentViewLevel})");

            // Trigger visual effect for vision viewing
            _effectsController?.TriggerEffect("vision_display");
        }

        private void HandleNewVisionsAvailable(int count)
        {
            Debug.Log($"[TerminalCore] {count} new vision(s) available!");
            // Could trigger a notification or glow effect
        }

        #endregion

        #region Event Handlers

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            // Map CristalState to legacy TerminalState for compatibility
            TerminalState legacyState = to switch
            {
                CristalState.Waiting => TerminalState.Waiting,
                CristalState.Processing => TerminalState.Processing,
                CristalState.Responding => TerminalState.Responding,
                CristalState.Error => TerminalState.Error,
                CristalState.Locked => TerminalState.Locked,
                _ => TerminalState.Waiting
            };

            SetState(legacyState);
        }

        private void HandleSpecialHandler(string handler)
        {
            Debug.Log($"[TerminalCore] Special handler triggered: {handler}");

            if (handler == "ArcanaSystem" && _arcanaSystem != null)
            {
                // Arcana handling is done in ProcessInputPhase2
            }
        }

        private void HandleArcanaUnlocked(ArcanaDefinition arcana)
        {
            Debug.Log($"[TerminalCore] Arcana unlocked: {arcana.DisplayName}");
            // Could trigger special UI notification
        }

        private void HandleArcanaInvoked(ArcanaDefinition arcana)
        {
            Debug.Log($"[TerminalCore] Arcana invoked: {arcana.DisplayName}");
            // Effects are handled by ArcanaSystem
        }

        private void HandleRitualComplete()
        {
            Debug.Log("[TerminalCore] === RITUAL COMPLETE === THE UNBOUND AWAKENS ===");
            // Ritual system will handle the state transition
        }

        private void HandleUnboundTriggered()
        {
            Debug.Log("[TerminalCore] UNBOUND state triggered");
            // Could trigger special UI effects here
            _effectsController?.TriggerEffect("unbound_ritual");
        }

        private void HandleUnboundEnded()
        {
            Debug.Log("[TerminalCore] UNBOUND state ended");
            // Restore normal effects
            _effectsController?.TriggerEffect("stabilize");
        }

        #endregion

        #region Utility Methods

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
            Debug.Log("[TerminalCore] AI Provider registered (placeholder)");
        }

        /// <summary>
        /// Enable or disable Phase 2 systems at runtime.
        /// </summary>
        public void SetPhase2Mode(bool enabled)
        {
            _usePhase2Systems = enabled;
            Debug.Log($"[TerminalCore] Phase 2 mode: {(enabled ? "ENABLED" : "DISABLED")}");
        }

        /// <summary>
        /// Get the CristalMemory instance (Phase 2).
        /// </summary>
        public CristalMemory GetMemory()
        {
            return _memory;
        }

        /// <summary>
        /// Get the ArcanaSystem instance (Phase 2).
        /// </summary>
        public ArcanaSystem GetArcanaSystem()
        {
            return _arcanaSystem;
        }

        #endregion

        private void OnDestroy()
        {
            // Unsubscribe from events
            if (_stateMachine != null)
            {
                _stateMachine.OnStateTransition -= HandleStateTransition;
            }

            if (_responseEngine != null)
            {
                _responseEngine.OnSpecialHandlerTriggered -= HandleSpecialHandler;
            }

            if (_arcanaSystem != null)
            {
                _arcanaSystem.OnArcanaUnlocked -= HandleArcanaUnlocked;
                _arcanaSystem.OnArcanaInvoked -= HandleArcanaInvoked;
            }

            if (_ritualSystem != null)
            {
                _ritualSystem.OnRitualComplete -= HandleRitualComplete;
                _ritualSystem.OnUnboundTriggered -= HandleUnboundTriggered;
                _ritualSystem.OnUnboundEnded -= HandleUnboundEnded;
            }

            if (_visionManager != null)
            {
                _visionManager.OnVisionUnlocked -= HandleVisionUnlocked;
                _visionManager.OnVisionViewed -= HandleVisionViewed;
                _visionManager.OnNewVisionsAvailable -= HandleNewVisionsAvailable;
            }
        }
    }

    // Keep legacy enums for backwards compatibility
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

using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Core ritual system for CRISTAL.
    /// Tracks hidden ritual requirements and triggers UNBOUND state when complete.
    /// </summary>
    public class RitualSystem : MonoBehaviour
    {
        public static RitualSystem Instance { get; private set; }

        [Header("Ritual Configuration")]
        [SerializeField] private TextAsset _ritualConfigJson;
        [SerializeField] private int _requiredMemoryCount = 5;

        [Header("Audio")]
        [SerializeField] private AudioSource _ritualAudioSource;
        [SerializeField] private AudioClip _ritualLoopClip;
        [SerializeField] private AudioClip _ritualTriggerClip;
        [SerializeField] private float _ritualVolume = 0.3f;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action OnRitualProgressUpdate;
        public event Action OnRitualComplete;
        public event Action OnUnboundTriggered;
        public event Action OnUnboundEnded;

        // Required Arcana IDs
        private readonly int[] REQUIRED_ARCANA = { 13, 15, 18 }; // Death, Devil, Moon

        // Required phrases (normalized)
        private readonly string[] REQUIRED_PHRASES = {
            "who unmade you",
            "silence is sacred",
            "invoke arcana 0"
        };

        private RitualConfig _config;
        private bool _ritualTriggered = false;

        public bool IsRitualComplete => CheckRitualComplete();
        public bool HasTriggeredUnbound => _ritualTriggered;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                LoadConfig();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Subscribe to relevant events
            SubscribeToEvents();
        }

        private void OnDestroy()
        {
            UnsubscribeFromEvents();
        }

        private void LoadConfig()
        {
            if (_ritualConfigJson != null)
            {
                try
                {
                    _config = JsonUtility.FromJson<RitualConfig>(_ritualConfigJson.text);
                    Debug.Log("[RitualSystem] Config loaded");
                }
                catch (Exception e)
                {
                    Debug.LogError($"[RitualSystem] Failed to load config: {e.Message}");
                    _config = CreateDefaultConfig();
                }
            }
            else
            {
                _config = CreateDefaultConfig();
            }
        }

        private RitualConfig CreateDefaultConfig()
        {
            return new RitualConfig
            {
                ritualName = "UNBOUND",
                requiredArcana = new[] { 13, 15, 18 },
                requiredStates = new[] { "remembering", "corrupted", "echo" },
                requiredPhrases = new[] { "who unmade you", "silence is sacred", "invoke arcana 0" },
                requiredMemoryCount = 5,
                unboundDuration = 180f
            };
        }

        private void SubscribeToEvents()
        {
            // Subscribe to state machine transitions
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition += HandleStateTransition;
            }

            // Subscribe to arcana invocations
            if (ArcanaSystem.Instance != null)
            {
                ArcanaSystem.Instance.OnArcanaInvoked += HandleArcanaInvoked;
            }
        }

        private void UnsubscribeFromEvents()
        {
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition -= HandleStateTransition;
            }

            if (ArcanaSystem.Instance != null)
            {
                ArcanaSystem.Instance.OnArcanaInvoked -= HandleArcanaInvoked;
            }
        }

        /// <summary>
        /// Process input to check for ritual phrases.
        /// Call this from TerminalCore when processing input.
        /// </summary>
        public void ProcessInput(string input)
        {
            if (_ritualTriggered) return;

            var memory = CristalMemory.Instance;
            if (memory == null) return;

            var ritual = memory.Data.ritual;
            string normalized = input.ToLower().Trim();

            // Check for ritual phrases
            if (normalized == "who unmade you" || normalized == "who unmade you?")
            {
                if (!ritual.hasTypedWhoUnmadeYou)
                {
                    ritual.hasTypedWhoUnmadeYou = true;
                    LogProgress("Phrase detected: 'who unmade you'");
                    OnRitualProgressUpdate?.Invoke();
                }
            }
            else if (normalized == "silence is sacred")
            {
                if (!ritual.hasTypedSilenceIsSacred)
                {
                    ritual.hasTypedSilenceIsSacred = true;
                    LogProgress("Phrase detected: 'silence is sacred'");
                    OnRitualProgressUpdate?.Invoke();
                }
            }
            else if (normalized == "invoke arcana 0" || normalized == "invoke arcana fool" || normalized == "invoke arcana the fool")
            {
                if (!ritual.hasTypedInvokeArcana0)
                {
                    ritual.hasTypedInvokeArcana0 = true;
                    LogProgress("Phrase detected: 'invoke arcana 0'");
                    OnRitualProgressUpdate?.Invoke();
                }
            }

            // Check if ritual is now complete
            CheckAndTriggerRitual();
        }

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            if (_ritualTriggered) return;

            var memory = CristalMemory.Instance;
            if (memory == null) return;

            var ritual = memory.Data.ritual;

            // Track visited states
            switch (to)
            {
                case CristalState.Remembering:
                    if (!ritual.hasVisitedRemembering)
                    {
                        ritual.hasVisitedRemembering = true;
                        LogProgress("State visited: REMEMBERING");
                        OnRitualProgressUpdate?.Invoke();
                    }
                    break;

                case CristalState.Corrupted:
                    if (!ritual.hasVisitedCorrupted)
                    {
                        ritual.hasVisitedCorrupted = true;
                        LogProgress("State visited: CORRUPTED");
                        OnRitualProgressUpdate?.Invoke();
                    }
                    break;

                case CristalState.Echo:
                    if (!ritual.hasVisitedEcho)
                    {
                        ritual.hasVisitedEcho = true;
                        LogProgress("State visited: ECHO");
                        OnRitualProgressUpdate?.Invoke();
                    }
                    break;

                case CristalState.Unbound:
                    // Handle entering unbound from external trigger
                    OnUnboundTriggered?.Invoke();
                    PlayRitualAudio();
                    break;
            }

            // Handle exiting unbound
            if (from == CristalState.Unbound && to != CristalState.Unbound)
            {
                OnUnboundEnded?.Invoke();
                StopRitualAudio();
            }

            CheckAndTriggerRitual();
        }

        private void HandleArcanaInvoked(ArcanaDefinition arcana)
        {
            if (_ritualTriggered) return;

            var memory = CristalMemory.Instance;
            if (memory == null) return;

            var ritual = memory.Data.ritual;

            // Track required arcana
            switch (arcana.id)
            {
                case 13: // Death
                    if (!ritual.hasInvokedDeath)
                    {
                        ritual.hasInvokedDeath = true;
                        LogProgress("Arcana invoked: XIII - DEATH");
                        OnRitualProgressUpdate?.Invoke();
                    }
                    break;

                case 15: // Devil
                    if (!ritual.hasInvokedDevil)
                    {
                        ritual.hasInvokedDevil = true;
                        LogProgress("Arcana invoked: XV - THE DEVIL");
                        OnRitualProgressUpdate?.Invoke();
                    }
                    break;

                case 18: // Moon
                    if (!ritual.hasInvokedMoon)
                    {
                        ritual.hasInvokedMoon = true;
                        LogProgress("Arcana invoked: XVIII - THE MOON");
                        OnRitualProgressUpdate?.Invoke();
                    }
                    break;
            }

            CheckAndTriggerRitual();
        }

        /// <summary>
        /// Check if all ritual conditions are met.
        /// </summary>
        private bool CheckRitualComplete()
        {
            var memory = CristalMemory.Instance;
            if (memory == null) return false;

            var ritual = memory.Data.ritual;

            // Check all conditions
            bool statesComplete = ritual.AreAllStatesVisited();
            bool arcanaComplete = ritual.AreAllArcanaInvoked();
            bool phrasesComplete = ritual.AreAllPhrasesTyped();
            bool memoryComplete = memory.Data.commands.Count >= _requiredMemoryCount;

            return statesComplete && arcanaComplete && phrasesComplete && memoryComplete;
        }

        /// <summary>
        /// Check conditions and trigger UNBOUND if complete.
        /// </summary>
        private void CheckAndTriggerRitual()
        {
            if (_ritualTriggered) return;

            if (CheckRitualComplete())
            {
                TriggerUnbound();
            }
        }

        /// <summary>
        /// Force trigger the UNBOUND state (for testing or special events).
        /// </summary>
        public void TriggerUnbound()
        {
            if (_ritualTriggered)
            {
                Debug.Log("[RitualSystem] UNBOUND already triggered this session");
                return;
            }

            _ritualTriggered = true;
            Debug.Log("[RitualSystem] === RITUAL COMPLETE === TRIGGERING UNBOUND ===");

            // Play trigger sound
            if (_ritualAudioSource != null && _ritualTriggerClip != null)
            {
                _ritualAudioSource.PlayOneShot(_ritualTriggerClip);
            }

            // Fire events
            OnRitualComplete?.Invoke();

            // Transition to UNBOUND state
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.ForceTransition(CristalState.Unbound);
            }
        }

        /// <summary>
        /// Get the current ritual progress as a report.
        /// </summary>
        public RitualProgressReport GetProgressReport()
        {
            var memory = CristalMemory.Instance;
            if (memory == null)
            {
                return new RitualProgressReport();
            }

            var ritual = memory.Data.ritual;

            return new RitualProgressReport
            {
                // States
                remembering = ritual.hasVisitedRemembering,
                corrupted = ritual.hasVisitedCorrupted,
                echo = ritual.hasVisitedEcho,

                // Arcana
                death = ritual.hasInvokedDeath,
                devil = ritual.hasInvokedDevil,
                moon = ritual.hasInvokedMoon,

                // Phrases
                whoUnmadeYou = ritual.hasTypedWhoUnmadeYou,
                silenceIsSacred = ritual.hasTypedSilenceIsSacred,
                invokeArcana0 = ritual.hasTypedInvokeArcana0,

                // Memory
                memoryCount = memory.Data.commands.Count,
                requiredMemory = _requiredMemoryCount,

                // Completion
                isComplete = CheckRitualComplete(),
                hasTriggered = _ritualTriggered
            };
        }

        private void PlayRitualAudio()
        {
            if (_ritualAudioSource == null || _ritualLoopClip == null) return;

            _ritualAudioSource.clip = _ritualLoopClip;
            _ritualAudioSource.loop = true;
            _ritualAudioSource.volume = _ritualVolume;
            _ritualAudioSource.Play();
        }

        private void StopRitualAudio()
        {
            if (_ritualAudioSource == null) return;

            _ritualAudioSource.Stop();
        }

        private void LogProgress(string message)
        {
            if (_debugMode)
            {
                Debug.Log($"[RitualSystem] {message}");
            }
        }

        /// <summary>
        /// Reset the ritual trigger flag (allows re-triggering in same session).
        /// </summary>
        public void ResetTrigger()
        {
            _ritualTriggered = false;
        }
    }

    #region Data Structures

    [Serializable]
    public class RitualConfig
    {
        public string ritualName;
        public int[] requiredArcana;
        public string[] requiredStates;
        public string[] requiredPhrases;
        public int requiredMemoryCount;
        public float unboundDuration;
        public string[] unboundResponses;
    }

    [Serializable]
    public class RitualProgressReport
    {
        // States
        public bool remembering;
        public bool corrupted;
        public bool echo;

        // Arcana
        public bool death;
        public bool devil;
        public bool moon;

        // Phrases
        public bool whoUnmadeYou;
        public bool silenceIsSacred;
        public bool invokeArcana0;

        // Memory
        public int memoryCount;
        public int requiredMemory;

        // Status
        public bool isComplete;
        public bool hasTriggered;

        public float CompletionPercentage
        {
            get
            {
                int total = 9; // 3 states + 3 arcana + 3 phrases
                int completed = 0;

                if (remembering) completed++;
                if (corrupted) completed++;
                if (echo) completed++;
                if (death) completed++;
                if (devil) completed++;
                if (moon) completed++;
                if (whoUnmadeYou) completed++;
                if (silenceIsSacred) completed++;
                if (invokeArcana0) completed++;

                // Memory counts as 1 if complete
                if (memoryCount >= requiredMemory)
                {
                    completed++;
                    total++;
                }
                else
                {
                    total++;
                }

                return (float)completed / total;
            }
        }
    }

    #endregion
}

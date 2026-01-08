using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Core.Events;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Symbolic;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// State of a ritual execution.
    /// </summary>
    public enum RitualState
    {
        Inactive,
        Starting,
        InProgress,
        Completing,
        Completed,
        Failed,
        Cooldown
    }

    /// <summary>
    /// Runtime data for an active ritual.
    /// </summary>
    public class ActiveRitual
    {
        public RitualDefinition Definition { get; }
        public RitualState State { get; set; }
        public int CurrentStep { get; set; }
        public float StartTime { get; }
        public float StepStartTime { get; set; }
        public bool[] CompletedSteps { get; }

        public ActiveRitual(RitualDefinition definition)
        {
            Definition = definition;
            State = RitualState.Starting;
            CurrentStep = 0;
            StartTime = Time.time;
            StepStartTime = Time.time;
            CompletedSteps = new bool[definition.StepCount];
        }

        public float ElapsedTime => Time.time - StartTime;
        public float StepElapsedTime => Time.time - StepStartTime;

        public RitualStep GetCurrentStep()
        {
            return Definition.GetStep(CurrentStep);
        }

        public bool IsComplete => CurrentStep >= Definition.StepCount;

        public int CompletedStepCount
        {
            get
            {
                int count = 0;
                foreach (bool completed in CompletedSteps)
                    if (completed) count++;
                return count;
            }
        }
    }

    /// <summary>
    /// Central system for executing ritual sequences.
    /// 
    /// Listens to symbolic events and tracks ritual progress,
    /// granting rewards when rituals are completed.
    /// </summary>
    public class RitualExecutor : MonoBehaviour, IReactiveSystem
    {
        [Header("Configuration")]
        [SerializeField] private RitualDefinition[] _availableRituals;
        [SerializeField] private bool _autoStartEligible = true;
        [SerializeField] private int _maxConcurrentRituals = 1;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip _stepCompleteSound;
        [SerializeField] private AudioClip _ritualFailSound;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Reactive signals we respond to
        public SymbolicSignalType[] SubscribedSignals => new[]
        {
            SymbolicSignalType.ArcanaInvoked,
            SymbolicSignalType.MemoryRecovered,
            SymbolicSignalType.VisionUnlocked,
            SymbolicSignalType.CorruptionSpike,
            SymbolicSignalType.UnboundTriggered
        };

        // Events
        public event Action<RitualDefinition> OnRitualStarted;
        public event Action<RitualDefinition, int> OnRitualStepCompleted;
        public event Action<RitualDefinition, RitualReward> OnRitualCompleted;
        public event Action<RitualDefinition, string> OnRitualFailed;
        public event Action<RitualDefinition, RitualStep> OnRitualHintUpdated;

        // State
        private List<ActiveRitual> _activeRituals = new();
        private Dictionary<string, float> _cooldowns = new();
        private Dictionary<SymbolicArchetype, bool> _seenArchetypes = new();
        private HashSet<string> _completedRitualIds = new();

        // Dependencies
        private SymbolicForge _forge;
        private SymbolicMemoryLog _memoryLog;
        private RitualProgressTracker _progressTracker;

        #region Properties

        public IReadOnlyList<ActiveRitual> ActiveRituals => _activeRituals;
        public IReadOnlyCollection<string> CompletedRitualIds => _completedRitualIds;
        public int ActiveRitualCount => _activeRituals.Count;

        #endregion

        #region Unity Lifecycle

        private void Awake()
        {
            ServiceLocator.Register(this);
            InitializeDependencies();
        }

        private void OnEnable()
        {
            SubscribeToEvents();
        }

        private void OnDisable()
        {
            UnsubscribeFromEvents();
        }

        private void Update()
        {
            UpdateActiveRituals();
            UpdateCooldowns();
        }

        #endregion

        #region Initialization

        private void InitializeDependencies()
        {
            _forge = ServiceLocator.TryGet<SymbolicForge>();
            _memoryLog = ServiceLocator.TryGet<SymbolicMemoryLog>();
            _progressTracker = GetComponent<RitualProgressTracker>();

            if (_progressTracker == null)
            {
                _progressTracker = gameObject.AddComponent<RitualProgressTracker>();
            }

            LoadProgress();
        }

        private void LoadProgress()
        {
            if (_progressTracker != null)
            {
                var data = _progressTracker.Load();
                if (data != null)
                {
                    _completedRitualIds = new HashSet<string>(data.completedRitualIds);
                    _seenArchetypes = new Dictionary<SymbolicArchetype, bool>();

                    foreach (var archetype in data.seenArchetypes)
                    {
                        if (Enum.TryParse<SymbolicArchetype>(archetype, out var parsed))
                        {
                            _seenArchetypes[parsed] = true;
                        }
                    }

                    Log($"Loaded progress: {_completedRitualIds.Count} rituals, {_seenArchetypes.Count} archetypes");
                }
            }
        }

        private void SubscribeToEvents()
        {
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Subscribe(signal, OnSymbolicEvent);
            }
        }

        private void UnsubscribeFromEvents()
        {
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Unsubscribe(signal, OnSymbolicEvent);
            }
        }

        #endregion

        #region Reactive Event Handling

        public void OnSymbolicEvent(in SymbolicEvent evt)
        {
            // Track archetype sightings
            if (evt.Archetype != SymbolicArchetype.None)
            {
                if (!_seenArchetypes.ContainsKey(evt.Archetype))
                {
                    _seenArchetypes[evt.Archetype] = true;
                    Log($"First sighting: {evt.Archetype}");
                }
            }

            // Check active rituals for step completion
            foreach (var ritual in _activeRituals)
            {
                if (ritual.State == RitualState.InProgress)
                {
                    TryAdvanceRitual(ritual, in evt);
                }
            }

            // Auto-start eligible rituals
            if (_autoStartEligible && _activeRituals.Count < _maxConcurrentRituals)
            {
                TryAutoStartRituals(evt.SourceState);
            }
        }

        #endregion

        #region Ritual Lifecycle

        /// <summary>
        /// Attempt to start a ritual by ID.
        /// </summary>
        public bool TryStartRitual(string ritualId)
        {
            var definition = FindRitualById(ritualId);
            if (definition == null)
            {
                Log($"Ritual not found: {ritualId}");
                return false;
            }

            return TryStartRitual(definition);
        }

        /// <summary>
        /// Attempt to start a ritual.
        /// </summary>
        public bool TryStartRitual(RitualDefinition definition)
        {
            // Validate
            if (!definition.Validate(out string error))
            {
                Log($"Invalid ritual: {error}");
                return false;
            }

            // Check already active
            foreach (var active in _activeRituals)
            {
                if (active.Definition.ritualId == definition.ritualId)
                {
                    Log($"Ritual already active: {definition.ritualId}");
                    return false;
                }
            }

            // Check completed (non-repeatable)
            if (_completedRitualIds.Contains(definition.ritualId))
            {
                Log($"Ritual already completed: {definition.ritualId}");
                return false;
            }

            // Check cooldown
            if (_cooldowns.TryGetValue(definition.ritualId, out float cooldownEnd))
            {
                if (Time.time < cooldownEnd)
                {
                    Log($"Ritual on cooldown: {definition.ritualId}");
                    return false;
                }
            }

            // Check concurrent limit
            if (_activeRituals.Count >= _maxConcurrentRituals)
            {
                Log($"Max concurrent rituals reached");
                return false;
            }

            // Check conditions
            var currentState = GetCurrentState();
            int memoryIntensity = GetMemoryIntensity();
            int corruptionLevel = GetCorruptionLevel();

            if (!definition.conditions.AreMet(
                currentState,
                _seenArchetypes,
                _completedRitualIds,
                memoryIntensity,
                corruptionLevel))
            {
                Log($"Conditions not met: {definition.ritualId}");
                return false;
            }

            // Start!
            StartRitual(definition);
            return true;
        }

        private void StartRitual(RitualDefinition definition)
        {
            var ritual = new ActiveRitual(definition);
            ritual.State = RitualState.InProgress;

            _activeRituals.Add(ritual);

            // Play ambient if available
            if (definition.ambientLoop != null && _audioSource != null)
            {
                _audioSource.clip = definition.ambientLoop;
                _audioSource.loop = true;
                _audioSource.Play();
            }

            // Notify
            OnRitualStarted?.Invoke(definition);
            OnRitualHintUpdated?.Invoke(definition, ritual.GetCurrentStep());

            // Publish event
            ReactiveSystemBus.Publish(new SymbolicEvent(
                SymbolicSignalType.RitualProgress,
                GetCurrentState(),
                0,
                SymbolicArchetype.None,
                "RitualExecutor"
            ));

            Log($"Started ritual: {definition.displayName}");
        }

        private void TryAdvanceRitual(ActiveRitual ritual, in SymbolicEvent evt)
        {
            var step = ritual.GetCurrentStep();
            if (step == null) return;

            // Check if event satisfies current step
            if (step.IsSatisfiedBy(in evt, evt.Archetype))
            {
                CompleteStep(ritual);
            }
            else if (!ritual.Definition.strictOrder)
            {
                // Non-strict: check if any uncompleted step matches
                for (int i = 0; i < ritual.Definition.StepCount; i++)
                {
                    if (!ritual.CompletedSteps[i])
                    {
                        var checkStep = ritual.Definition.GetStep(i);
                        if (checkStep.IsSatisfiedBy(in evt, evt.Archetype))
                        {
                            ritual.CompletedSteps[i] = true;
                            StepCompleted(ritual, i, checkStep);

                            // Check if all complete
                            if (ritual.CompletedStepCount >= ritual.Definition.StepCount)
                            {
                                CompleteRitual(ritual);
                            }
                            break;
                        }
                    }
                }
            }
        }

        private void CompleteStep(ActiveRitual ritual)
        {
            var step = ritual.GetCurrentStep();
            ritual.CompletedSteps[ritual.CurrentStep] = true;

            StepCompleted(ritual, ritual.CurrentStep, step);

            ritual.CurrentStep++;
            ritual.StepStartTime = Time.time;

            if (ritual.IsComplete)
            {
                CompleteRitual(ritual);
            }
            else
            {
                OnRitualHintUpdated?.Invoke(ritual.Definition, ritual.GetCurrentStep());
            }
        }

        private void StepCompleted(ActiveRitual ritual, int stepIndex, RitualStep step)
        {
            // Audio
            if (step.completionSound != null && _audioSource != null)
            {
                _audioSource.PlayOneShot(step.completionSound);
            }
            else if (_stepCompleteSound != null && _audioSource != null)
            {
                _audioSource.PlayOneShot(_stepCompleteSound);
            }

            // Project symbol
            if (step.projectSymbol && _forge != null)
            {
                // Convert Color to hex string for SVGGenerator
                var color = ritual.Definition.ritualColor;
                string colorHex = $"#{(int)(color.r * 255):X2}{(int)(color.g * 255):X2}{(int)(color.b * 255):X2}";
                var symbol = SVGGenerator.GenerateQuick(
                    ritual.Definition.shapeLanguage,
                    colorHex,
                    6
                );

                // Forge will handle projection
            }

            // Notify
            OnRitualStepCompleted?.Invoke(ritual.Definition, stepIndex);

            // Publish progress
            int progress = (int)((float)(stepIndex + 1) / ritual.Definition.StepCount * 100);
            ReactiveSystemBus.Publish(new SymbolicEvent(
                SymbolicSignalType.RitualProgress,
                GetCurrentState(),
                progress,
                step.requiredArchetype,
                "RitualExecutor"
            ));

            Log($"Step {stepIndex + 1}/{ritual.Definition.StepCount} complete: {step.requiredArchetype}");
        }

        private void CompleteRitual(ActiveRitual ritual)
        {
            ritual.State = RitualState.Completing;
            StartCoroutine(CompleteRitualSequence(ritual));
        }

        private IEnumerator CompleteRitualSequence(ActiveRitual ritual)
        {
            var definition = ritual.Definition;
            var reward = definition.reward;

            // Stop ambient
            if (_audioSource != null && _audioSource.isPlaying)
            {
                _audioSource.Stop();
            }

            // Play completion stinger
            if (reward.completionStinger != null && _audioSource != null)
            {
                _audioSource.PlayOneShot(reward.completionStinger);
            }

            // Project final symbol
            if (reward.projectFinalSymbol && _forge != null)
            {
                // Let forge handle it via event
            }

            // Apply rewards
            if (reward.unlockedArchetype != SymbolicArchetype.None)
            {
                _seenArchetypes[reward.unlockedArchetype] = true;

                ReactiveSystemBus.Publish(new SymbolicEvent(
                    SymbolicSignalType.ArcanaUnlocked,
                    GetCurrentState(),
                    100,
                    reward.unlockedArchetype,
                    "RitualExecutor"
                ));
            }

            if (!string.IsNullOrEmpty(reward.unlockedVisionId))
            {
                ReactiveSystemBus.Publish(new SymbolicEvent(
                    SymbolicSignalType.VisionUnlocked,
                    GetCurrentState(),
                    100,
                    SymbolicArchetype.TheVision,
                    "RitualExecutor"
                ));
            }

            // Mark completed
            _completedRitualIds.Add(definition.ritualId);
            ritual.State = RitualState.Completed;

            // Remove from active
            _activeRituals.Remove(ritual);

            // Save progress
            SaveProgress();

            // Publish completion
            ReactiveSystemBus.Publish(new SymbolicEvent(
                reward.completionSignal,
                reward.resultingState,
                reward.completionIntensity,
                reward.unlockedArchetype,
                "RitualExecutor"
            ));

            // Notify
            OnRitualCompleted?.Invoke(definition, reward);

            Log($"Completed ritual: {definition.displayName}");

            yield return new WaitForSeconds(reward.finalProjectionDuration);
        }

        private void FailRitual(ActiveRitual ritual, string reason)
        {
            ritual.State = RitualState.Failed;

            // Stop ambient
            if (_audioSource != null && _audioSource.isPlaying)
            {
                _audioSource.Stop();
            }

            // Play fail sound
            if (_ritualFailSound != null && _audioSource != null)
            {
                _audioSource.PlayOneShot(_ritualFailSound);
            }

            // Set cooldown if retryable
            if (ritual.Definition.retryable)
            {
                _cooldowns[ritual.Definition.ritualId] = Time.time + ritual.Definition.retryCooldown;
            }

            // Remove from active
            _activeRituals.Remove(ritual);

            // Publish failure
            ReactiveSystemBus.Publish(new SymbolicEvent(
                ritual.Definition.failureSignal,
                GetCurrentState(),
                50,
                SymbolicArchetype.TheEcho,
                "RitualExecutor"
            ));

            // Notify
            OnRitualFailed?.Invoke(ritual.Definition, reason);

            Log($"Failed ritual: {ritual.Definition.displayName} - {reason}");
        }

        /// <summary>
        /// Force cancel an active ritual.
        /// </summary>
        public void CancelRitual(string ritualId)
        {
            var ritual = _activeRituals.Find(r => r.Definition.ritualId == ritualId);
            if (ritual != null)
            {
                FailRitual(ritual, "Cancelled");
            }
        }

        #endregion

        #region Update Loop

        private void UpdateActiveRituals()
        {
            for (int i = _activeRituals.Count - 1; i >= 0; i--)
            {
                var ritual = _activeRituals[i];

                if (ritual.State != RitualState.InProgress) continue;

                // Check total time limit
                if (ritual.Definition.totalTimeLimit > 0)
                {
                    if (ritual.ElapsedTime > ritual.Definition.totalTimeLimit)
                    {
                        FailRitual(ritual, "Time expired");
                        continue;
                    }
                }

                // Check step time limit
                var step = ritual.GetCurrentStep();
                if (step != null && step.timeLimit > 0)
                {
                    if (ritual.StepElapsedTime > step.timeLimit)
                    {
                        FailRitual(ritual, $"Step {ritual.CurrentStep + 1} timed out");
                        continue;
                    }
                }
            }
        }

        private void UpdateCooldowns()
        {
            var expired = new List<string>();

            foreach (var kvp in _cooldowns)
            {
                if (Time.time >= kvp.Value)
                {
                    expired.Add(kvp.Key);
                }
            }

            foreach (var key in expired)
            {
                _cooldowns.Remove(key);
            }
        }

        private void TryAutoStartRituals(CristalState currentState)
        {
            foreach (var definition in _availableRituals)
            {
                if (definition == null) continue;
                if (_completedRitualIds.Contains(definition.ritualId)) continue;
                if (_activeRituals.Exists(r => r.Definition.ritualId == definition.ritualId)) continue;

                int memoryIntensity = GetMemoryIntensity();
                int corruptionLevel = GetCorruptionLevel();

                if (definition.conditions.AreMet(
                    currentState,
                    _seenArchetypes,
                    _completedRitualIds,
                    memoryIntensity,
                    corruptionLevel))
                {
                    TryStartRitual(definition);
                    break; // Only start one per frame
                }
            }
        }

        #endregion

        #region Persistence

        private void SaveProgress()
        {
            if (_progressTracker != null)
            {
                var data = new RitualProgressData
                {
                    completedRitualIds = new List<string>(_completedRitualIds),
                    seenArchetypes = new List<string>()
                };

                foreach (var kvp in _seenArchetypes)
                {
                    if (kvp.Value)
                    {
                        data.seenArchetypes.Add(kvp.Key.ToString());
                    }
                }

                _progressTracker.Save(data);
            }
        }

        #endregion

        #region Helpers

        private RitualDefinition FindRitualById(string id)
        {
            foreach (var ritual in _availableRituals)
            {
                if (ritual != null && ritual.ritualId == id)
                    return ritual;
            }
            return null;
        }

        private CristalState GetCurrentState()
        {
            var stateMachine = ServiceLocator.TryGet<TerminalStateMachine>();
            return stateMachine?.CurrentStateId ?? CristalState.Waiting;
        }

        private int GetMemoryIntensity()
        {
            var memory = ServiceLocator.TryGet<CristalMemory>();
            return memory?.GetAverageIntensity() ?? 0;
        }

        private int GetCorruptionLevel()
        {
            // Could integrate with corruption system
            return 0;
        }

        private void Log(string message)
        {
            if (_debugMode)
            {
                Debug.Log($"[RitualExecutor] {message}");
            }
        }

        #endregion

        #region Debug API

        /// <summary>
        /// Get status string for debugging.
        /// </summary>
        public string GetStatusString()
        {
            var sb = new System.Text.StringBuilder();
            sb.AppendLine("=== RITUAL EXECUTOR ===");
            sb.AppendLine($"Active: {_activeRituals.Count}/{_maxConcurrentRituals}");
            sb.AppendLine($"Completed: {_completedRitualIds.Count}");
            sb.AppendLine($"Seen Archetypes: {_seenArchetypes.Count}");

            if (_activeRituals.Count > 0)
            {
                sb.AppendLine("\n--- Active Rituals ---");
                foreach (var ritual in _activeRituals)
                {
                    sb.AppendLine($"  {ritual.Definition.displayName}");
                    sb.AppendLine($"    Step: {ritual.CurrentStep + 1}/{ritual.Definition.StepCount}");
                    sb.AppendLine($"    Time: {ritual.ElapsedTime:F1}s");
                }
            }

            return sb.ToString();
        }

        #endregion
    }
}

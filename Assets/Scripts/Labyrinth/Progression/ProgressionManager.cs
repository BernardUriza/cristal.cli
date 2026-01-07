using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Ritual;
using Cristal.CLI.Arcana;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Central progression coordinator for the labyrinth.
    /// Tracks player advancement, room unlocks, and ritual milestones.
    /// </summary>
    public class ProgressionManager : MonoBehaviour
    {
        public static ProgressionManager Instance { get; private set; }

        [Header("Progression Stages")]
        [SerializeField] private ProgressionStage[] _stages;

        [Header("Entry/Exit Rooms")]
        [SerializeField] private string _entryRoomId = "0_0";
        [SerializeField] private string _exitRoomId = "exit";
        [SerializeField] private bool _exitRequiresRitual = true;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<ProgressionStage> OnStageUnlocked;
        public event Action<ProgressionStage> OnStageCompleted;
        public event Action<string> OnRoomUnlocked;
        public event Action OnExitUnlocked;
        public event Action<ProgressionMilestone> OnMilestoneReached;

        // State
        private int _currentStageIndex = 0;
        private HashSet<string> _unlockedRooms = new HashSet<string>();
        private HashSet<string> _visitedRooms = new HashSet<string>();
        private HashSet<ProgressionMilestone> _reachedMilestones = new HashSet<ProgressionMilestone>();
        private bool _exitUnlocked;

        // Properties
        public ProgressionStage CurrentStage => 
            _stages != null && _currentStageIndex < _stages.Length ? _stages[_currentStageIndex] : null;
        public int CurrentStageIndex => _currentStageIndex;
        public bool IsExitUnlocked => _exitUnlocked;
        public IReadOnlyCollection<string> VisitedRooms => _visitedRooms;
        public IReadOnlyCollection<string> UnlockedRooms => _unlockedRooms;

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            InitializeDefaultStages();
        }

        private void Start()
        {
            // Subscribe to events
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition += HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                ritualSystem.OnRitualComplete += HandleRitualComplete;
                ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
            }

            var arcanaSystem = ArcanaSystem.Instance;
            if (arcanaSystem != null)
            {
                arcanaSystem.OnArcanaInvoked += HandleArcanaInvoked;
            }

            // Unlock entry room
            UnlockRoom(_entryRoomId);

            if (_debugMode)
            {
                Debug.Log($"[ProgressionManager] Initialized with {_stages?.Length ?? 0} stages");
            }
        }

        private void OnDestroy()
        {
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition -= HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                ritualSystem.OnRitualComplete -= HandleRitualComplete;
                ritualSystem.OnUnboundTriggered -= HandleUnboundTriggered;
            }

            var arcanaSystem = ArcanaSystem.Instance;
            if (arcanaSystem != null)
            {
                arcanaSystem.OnArcanaInvoked -= HandleArcanaInvoked;
            }

            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Stage Management

        private void InitializeDefaultStages()
        {
            if (_stages == null || _stages.Length == 0)
            {
                _stages = new[]
                {
                    new ProgressionStage
                    {
                        stageId = "awakening",
                        stageName = "Awakening",
                        description = "Discover the labyrinth",
                        requiredState = CristalState.Waiting,
                        unlockRooms = new[] { "0_0", "0_1", "1_0" }
                    },
                    new ProgressionStage
                    {
                        stageId = "remembrance",
                        stageName = "Remembrance",
                        description = "Unlock memories through interaction",
                        requiredState = CristalState.Remembering,
                        requiredMemoryCount = 3,
                        unlockRooms = new[] { "1_1", "2_0", "2_1" }
                    },
                    new ProgressionStage
                    {
                        stageId = "corruption",
                        stageName = "Corruption",
                        description = "Face the glitches within",
                        requiredState = CristalState.Corrupted,
                        requiredArcanaIds = new[] { 13 }, // Death
                        unlockRooms = new[] { "2_2", "3_0", "3_1" }
                    },
                    new ProgressionStage
                    {
                        stageId = "echo",
                        stageName = "Echo",
                        description = "Hear the voices of the past",
                        requiredState = CristalState.Echo,
                        requiredArcanaIds = new[] { 18 }, // Moon
                        unlockRooms = new[] { "3_2", "4_0" }
                    },
                    new ProgressionStage
                    {
                        stageId = "unbound",
                        stageName = "Unbound",
                        description = "Complete the ritual",
                        requiredState = CristalState.Unbound,
                        requiresRitualComplete = true,
                        unlockRooms = new[] { "exit" }
                    }
                };
            }
        }

        /// <summary>
        /// Check if conditions are met to advance to next stage.
        /// </summary>
        public void CheckStageProgression()
        {
            if (_stages == null || _currentStageIndex >= _stages.Length - 1)
                return;

            var nextStage = _stages[_currentStageIndex + 1];

            if (CheckStageConditions(nextStage))
            {
                AdvanceToStage(_currentStageIndex + 1);
            }
        }

        private bool CheckStageConditions(ProgressionStage stage)
        {
            // Check state requirement
            if (stage.requiredState != CristalState.Waiting)
            {
                var stateVisited = TerminalStateMachine.Instance?.HasVisitedState(stage.requiredState) ?? false;
                if (!stateVisited) return false;
            }

            // Check memory count
            if (stage.requiredMemoryCount > 0)
            {
                var memoryCount = MemorySystem.Instance?.GetUnlockedCount() ?? 0;
                if (memoryCount < stage.requiredMemoryCount) return false;
            }

            // Check arcana requirements
            if (stage.requiredArcanaIds != null && stage.requiredArcanaIds.Length > 0)
            {
                var tracker = ArcanaProgressTracker.Instance;
                if (tracker == null) return false;

                foreach (var arcanaId in stage.requiredArcanaIds)
                {
                    if (!tracker.HasInvokedArcana(arcanaId)) return false;
                }
            }

            // Check ritual requirement
            if (stage.requiresRitualComplete)
            {
                var ritualComplete = RitualSystem.Instance?.IsRitualComplete ?? false;
                if (!ritualComplete) return false;
            }

            return true;
        }

        private void AdvanceToStage(int stageIndex)
        {
            if (stageIndex < 0 || stageIndex >= _stages.Length)
                return;

            var previousStage = CurrentStage;
            _currentStageIndex = stageIndex;
            var newStage = CurrentStage;

            if (_debugMode)
            {
                Debug.Log($"[ProgressionManager] Stage advanced: {previousStage?.stageId} -> {newStage.stageId}");
            }

            // Mark previous stage as completed
            if (previousStage != null)
            {
                OnStageCompleted?.Invoke(previousStage);
            }

            // Unlock new rooms
            if (newStage.unlockRooms != null)
            {
                foreach (var roomId in newStage.unlockRooms)
                {
                    UnlockRoom(roomId);
                }
            }

            OnStageUnlocked?.Invoke(newStage);

            // Check if this unlocks the exit
            if (newStage.stageId == "unbound" || 
                (newStage.unlockRooms != null && System.Array.IndexOf(newStage.unlockRooms, _exitRoomId) >= 0))
            {
                UnlockExit();
            }
        }

        #endregion

        #region Room Management

        /// <summary>
        /// Unlock a room by ID.
        /// </summary>
        public void UnlockRoom(string roomId)
        {
            if (string.IsNullOrEmpty(roomId)) return;

            if (_unlockedRooms.Add(roomId))
            {
                if (_debugMode)
                {
                    Debug.Log($"[ProgressionManager] Room unlocked: {roomId}");
                }

                OnRoomUnlocked?.Invoke(roomId);
            }
        }

        /// <summary>
        /// Mark a room as visited.
        /// </summary>
        public void VisitRoom(string roomId)
        {
            if (string.IsNullOrEmpty(roomId)) return;

            if (_visitedRooms.Add(roomId))
            {
                if (_debugMode)
                {
                    Debug.Log($"[ProgressionManager] Room visited: {roomId}");
                }

                // Check for stage progression after visiting a room
                CheckStageProgression();
            }
        }

        /// <summary>
        /// Check if a room is unlocked.
        /// </summary>
        public bool IsRoomUnlocked(string roomId)
        {
            return _unlockedRooms.Contains(roomId);
        }

        /// <summary>
        /// Check if a room has been visited.
        /// </summary>
        public bool IsRoomVisited(string roomId)
        {
            return _visitedRooms.Contains(roomId);
        }

        private void UnlockExit()
        {
            if (_exitUnlocked) return;

            _exitUnlocked = true;
            UnlockRoom(_exitRoomId);

            if (_debugMode)
            {
                Debug.Log("[ProgressionManager] EXIT UNLOCKED");
            }

            ReachMilestone(ProgressionMilestone.ExitUnlocked);
            OnExitUnlocked?.Invoke();
        }

        #endregion

        #region Milestones

        /// <summary>
        /// Mark a milestone as reached.
        /// </summary>
        public void ReachMilestone(ProgressionMilestone milestone)
        {
            if (_reachedMilestones.Add(milestone))
            {
                if (_debugMode)
                {
                    Debug.Log($"[ProgressionManager] Milestone reached: {milestone}");
                }

                OnMilestoneReached?.Invoke(milestone);
            }
        }

        /// <summary>
        /// Check if a milestone has been reached.
        /// </summary>
        public bool HasReachedMilestone(ProgressionMilestone milestone)
        {
            return _reachedMilestones.Contains(milestone);
        }

        #endregion

        #region Event Handlers

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            // Track state milestones
            switch (to)
            {
                case CristalState.Remembering:
                    ReachMilestone(ProgressionMilestone.FirstMemory);
                    break;
                case CristalState.Corrupted:
                    ReachMilestone(ProgressionMilestone.FirstCorruption);
                    break;
                case CristalState.Echo:
                    ReachMilestone(ProgressionMilestone.FirstEcho);
                    break;
                case CristalState.Unbound:
                    ReachMilestone(ProgressionMilestone.UnboundReached);
                    break;
            }

            CheckStageProgression();
        }

        private void HandleRitualComplete()
        {
            ReachMilestone(ProgressionMilestone.RitualComplete);
            CheckStageProgression();
        }

        private void HandleUnboundTriggered()
        {
            ReachMilestone(ProgressionMilestone.UnboundTriggered);

            // If exit requires ritual and it's complete, unlock exit
            if (_exitRequiresRitual)
            {
                UnlockExit();
            }
        }

        private void HandleArcanaInvoked(ArcanaDefinition arcana)
        {
            if (arcana.id == 0)
            {
                ReachMilestone(ProgressionMilestone.FoolInvoked);
            }

            CheckStageProgression();
        }

        #endregion

        #region Save/Load

        /// <summary>
        /// Get progression state for saving.
        /// </summary>
        public ProgressionSaveData GetSaveData()
        {
            return new ProgressionSaveData
            {
                currentStageIndex = _currentStageIndex,
                unlockedRooms = new List<string>(_unlockedRooms),
                visitedRooms = new List<string>(_visitedRooms),
                reachedMilestones = new List<ProgressionMilestone>(_reachedMilestones),
                exitUnlocked = _exitUnlocked
            };
        }

        /// <summary>
        /// Load progression state.
        /// </summary>
        public void LoadSaveData(ProgressionSaveData data)
        {
            if (data == null) return;

            _currentStageIndex = data.currentStageIndex;
            _unlockedRooms = new HashSet<string>(data.unlockedRooms ?? new List<string>());
            _visitedRooms = new HashSet<string>(data.visitedRooms ?? new List<string>());
            _reachedMilestones = new HashSet<ProgressionMilestone>(data.reachedMilestones ?? new List<ProgressionMilestone>());
            _exitUnlocked = data.exitUnlocked;

            if (_debugMode)
            {
                Debug.Log($"[ProgressionManager] Loaded save data: Stage {_currentStageIndex}, {_unlockedRooms.Count} rooms unlocked");
            }
        }

        #endregion
    }

    #region Data Types

    /// <summary>
    /// A stage of progression through the labyrinth.
    /// </summary>
    [Serializable]
    public class ProgressionStage
    {
        public string stageId;
        public string stageName;
        public string description;
        public CristalState requiredState = CristalState.Waiting;
        public int requiredMemoryCount;
        public int[] requiredArcanaIds;
        public bool requiresRitualComplete;
        public string[] unlockRooms;
    }

    /// <summary>
    /// Key progression milestones.
    /// </summary>
    public enum ProgressionMilestone
    {
        FirstMemory,
        FirstCorruption,
        FirstEcho,
        FirstArcana,
        FoolInvoked,
        RitualComplete,
        UnboundTriggered,
        UnboundReached,
        ExitUnlocked,
        EscapedLabyrinth
    }

    /// <summary>
    /// Serializable save data for progression.
    /// </summary>
    [Serializable]
    public class ProgressionSaveData
    {
        public int currentStageIndex;
        public List<string> unlockedRooms;
        public List<string> visitedRooms;
        public List<ProgressionMilestone> reachedMilestones;
        public bool exitUnlocked;
    }

    #endregion
}

using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Tracks Arcana invocations and unlocks for progression purposes.
    /// Provides events and queries for progression conditions.
    /// </summary>
    public class ArcanaProgressTracker : MonoBehaviour
    {
        public static ArcanaProgressTracker Instance { get; private set; }

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<int> OnArcanaFirstInvoked;
        public event Action<int> OnArcanaUnlocked;
        public event Action OnRitualArcanaComplete;

        // Tracking
        private HashSet<int> _invokedArcanaIds = new HashSet<int>();
        private HashSet<int> _unlockedArcanaIds = new HashSet<int>();
        private Dictionary<int, int> _invocationCounts = new Dictionary<int, int>();
        private Dictionary<int, float> _lastInvocationTime = new Dictionary<int, float>();

        // Ritual Arcana (required for UNBOUND)
        private static readonly int[] RITUAL_ARCANA = { 13, 15, 18 }; // Death, Devil, Moon

        // Properties
        public int TotalInvokedCount => _invokedArcanaIds.Count;
        public int TotalUnlockedCount => _unlockedArcanaIds.Count;
        public bool HasAllRitualArcana => CheckRitualArcanaComplete();

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Start()
        {
            // Subscribe to ArcanaSystem events
            var arcanaSystem = ArcanaSystem.Instance;
            if (arcanaSystem != null)
            {
                arcanaSystem.OnArcanaInvoked += HandleArcanaInvoked;
                arcanaSystem.OnArcanaUnlocked += HandleArcanaUnlocked;
            }

            if (_debugMode)
            {
                Debug.Log("[ArcanaProgressTracker] Initialized");
            }
        }

        private void OnDestroy()
        {
            var arcanaSystem = ArcanaSystem.Instance;
            if (arcanaSystem != null)
            {
                arcanaSystem.OnArcanaInvoked -= HandleArcanaInvoked;
                arcanaSystem.OnArcanaUnlocked -= HandleArcanaUnlocked;
            }

            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Event Handlers

        private void HandleArcanaInvoked(ArcanaDefinition arcana)
        {
            if (arcana == null) return;

            bool isFirst = !_invokedArcanaIds.Contains(arcana.id);

            // Track invocation
            _invokedArcanaIds.Add(arcana.id);
            
            if (!_invocationCounts.ContainsKey(arcana.id))
            {
                _invocationCounts[arcana.id] = 0;
            }
            _invocationCounts[arcana.id]++;
            _lastInvocationTime[arcana.id] = Time.time;

            if (_debugMode)
            {
                Debug.Log($"[ArcanaProgressTracker] Arcana {arcana.id} invoked (count: {_invocationCounts[arcana.id]})");
            }

            if (isFirst)
            {
                OnArcanaFirstInvoked?.Invoke(arcana.id);

                // Check ritual arcana completion
                if (CheckRitualArcanaComplete())
                {
                    OnRitualArcanaComplete?.Invoke();

                    if (_debugMode)
                    {
                        Debug.Log("[ArcanaProgressTracker] All ritual arcana have been invoked!");
                    }
                }
            }
        }

        private void HandleArcanaUnlocked(ArcanaDefinition arcana)
        {
            if (arcana == null) return;

            if (_unlockedArcanaIds.Add(arcana.id))
            {
                if (_debugMode)
                {
                    Debug.Log($"[ArcanaProgressTracker] Arcana {arcana.id} ({arcana.name}) unlocked");
                }

                OnArcanaUnlocked?.Invoke(arcana.id);
            }
        }

        #endregion

        #region Queries

        /// <summary>
        /// Check if an arcana has ever been invoked.
        /// </summary>
        public bool HasInvokedArcana(int arcanaId)
        {
            return _invokedArcanaIds.Contains(arcanaId);
        }

        /// <summary>
        /// Check if an arcana is unlocked.
        /// </summary>
        public bool IsArcanaUnlocked(int arcanaId)
        {
            return _unlockedArcanaIds.Contains(arcanaId);
        }

        /// <summary>
        /// Get the invocation count for an arcana.
        /// </summary>
        public int GetInvocationCount(int arcanaId)
        {
            return _invocationCounts.TryGetValue(arcanaId, out int count) ? count : 0;
        }

        /// <summary>
        /// Get the last invocation time for an arcana.
        /// </summary>
        public float GetLastInvocationTime(int arcanaId)
        {
            return _lastInvocationTime.TryGetValue(arcanaId, out float time) ? time : -1f;
        }

        /// <summary>
        /// Get all invoked arcana IDs.
        /// </summary>
        public IReadOnlyCollection<int> GetInvokedArcanaIds()
        {
            return _invokedArcanaIds;
        }

        /// <summary>
        /// Get all unlocked arcana IDs.
        /// </summary>
        public IReadOnlyCollection<int> GetUnlockedArcanaIds()
        {
            return _unlockedArcanaIds;
        }

        /// <summary>
        /// Check if all ritual arcana have been invoked.
        /// </summary>
        private bool CheckRitualArcanaComplete()
        {
            foreach (var id in RITUAL_ARCANA)
            {
                if (!_invokedArcanaIds.Contains(id))
                    return false;
            }
            return true;
        }

        /// <summary>
        /// Get ritual arcana progress (invoked / required).
        /// </summary>
        public (int invoked, int required) GetRitualArcanaProgress()
        {
            int invoked = 0;
            foreach (var id in RITUAL_ARCANA)
            {
                if (_invokedArcanaIds.Contains(id))
                    invoked++;
            }
            return (invoked, RITUAL_ARCANA.Length);
        }

        /// <summary>
        /// Get the next required ritual arcana (or -1 if all complete).
        /// </summary>
        public int GetNextRequiredRitualArcana()
        {
            foreach (var id in RITUAL_ARCANA)
            {
                if (!_invokedArcanaIds.Contains(id))
                    return id;
            }
            return -1;
        }

        #endregion

        #region Save/Load

        /// <summary>
        /// Get tracker data for saving.
        /// </summary>
        public ArcanaTrackerSaveData GetSaveData()
        {
            return new ArcanaTrackerSaveData
            {
                invokedArcanaIds = new List<int>(_invokedArcanaIds),
                unlockedArcanaIds = new List<int>(_unlockedArcanaIds),
                invocationCounts = new List<ArcanaCountEntry>(
                    GetCountEntries(_invocationCounts))
            };
        }

        /// <summary>
        /// Load tracker data.
        /// </summary>
        public void LoadSaveData(ArcanaTrackerSaveData data)
        {
            if (data == null) return;

            _invokedArcanaIds = new HashSet<int>(data.invokedArcanaIds ?? new List<int>());
            _unlockedArcanaIds = new HashSet<int>(data.unlockedArcanaIds ?? new List<int>());

            _invocationCounts.Clear();
            if (data.invocationCounts != null)
            {
                foreach (var entry in data.invocationCounts)
                {
                    _invocationCounts[entry.arcanaId] = entry.count;
                }
            }

            if (_debugMode)
            {
                Debug.Log($"[ArcanaProgressTracker] Loaded: {_invokedArcanaIds.Count} invoked, {_unlockedArcanaIds.Count} unlocked");
            }
        }

        private static IEnumerable<ArcanaCountEntry> GetCountEntries(Dictionary<int, int> dict)
        {
            foreach (var kvp in dict)
            {
                yield return new ArcanaCountEntry { arcanaId = kvp.Key, count = kvp.Value };
            }
        }

        #endregion
    }

    #region Save Data

    [Serializable]
    public class ArcanaTrackerSaveData
    {
        public List<int> invokedArcanaIds;
        public List<int> unlockedArcanaIds;
        public List<ArcanaCountEntry> invocationCounts;
    }

    [Serializable]
    public class ArcanaCountEntry
    {
        public int arcanaId;
        public int count;
    }

    #endregion
}

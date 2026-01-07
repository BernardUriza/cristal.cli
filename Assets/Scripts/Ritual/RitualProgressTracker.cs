using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cristal.CLI.Symbolic;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Serializable progress data for JSON persistence.
    /// </summary>
    [Serializable]
    public class RitualProgressData
    {
        public string sessionId;
        public string lastSaved;
        public List<string> completedRitualIds = new();
        public List<string> seenArchetypes = new();
        public int totalRitualsCompleted;
        public int totalRitualsFailed;
        public float totalRitualTime;
        public List<RitualHistoryEntry> history = new();
    }

    /// <summary>
    /// A single ritual completion/failure record.
    /// </summary>
    [Serializable]
    public class RitualHistoryEntry
    {
        public string ritualId;
        public string ritualName;
        public bool completed;
        public float duration;
        public int stepsCompleted;
        public string timestamp;
        public string rewardArchetype;
    }

    /// <summary>
    /// Persists ritual progress across sessions.
    /// 
    /// Tracks:
    /// - Completed rituals
    /// - Seen archetypes
    /// - Ritual history
    /// - Statistics
    /// </summary>
    public class RitualProgressTracker : MonoBehaviour
    {
        [Header("Persistence")]
        [SerializeField] private bool _autosave = true;
        [SerializeField] private string _saveFileName = "ritual_progress.json";
        [SerializeField] private int _maxHistoryEntries = 100;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<RitualProgressData> OnProgressLoaded;
        public event Action<RitualProgressData> OnProgressSaved;
        public event Action<string> OnRitualCompleted;
        public event Action<SymbolicArchetype> OnArchetypeUnlocked;

        // Data
        private RitualProgressData _data;
        private string _savePath;
        private bool _isDirty = false;

        public RitualProgressData CurrentData => _data;
        public int CompletedRitualCount => _data?.completedRitualIds.Count ?? 0;
        public int SeenArchetypeCount => _data?.seenArchetypes.Count ?? 0;

        #region Unity Lifecycle

        private void Awake()
        {
            _savePath = Path.Combine(Application.persistentDataPath, _saveFileName);
        }

        private void OnApplicationPause(bool pause)
        {
            if (pause && _isDirty && _autosave)
            {
                Save(_data);
            }
        }

        private void OnApplicationQuit()
        {
            if (_isDirty && _autosave)
            {
                Save(_data);
            }
        }

        #endregion

        #region Load/Save

        /// <summary>
        /// Load progress from file.
        /// </summary>
        public RitualProgressData Load()
        {
            if (File.Exists(_savePath))
            {
                try
                {
                    string json = File.ReadAllText(_savePath);
                    _data = JsonUtility.FromJson<RitualProgressData>(json);

                    // Ensure lists are initialized
                    _data.completedRitualIds ??= new List<string>();
                    _data.seenArchetypes ??= new List<string>();
                    _data.history ??= new List<RitualHistoryEntry>();

                    Log($"Loaded progress: {_data.completedRitualIds.Count} rituals, {_data.seenArchetypes.Count} archetypes");
                    OnProgressLoaded?.Invoke(_data);

                    return _data;
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[RitualProgressTracker] Failed to load: {ex.Message}");
                    return CreateNew();
                }
            }
            else
            {
                return CreateNew();
            }
        }

        /// <summary>
        /// Save progress to file.
        /// </summary>
        public void Save(RitualProgressData data)
        {
            if (data == null) return;

            _data = data;
            _data.lastSaved = DateTime.UtcNow.ToString("O");

            try
            {
                string json = JsonUtility.ToJson(_data, true);
                File.WriteAllText(_savePath, json);
                _isDirty = false;

                Log($"Saved progress: {_data.completedRitualIds.Count} rituals");
                OnProgressSaved?.Invoke(_data);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[RitualProgressTracker] Failed to save: {ex.Message}");
            }
        }

        private RitualProgressData CreateNew()
        {
            _data = new RitualProgressData
            {
                sessionId = Guid.NewGuid().ToString("N").Substring(0, 8),
                lastSaved = DateTime.UtcNow.ToString("O"),
                completedRitualIds = new List<string>(),
                seenArchetypes = new List<string>(),
                history = new List<RitualHistoryEntry>(),
                totalRitualsCompleted = 0,
                totalRitualsFailed = 0,
                totalRitualTime = 0f
            };

            Log("Created new progress file");
            return _data;
        }

        #endregion

        #region Tracking API

        /// <summary>
        /// Record a ritual completion.
        /// </summary>
        public void RecordCompletion(
            RitualDefinition ritual,
            float duration,
            int stepsCompleted,
            SymbolicArchetype rewardArchetype)
        {
            if (_data == null) Load();

            // Add to completed if not already
            if (!_data.completedRitualIds.Contains(ritual.ritualId))
            {
                _data.completedRitualIds.Add(ritual.ritualId);
            }

            // Update stats
            _data.totalRitualsCompleted++;
            _data.totalRitualTime += duration;

            // Add history entry
            var entry = new RitualHistoryEntry
            {
                ritualId = ritual.ritualId,
                ritualName = ritual.displayName,
                completed = true,
                duration = duration,
                stepsCompleted = stepsCompleted,
                timestamp = DateTime.UtcNow.ToString("O"),
                rewardArchetype = rewardArchetype.ToString()
            };

            _data.history.Add(entry);
            TrimHistory();

            // Track archetype if new
            if (rewardArchetype != SymbolicArchetype.None)
            {
                TrackArchetype(rewardArchetype);
            }

            _isDirty = true;
            OnRitualCompleted?.Invoke(ritual.ritualId);

            Log($"Recorded completion: {ritual.displayName}");

            if (_autosave)
            {
                Save(_data);
            }
        }

        /// <summary>
        /// Record a ritual failure.
        /// </summary>
        public void RecordFailure(
            RitualDefinition ritual,
            float duration,
            int stepsCompleted,
            string reason)
        {
            if (_data == null) Load();

            _data.totalRitualsFailed++;
            _data.totalRitualTime += duration;

            var entry = new RitualHistoryEntry
            {
                ritualId = ritual.ritualId,
                ritualName = ritual.displayName,
                completed = false,
                duration = duration,
                stepsCompleted = stepsCompleted,
                timestamp = DateTime.UtcNow.ToString("O"),
                rewardArchetype = null
            };

            _data.history.Add(entry);
            TrimHistory();

            _isDirty = true;

            Log($"Recorded failure: {ritual.displayName} - {reason}");

            if (_autosave)
            {
                Save(_data);
            }
        }

        /// <summary>
        /// Track that an archetype has been seen.
        /// </summary>
        public void TrackArchetype(SymbolicArchetype archetype)
        {
            if (_data == null) Load();

            string key = archetype.ToString();
            if (!_data.seenArchetypes.Contains(key))
            {
                _data.seenArchetypes.Add(key);
                _isDirty = true;

                OnArchetypeUnlocked?.Invoke(archetype);
                Log($"New archetype tracked: {archetype}");
            }
        }

        /// <summary>
        /// Check if a ritual has been completed.
        /// </summary>
        public bool IsRitualCompleted(string ritualId)
        {
            if (_data == null) Load();
            return _data.completedRitualIds.Contains(ritualId);
        }

        /// <summary>
        /// Check if an archetype has been seen.
        /// </summary>
        public bool HasSeenArchetype(SymbolicArchetype archetype)
        {
            if (_data == null) Load();
            return _data.seenArchetypes.Contains(archetype.ToString());
        }

        /// <summary>
        /// Get recent history entries.
        /// </summary>
        public List<RitualHistoryEntry> GetRecentHistory(int count = 10)
        {
            if (_data == null || _data.history == null) return new List<RitualHistoryEntry>();

            int start = Mathf.Max(0, _data.history.Count - count);
            return _data.history.GetRange(start, _data.history.Count - start);
        }

        #endregion

        #region Utilities

        private void TrimHistory()
        {
            while (_data.history.Count > _maxHistoryEntries)
            {
                _data.history.RemoveAt(0);
            }
        }

        /// <summary>
        /// Clear all progress (for debugging/new game).
        /// </summary>
        public void ClearProgress()
        {
            _data = CreateNew();
            Save(_data);
            Log("Progress cleared");
        }

        /// <summary>
        /// Force save current progress.
        /// </summary>
        public void ForceSave()
        {
            if (_data != null)
            {
                Save(_data);
            }
        }

        /// <summary>
        /// Export progress to string.
        /// </summary>
        public string ExportToString()
        {
            if (_data == null) return "No progress data";

            var sb = new System.Text.StringBuilder();
            sb.AppendLine("=== RITUAL PROGRESS ===");
            sb.AppendLine($"Session: {_data.sessionId}");
            sb.AppendLine($"Last Saved: {_data.lastSaved}");
            sb.AppendLine();
            sb.AppendLine($"Rituals Completed: {_data.totalRitualsCompleted}");
            sb.AppendLine($"Rituals Failed: {_data.totalRitualsFailed}");
            sb.AppendLine($"Total Time: {_data.totalRitualTime:F1}s");
            sb.AppendLine();

            sb.AppendLine("--- Completed Rituals ---");
            foreach (var id in _data.completedRitualIds)
            {
                sb.AppendLine($"  • {id}");
            }
            sb.AppendLine();

            sb.AppendLine("--- Seen Archetypes ---");
            foreach (var archetype in _data.seenArchetypes)
            {
                sb.AppendLine($"  • {archetype}");
            }
            sb.AppendLine();

            sb.AppendLine("--- Recent History ---");
            var recent = GetRecentHistory(10);
            foreach (var entry in recent)
            {
                string status = entry.completed ? "✓" : "✗";
                sb.AppendLine($"  {status} {entry.ritualName} ({entry.duration:F1}s)");
            }

            return sb.ToString();
        }

        private void Log(string message)
        {
            if (_debugMode)
            {
                Debug.Log($"[RitualProgressTracker] {message}");
            }
        }

        #endregion

        #region Statistics

        /// <summary>
        /// Get completion rate as percentage.
        /// </summary>
        public float GetCompletionRate()
        {
            if (_data == null) return 0f;

            int total = _data.totalRitualsCompleted + _data.totalRitualsFailed;
            if (total == 0) return 0f;

            return (float)_data.totalRitualsCompleted / total * 100f;
        }

        /// <summary>
        /// Get average ritual duration.
        /// </summary>
        public float GetAverageRitualDuration()
        {
            if (_data == null) return 0f;

            int total = _data.totalRitualsCompleted + _data.totalRitualsFailed;
            if (total == 0) return 0f;

            return _data.totalRitualTime / total;
        }

        /// <summary>
        /// Get most common archetype from completed rituals.
        /// </summary>
        public SymbolicArchetype GetMostCommonReward()
        {
            if (_data == null || _data.history == null || _data.history.Count == 0)
                return SymbolicArchetype.None;

            var counts = new Dictionary<string, int>();

            foreach (var entry in _data.history)
            {
                if (entry.completed && !string.IsNullOrEmpty(entry.rewardArchetype))
                {
                    if (!counts.ContainsKey(entry.rewardArchetype))
                        counts[entry.rewardArchetype] = 0;
                    counts[entry.rewardArchetype]++;
                }
            }

            string mostCommon = null;
            int maxCount = 0;

            foreach (var kvp in counts)
            {
                if (kvp.Value > maxCount)
                {
                    maxCount = kvp.Value;
                    mostCommon = kvp.Key;
                }
            }

            if (mostCommon != null && Enum.TryParse<SymbolicArchetype>(mostCommon, out var archetype))
            {
                return archetype;
            }

            return SymbolicArchetype.None;
        }

        #endregion
    }
}

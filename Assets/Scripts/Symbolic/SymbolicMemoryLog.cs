using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cristal.CLI.Core.Events;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Symbolic
{
    /// <summary>
    /// Entry in the symbolic memory log.
    /// </summary>
    [Serializable]
    public class SymbolicLogEntry
    {
        public string symbolId;
        public SymbolicArchetype archetype;
        public SymbolicSignalType sourceSignal;
        public CristalState sourceState;
        public int intensity;
        public float timestamp;
        public string source;
        public string svgHash;

        public SymbolicLogEntry() { }

        public SymbolicLogEntry(GeneratedSymbol symbol, SymbolicEvent evt)
        {
            symbolId = Guid.NewGuid().ToString("N").Substring(0, 8);
            archetype = symbol.Archetype;
            sourceSignal = evt.Signal;
            sourceState = evt.SourceState;
            intensity = evt.Intensity;
            timestamp = symbol.Timestamp;
            source = evt.Source;
            svgHash = symbol.SvgContent?.GetHashCode().ToString("X8") ?? "NULL";
        }

        public override string ToString()
        {
            return $"[{symbolId}] {archetype} from {sourceSignal}@{sourceState} i={intensity} @{timestamp:F1}s";
        }
    }

    /// <summary>
    /// Serializable log data for JSON persistence.
    /// </summary>
    [Serializable]
    public class SymbolicLogData
    {
        public string sessionId;
        public string createdAt;
        public List<SymbolicLogEntry> entries = new();
        public Dictionary<string, int> archetypeCounts = new();
        public Dictionary<string, int> signalCounts = new();
        public int totalSymbolsGenerated;
    }

    /// <summary>
    /// Bitácora interna de símbolos generados y sus eventos fuente.
    /// Tracks all symbolic generation for debugging, analysis, and ritual progression.
    /// </summary>
    public class SymbolicMemoryLog : MonoBehaviour
    {
        [Header("Persistence")]
        [SerializeField] private bool _persistToFile = true;
        [SerializeField] private string _logFileName = "symbolic_log.json";
        [SerializeField] private int _maxEntries = 500;

        [Header("Debug")]
        [SerializeField] private bool _logToConsole = false;

        // Events
        public event Action<SymbolicLogEntry> OnEntryLogged;
        public event Action<SymbolicArchetype, int> OnArchetypeThreshold;

        // Data
        private SymbolicLogData _logData;
        private string _logFilePath;
        private bool _isDirty = false;

        // Archetype thresholds for special triggers
        private readonly Dictionary<SymbolicArchetype, int> _archetypeThresholds = new()
        {
            { SymbolicArchetype.TheCorruption, 5 },
            { SymbolicArchetype.TheEcho, 7 },
            { SymbolicArchetype.TheMemory, 10 },
            { SymbolicArchetype.Death, 3 },
            { SymbolicArchetype.TheMoon, 3 },
            { SymbolicArchetype.TheDevil, 3 }
        };

        public IReadOnlyList<SymbolicLogEntry> Entries => _logData?.entries;
        public int TotalEntries => _logData?.entries.Count ?? 0;
        public int TotalSymbolsGenerated => _logData?.totalSymbolsGenerated ?? 0;

        #region Unity Lifecycle

        private void Awake()
        {
            _logFilePath = Path.Combine(Application.persistentDataPath, _logFileName);
            LoadLog();
        }

        private void OnApplicationPause(bool pause)
        {
            if (pause && _isDirty)
            {
                SaveLog();
            }
        }

        private void OnApplicationQuit()
        {
            if (_isDirty)
            {
                SaveLog();
            }
        }

        #endregion

        #region Logging API

        /// <summary>
        /// Log a generated symbol with its source event.
        /// </summary>
        public void LogSymbol(GeneratedSymbol symbol, in SymbolicEvent evt)
        {
            if (_logData == null) return;

            var entry = new SymbolicLogEntry(symbol, evt);
            _logData.entries.Add(entry);
            _logData.totalSymbolsGenerated++;

            // Update archetype counts
            string archetypeKey = symbol.Archetype.ToString();
            if (!_logData.archetypeCounts.ContainsKey(archetypeKey))
            {
                _logData.archetypeCounts[archetypeKey] = 0;
            }
            _logData.archetypeCounts[archetypeKey]++;

            // Update signal counts
            string signalKey = evt.Signal.ToString();
            if (!_logData.signalCounts.ContainsKey(signalKey))
            {
                _logData.signalCounts[signalKey] = 0;
            }
            _logData.signalCounts[signalKey]++;

            // Trim if over max
            while (_logData.entries.Count > _maxEntries)
            {
                _logData.entries.RemoveAt(0);
            }

            _isDirty = true;

            // Notify
            OnEntryLogged?.Invoke(entry);

            // Check thresholds
            CheckThresholds(symbol.Archetype, _logData.archetypeCounts[archetypeKey]);

            if (_logToConsole)
            {
                Debug.Log($"[SymbolicMemoryLog] {entry}");
            }
        }

        /// <summary>
        /// Log a symbol without event context.
        /// </summary>
        public void LogSymbol(GeneratedSymbol symbol)
        {
            var evt = SymbolicEvent.Simple(SymbolicSignalType.SystemInitialized, symbol.SourceState, "Manual");
            LogSymbol(symbol, in evt);
        }

        #endregion

        #region Query API

        /// <summary>
        /// Get count for a specific archetype.
        /// </summary>
        public int GetArchetypeCount(SymbolicArchetype archetype)
        {
            string key = archetype.ToString();
            return _logData?.archetypeCounts.TryGetValue(key, out int count) == true ? count : 0;
        }

        /// <summary>
        /// Get count for a specific signal type.
        /// </summary>
        public int GetSignalCount(SymbolicSignalType signal)
        {
            string key = signal.ToString();
            return _logData?.signalCounts.TryGetValue(key, out int count) == true ? count : 0;
        }

        /// <summary>
        /// Get recent entries filtered by archetype.
        /// </summary>
        public List<SymbolicLogEntry> GetEntriesByArchetype(SymbolicArchetype archetype, int maxResults = 10)
        {
            var results = new List<SymbolicLogEntry>();

            if (_logData?.entries == null) return results;

            for (int i = _logData.entries.Count - 1; i >= 0 && results.Count < maxResults; i--)
            {
                if (_logData.entries[i].archetype == archetype)
                {
                    results.Add(_logData.entries[i]);
                }
            }

            return results;
        }

        /// <summary>
        /// Get recent entries filtered by signal.
        /// </summary>
        public List<SymbolicLogEntry> GetEntriesBySignal(SymbolicSignalType signal, int maxResults = 10)
        {
            var results = new List<SymbolicLogEntry>();

            if (_logData?.entries == null) return results;

            for (int i = _logData.entries.Count - 1; i >= 0 && results.Count < maxResults; i--)
            {
                if (_logData.entries[i].sourceSignal == signal)
                {
                    results.Add(_logData.entries[i]);
                }
            }

            return results;
        }

        /// <summary>
        /// Get entries within a time range.
        /// </summary>
        public List<SymbolicLogEntry> GetEntriesInTimeRange(float startTime, float endTime)
        {
            var results = new List<SymbolicLogEntry>();

            if (_logData?.entries == null) return results;

            foreach (var entry in _logData.entries)
            {
                if (entry.timestamp >= startTime && entry.timestamp <= endTime)
                {
                    results.Add(entry);
                }
            }

            return results;
        }

        /// <summary>
        /// Get the most recent entry.
        /// </summary>
        public SymbolicLogEntry GetLastEntry()
        {
            if (_logData?.entries == null || _logData.entries.Count == 0) return null;
            return _logData.entries[_logData.entries.Count - 1];
        }

        /// <summary>
        /// Check if a specific archetype has been seen.
        /// </summary>
        public bool HasSeenArchetype(SymbolicArchetype archetype)
        {
            return GetArchetypeCount(archetype) > 0;
        }

        /// <summary>
        /// Get archetype counts as dictionary.
        /// </summary>
        public IReadOnlyDictionary<string, int> GetAllArchetypeCounts()
        {
            return _logData?.archetypeCounts ?? new Dictionary<string, int>();
        }

        /// <summary>
        /// Get signal counts as dictionary.
        /// </summary>
        public IReadOnlyDictionary<string, int> GetAllSignalCounts()
        {
            return _logData?.signalCounts ?? new Dictionary<string, int>();
        }

        #endregion

        #region Threshold Checking

        private void CheckThresholds(SymbolicArchetype archetype, int currentCount)
        {
            if (_archetypeThresholds.TryGetValue(archetype, out int threshold))
            {
                if (currentCount == threshold)
                {
                    OnArchetypeThreshold?.Invoke(archetype, threshold);

                    if (_logToConsole)
                    {
                        Debug.Log($"[SymbolicMemoryLog] Threshold reached: {archetype} = {threshold}");
                    }

                    // Publish to reactive bus
                    ReactiveSystemBus.Publish(new SymbolicEvent(
                        SymbolicSignalType.RitualProgress,
                        CristalState.Waiting,
                        (currentCount * 100) / threshold,
                        archetype,
                        "SymbolicMemoryLog"
                    ));
                }
            }
        }

        #endregion

        #region Persistence

        private void LoadLog()
        {
            if (_persistToFile && File.Exists(_logFilePath))
            {
                try
                {
                    string json = File.ReadAllText(_logFilePath);
                    _logData = JsonUtility.FromJson<SymbolicLogData>(json);

                    // JsonUtility doesn't serialize Dictionary, need manual reconstruction
                    if (_logData.archetypeCounts == null) _logData.archetypeCounts = new Dictionary<string, int>();
                    if (_logData.signalCounts == null) _logData.signalCounts = new Dictionary<string, int>();

                    Debug.Log($"[SymbolicMemoryLog] Loaded {_logData.entries.Count} entries");
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[SymbolicMemoryLog] Failed to load: {ex.Message}");
                    CreateNewLog();
                }
            }
            else
            {
                CreateNewLog();
            }
        }

        private void CreateNewLog()
        {
            _logData = new SymbolicLogData
            {
                sessionId = Guid.NewGuid().ToString("N").Substring(0, 8),
                createdAt = DateTime.UtcNow.ToString("O"),
                entries = new List<SymbolicLogEntry>(),
                archetypeCounts = new Dictionary<string, int>(),
                signalCounts = new Dictionary<string, int>(),
                totalSymbolsGenerated = 0
            };

            Debug.Log($"[SymbolicMemoryLog] Created new log: {_logData.sessionId}");
        }

        private void SaveLog()
        {
            if (!_persistToFile || _logData == null) return;

            try
            {
                string json = JsonUtility.ToJson(_logData, true);
                File.WriteAllText(_logFilePath, json);
                _isDirty = false;

                Debug.Log($"[SymbolicMemoryLog] Saved {_logData.entries.Count} entries");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[SymbolicMemoryLog] Failed to save: {ex.Message}");
            }
        }

        /// <summary>
        /// Force save the log.
        /// </summary>
        public void ForceSave()
        {
            SaveLog();
        }

        /// <summary>
        /// Clear the log and start fresh.
        /// </summary>
        public void ClearLog()
        {
            CreateNewLog();
            _isDirty = true;
            SaveLog();
        }

        #endregion

        #region Export

        /// <summary>
        /// Export log to a formatted string.
        /// </summary>
        public string ExportToString()
        {
            if (_logData == null) return "No log data";

            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"=== SYMBOLIC MEMORY LOG ===");
            sb.AppendLine($"Session: {_logData.sessionId}");
            sb.AppendLine($"Created: {_logData.createdAt}");
            sb.AppendLine($"Total Symbols: {_logData.totalSymbolsGenerated}");
            sb.AppendLine();

            sb.AppendLine("--- Archetype Counts ---");
            foreach (var kvp in _logData.archetypeCounts)
            {
                sb.AppendLine($"  {kvp.Key}: {kvp.Value}");
            }
            sb.AppendLine();

            sb.AppendLine("--- Recent Entries ---");
            int start = Mathf.Max(0, _logData.entries.Count - 20);
            for (int i = start; i < _logData.entries.Count; i++)
            {
                sb.AppendLine($"  {_logData.entries[i]}");
            }

            return sb.ToString();
        }

        #endregion
    }
}

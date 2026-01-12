using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.AI.Dreams;
using Cristal.CLI.Labyrinth.Dream;

namespace Cristal.CLI.Memory
{
    /// <summary>
    /// Bridge between the Dream system and Memory persistence.
    /// Exposes memory context to AI systems and tracks dream-specific data.
    /// </summary>
    public class DreamMemoryBridge : MonoBehaviour
    {
        public static DreamMemoryBridge Instance { get; private set; }

        [Header("Settings")]
        [SerializeField] private bool _autoSave = true;
        [SerializeField] private float _autoSaveInterval = 60f;

        // Events
        public event Action<string> OnDreamEntered;
        public event Action<string, float> OnDreamExited;
        public event Action<string> OnSymbolEncountered;
        public event Action<string> OnInscriptionRecorded;

        // Data
        private DreamMemoryData _data;
        private string _persistPath;
        private float _lastSaveTime;
        private bool _isDirty;
        private float _currentDreamStartTime;
        private string _currentDreamTheme;

        // Core memory reference
        private CristalMemory _coreMemory;

        public DreamMemoryData Data => _data;
        public bool IsInDream => !string.IsNullOrEmpty(_currentDreamTheme);

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            ServiceLocator.RegisterMono(this);

            _persistPath = Path.Combine(Application.persistentDataPath, "dream_memory.json");
            Load();
        }

        private void Start()
        {
            _coreMemory = ServiceLocator.TryGet<CristalMemory>();
            if (_coreMemory == null)
            {
                _coreMemory = CristalMemory.Instance;
            }
        }

        private void Update()
        {
            if (_autoSave && _isDirty && Time.time - _lastSaveTime > _autoSaveInterval)
            {
                Save();
            }
        }

        private void OnApplicationQuit()
        {
            if (_isDirty) Save();
        }

        private void OnApplicationPause(bool pause)
        {
            if (pause && _isDirty) Save();
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Persistence

        private void Load()
        {
            if (File.Exists(_persistPath))
            {
                try
                {
                    string json = File.ReadAllText(_persistPath);
                    _data = JsonUtility.FromJson<DreamMemoryData>(json);
                    CristalLog.Info("DreamMemoryBridge", $"Loaded dream memory: {_data.totalDreamsEntered} dreams");
                }
                catch (Exception e)
                {
                    CristalLog.Error("DreamMemoryBridge", $"Load failed: {e.Message}");
                    _data = new DreamMemoryData();
                }
            }
            else
            {
                _data = new DreamMemoryData();
            }
        }

        public void Save()
        {
            try
            {
                _data.lastUpdated = DateTime.UtcNow.ToString("o");
                string json = JsonUtility.ToJson(_data, true);
                File.WriteAllText(_persistPath, json);
                _isDirty = false;
                _lastSaveTime = Time.time;
                CristalLog.Info("DreamMemoryBridge", "Dream memory saved");
            }
            catch (Exception e)
            {
                CristalLog.Error("DreamMemoryBridge", $"Save failed: {e.Message}");
            }
        }

        #endregion

        #region Dream Recording

        /// <summary>
        /// Record entry into a dream.
        /// </summary>
        public void RecordDreamEntry(string themeName, DreamContext context)
        {
            _currentDreamTheme = themeName;
            _currentDreamStartTime = Time.time;

            _data.totalDreamsEntered++;
            _data.AddThemeOccurrence(themeName);

            // Record in history
            _data.dreamHistory.Add(new DreamHistoryEntry
            {
                themeName = themeName,
                entryTimestamp = DateTime.UtcNow.ToString("o"),
                emotionalIntensity = context?.Intensity ?? 0.5f,
                arcanaId = context?.ActiveArcana?.id ?? -1
            });

            // Limit history size
            while (_data.dreamHistory.Count > 100)
            {
                _data.dreamHistory.RemoveAt(0);
            }

            _isDirty = true;
            OnDreamEntered?.Invoke(themeName);
        }

        /// <summary>
        /// Record exit from a dream.
        /// </summary>
        public void RecordDreamExit(string themeName)
        {
            if (string.IsNullOrEmpty(_currentDreamTheme)) return;

            float duration = Time.time - _currentDreamStartTime;
            _data.totalDreamTime += duration;

            // Update history entry
            if (_data.dreamHistory.Count > 0)
            {
                var lastEntry = _data.dreamHistory[_data.dreamHistory.Count - 1];
                if (lastEntry.themeName == themeName)
                {
                    lastEntry.duration = duration;
                    lastEntry.exitTimestamp = DateTime.UtcNow.ToString("o");
                }
            }

            _isDirty = true;
            OnDreamExited?.Invoke(themeName, duration);

            _currentDreamTheme = null;
            _currentDreamStartTime = 0;
        }

        /// <summary>
        /// Record seeing a symbol in a dream.
        /// </summary>
        public void RecordSymbolSeen(SymbolType symbol)
        {
            RecordSymbolEncounter(symbol.ToString());
        }

        /// <summary>
        /// Record encountering a symbol (by name).
        /// </summary>
        public void RecordSymbolEncounter(string symbolName)
        {
            _data.IncrementSymbolCount(symbolName);
            _isDirty = true;
            OnSymbolEncountered?.Invoke(symbolName);
        }

        /// <summary>
        /// Record a wall inscription seen.
        /// </summary>
        public void RecordInscription(string inscription)
        {
            if (string.IsNullOrEmpty(inscription)) return;

            if (!_data.seenInscriptions.Contains(inscription))
            {
                _data.seenInscriptions.Add(inscription);

                // Limit inscription history
                while (_data.seenInscriptions.Count > 200)
                {
                    _data.seenInscriptions.RemoveAt(0);
                }

                _isDirty = true;
                OnInscriptionRecorded?.Invoke(inscription);
            }
        }

        #endregion

        #region Context Building

        /// <summary>
        /// Build a DreamContext for AI prompt generation.
        /// </summary>
        public DreamContext BuildDreamContext(string themeName)
        {
            var context = new DreamContext
            {
                Theme = themeName,
                DreamTheme = themeName,
                Intensity = GetEmotionalIntensity()
            };

            // Add keywords from memory
            if (_coreMemory?.Data != null)
            {
                var topKeywords = _coreMemory.GetTopKeywords(5);
                if (topKeywords != null && topKeywords.Count > 0)
                {
                    context.Keywords = new string[topKeywords.Count];
                    for (int i = 0; i < topKeywords.Count; i++)
                    {
                        context.Keywords[i] = topKeywords[i].keyword;
                    }
                }
            }

            return context;
        }

        /// <summary>
        /// Get emotional profile summary.
        /// </summary>
        public string GetEmotionalProfile()
        {
            if (_coreMemory?.Data == null) return "neutral";
            return _coreMemory.Data.stateFlags.dominantEmotion ?? "neutral";
        }

        /// <summary>
        /// Get journey summary for AI context.
        /// </summary>
        public string GetJourneySummary()
        {
            var sb = new System.Text.StringBuilder();

            sb.AppendLine($"Dreams entered: {_data.totalDreamsEntered}");
            sb.AppendLine($"Total dream time: {_data.totalDreamTime:F0}s");

            // Top themes
            var topThemes = _data.GetTopThemes(3);
            if (topThemes.Count > 0)
            {
                sb.Append("Recurring themes: ");
                sb.AppendLine(string.Join(", ", topThemes));
            }

            // Recent symbols
            if (_data.symbolEncounters.Count > 0)
            {
                sb.AppendLine($"Symbols encountered: {_data.symbolEncounters.Count} types");
            }

            // Core memory context
            if (_coreMemory != null)
            {
                sb.AppendLine($"Emotional state: {GetEmotionalProfile()}");
                sb.AppendLine($"Corruption: {_coreMemory.Data.stateFlags.corruptionLevel:P0}");
            }

            return sb.ToString();
        }

        /// <summary>
        /// Get dream affinity (0-1) based on dream history.
        /// Higher values = more attuned to dreams.
        /// </summary>
        public float GetDreamAffinity()
        {
            // Base affinity from dream count
            float countFactor = Mathf.Clamp01(_data.totalDreamsEntered / 20f);

            // Time factor
            float timeFactor = Mathf.Clamp01(_data.totalDreamTime / 1800f); // 30 min max

            // Symbol diversity factor
            float symbolFactor = Mathf.Clamp01(_data.symbolEncounters.Count / 8f);

            return (countFactor * 0.4f + timeFactor * 0.3f + symbolFactor * 0.3f);
        }

        #endregion

        #region Query Methods

        /// <summary>
        /// Check if player has seen a specific symbol.
        /// </summary>
        public bool HasSeenSymbol(SymbolType symbol)
        {
            return _data.symbolEncounters.ContainsKey(symbol.ToString());
        }

        /// <summary>
        /// Get how many times a symbol was seen.
        /// </summary>
        public int GetSymbolCount(SymbolType symbol)
        {
            return _data.GetSymbolCount(symbol.ToString());
        }

        /// <summary>
        /// Get recent dream themes.
        /// </summary>
        public List<string> GetRecentThemes(int count)
        {
            var themes = new List<string>();
            int start = Mathf.Max(0, _data.dreamHistory.Count - count);

            for (int i = _data.dreamHistory.Count - 1; i >= start; i--)
            {
                themes.Add(_data.dreamHistory[i].themeName);
            }

            return themes;
        }

        /// <summary>
        /// Get a random inscription from history.
        /// </summary>
        public string GetRandomSeenInscription()
        {
            if (_data.seenInscriptions.Count == 0) return null;
            int index = UnityEngine.Random.Range(0, _data.seenInscriptions.Count);
            return _data.seenInscriptions[index];
        }

        /// <summary>
        /// Export dream memory to string.
        /// </summary>
        public string ExportToString()
        {
            return JsonUtility.ToJson(_data, true);
        }

        /// <summary>
        /// Clear all dream memory.
        /// </summary>
        public void ClearMemory()
        {
            _data = new DreamMemoryData();
            _isDirty = true;
            Save();
        }

        #endregion

        #region Private Helpers

        private float GetEmotionalIntensity()
        {
            if (_coreMemory?.Data == null) return 0.5f;

            float avg = _coreMemory.GetEmotionalAverage();
            return Mathf.Clamp01(Mathf.Abs(avg) / 2f + 0.3f);
        }

        #endregion
    }

    #region Data Structures

    /// <summary>
    /// Persistent data for dream-specific memory.
    /// </summary>
    [Serializable]
    public class DreamMemoryData
    {
        public string lastUpdated;
        public int totalDreamsEntered;
        public float totalDreamTime;

        public List<DreamHistoryEntry> dreamHistory = new List<DreamHistoryEntry>();
        public SerializableDictionary symbolEncounters = new SerializableDictionary();
        public SerializableDictionary themeOccurrences = new SerializableDictionary();
        public List<string> seenInscriptions = new List<string>();

        public void AddThemeOccurrence(string theme)
        {
            themeOccurrences.Increment(theme);
        }

        public void IncrementSymbolCount(string symbol)
        {
            symbolEncounters.Increment(symbol);
        }

        public int GetSymbolCount(string symbol)
        {
            return symbolEncounters.GetCount(symbol);
        }

        public List<string> GetTopThemes(int count)
        {
            return themeOccurrences.GetTopKeys(count);
        }
    }

    /// <summary>
    /// Single dream session history entry.
    /// </summary>
    [Serializable]
    public class DreamHistoryEntry
    {
        public string themeName;
        public string entryTimestamp;
        public string exitTimestamp;
        public float duration;
        public float emotionalIntensity;
        public int arcanaId;
    }

    /// <summary>
    /// Simple serializable string-int dictionary for Unity JSON.
    /// </summary>
    [Serializable]
    public class SerializableDictionary
    {
        [SerializeField] private List<string> keys = new List<string>();
        [SerializeField] private List<int> values = new List<int>();

        // Runtime cache
        [NonSerialized] private Dictionary<string, int> _cache;

        private void EnsureCache()
        {
            if (_cache == null)
            {
                _cache = new Dictionary<string, int>();
                for (int i = 0; i < keys.Count && i < values.Count; i++)
                {
                    _cache[keys[i]] = values[i];
                }
            }
        }

        public void Increment(string key)
        {
            EnsureCache();

            if (_cache.ContainsKey(key))
            {
                _cache[key]++;
            }
            else
            {
                _cache[key] = 1;
            }

            SyncToLists();
        }

        public int GetCount(string key)
        {
            EnsureCache();
            return _cache.TryGetValue(key, out int val) ? val : 0;
        }

        public bool ContainsKey(string key)
        {
            EnsureCache();
            return _cache.ContainsKey(key);
        }

        public int Count
        {
            get
            {
                EnsureCache();
                return _cache.Count;
            }
        }

        public List<string> GetTopKeys(int count)
        {
            EnsureCache();

            var sorted = new List<KeyValuePair<string, int>>(_cache);
            sorted.Sort((a, b) => b.Value.CompareTo(a.Value));

            var result = new List<string>();
            for (int i = 0; i < count && i < sorted.Count; i++)
            {
                result.Add(sorted[i].Key);
            }
            return result;
        }

        private void SyncToLists()
        {
            keys.Clear();
            values.Clear();
            foreach (var kvp in _cache)
            {
                keys.Add(kvp.Key);
                values.Add(kvp.Value);
            }
        }
    }

    #endregion
}

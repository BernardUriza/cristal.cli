using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Memory
{
    /// <summary>
    /// Core persistent memory manager for CRISTAL.
    /// Handles JSON persistence to StreamingAssets and runtime memory operations.
    /// Registered with ServiceLocator, DontDestroyOnLoad.
    /// </summary>
    public class CristalMemory : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<CristalMemory>() instead
        [Obsolete("Use ServiceLocator.Get<CristalMemory>() instead")]
        public static CristalMemory Instance { get; private set; }

        [Header("Persistence Settings")]
        [SerializeField] private bool _autoSave = true;
        [SerializeField] private float _autoSaveInterval = 30f;
        [SerializeField] private int _maxCommandHistory = 500;

        // Events
        public event Action<CommandEntry> OnCommandLogged;
        public event Action<string> OnKeywordDiscovered;
        public event Action<int> OnArcanaUnlocked;
        public event Action<CristalState> OnStateChanged;
        public event Action OnMemoryLoaded;
        public event Action OnMemorySaved;

        private CristalMemoryData _data;
        private float _lastSaveTime;
        private string _memoryFilePath;
        private bool _isDirty = false;

        public CristalMemoryData Data => _data;
        public string SessionId => _data?.sessionId;
        public int CommandCount => _data?.commands.Count ?? 0;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
                DontDestroyOnLoad(gameObject);
                InitializeMemory();
            }
            else
            {
                Destroy(gameObject);
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
            if (_isDirty)
            {
                Save();
            }
        }

        private void OnApplicationPause(bool pause)
        {
            if (pause && _isDirty)
            {
                Save();
            }
        }

        private void InitializeMemory()
        {
            _memoryFilePath = GetMemoryFilePath();

            if (File.Exists(_memoryFilePath))
            {
                Load();
            }
            else
            {
                CreateNewMemory();
            }

            // Check for legacy data migration
            MigrateFromLegacy();
        }

        private string GetMemoryFilePath()
        {
            string folder = Application.streamingAssetsPath;

            // Ensure StreamingAssets folder exists
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }

            return Path.Combine(folder, "cristalMemory.json");
        }

        private void CreateNewMemory()
        {
            _data = new CristalMemoryData
            {
                sessionId = GenerateSessionId()
            };

            Debug.Log($"[CristalMemory] New memory created. Session: {_data.sessionId}");
            Save();
            OnMemoryLoaded?.Invoke();
        }

        private string GenerateSessionId()
        {
            char letter = (char)UnityEngine.Random.Range(65, 91);
            int number = UnityEngine.Random.Range(0, 99);
            return $"FRACTURE_00_{letter}{number:D2}";
        }

        #region Persistence

        public void Save()
        {
            try
            {
                _data.UpdateTimestamp();
                string json = JsonUtility.ToJson(_data, true);
                File.WriteAllText(_memoryFilePath, json);
                _isDirty = false;
                _lastSaveTime = Time.time;
                Debug.Log($"[CristalMemory] Saved to {_memoryFilePath}");
                OnMemorySaved?.Invoke();
            }
            catch (Exception e)
            {
                Debug.LogError($"[CristalMemory] Save failed: {e.Message}");
            }
        }

        public void Load()
        {
            try
            {
                string json = File.ReadAllText(_memoryFilePath);
                _data = JsonUtility.FromJson<CristalMemoryData>(json);
                _data.progression.sessionCount++;
                _isDirty = true;
                Debug.Log($"[CristalMemory] Loaded. Session: {_data.sessionId}, Commands: {_data.commands.Count}");
                OnMemoryLoaded?.Invoke();
            }
            catch (Exception e)
            {
                Debug.LogError($"[CristalMemory] Load failed: {e.Message}");
                CreateNewMemory();
            }
        }

        private void MigrateFromLegacy()
        {
            // Check for Phase 1 PlayerPrefs data
            if (PlayerPrefs.HasKey("CristalCLI_Memory"))
            {
                try
                {
                    string legacyJson = PlayerPrefs.GetString("CristalCLI_Memory");
                    // Could parse legacy format here if needed
                    PlayerPrefs.DeleteKey("CristalCLI_Memory");
                    Debug.Log("[CristalMemory] Legacy data migrated");
                }
                catch (Exception e)
                {
                    Debug.LogWarning($"[CristalMemory] Legacy migration failed: {e.Message}");
                }
            }
        }

        #endregion

        #region Command Logging

        /// <summary>
        /// Log a player command with emotional analysis and keyword extraction.
        /// </summary>
        public void LogCommand(string input, string responseType = "Default", string currentState = "Waiting")
        {
            if (string.IsNullOrWhiteSpace(input)) return;

            var entry = new CommandEntry(input, Time.time)
            {
                responseType = responseType,
                stateAtTime = currentState,
                emotionalWeight = CalculateEmotionalWeight(input),
                keywords = ExtractKeywords(input)
            };

            // Add to history (with capacity limit)
            _data.commands.Add(entry);
            if (_data.commands.Count > _maxCommandHistory)
            {
                _data.commands.RemoveAt(0);
            }

            // Update keyword counts
            foreach (string keyword in entry.keywords)
            {
                int previousCount = _data.discoveredKeywords.GetCount(keyword);
                _data.discoveredKeywords.Increment(keyword);

                if (previousCount == 0)
                {
                    OnKeywordDiscovered?.Invoke(keyword);
                }
            }

            // Update state flags
            _data.stateFlags.totalCommands++;
            _data.stateFlags.cumulativeEmotionalWeight += entry.emotionalWeight;
            UpdateDominantEmotion();
            CheckSpecialKeywords(input);

            _isDirty = true;
            OnCommandLogged?.Invoke(entry);
        }

        private float CalculateEmotionalWeight(string input)
        {
            string lower = input.ToLower();
            float weight = 0f;

            // Positive indicators
            string[] positive = { "hope", "love", "happy", "good", "beautiful", "light", "peace", "joy", "warm", "trust" };
            foreach (string word in positive)
            {
                if (lower.Contains(word)) weight += 0.5f;
            }

            // Negative indicators
            string[] negative = { "fear", "alone", "lost", "dark", "pain", "hate", "scared", "afraid", "confused", "cold", "empty", "dead" };
            foreach (string word in negative)
            {
                if (lower.Contains(word)) weight -= 0.5f;
            }

            // Intensity multipliers
            if (lower.Contains("!") || lower.Contains("?!")) weight *= 1.2f;
            if (lower.Contains("always") || lower.Contains("never")) weight *= 1.2f;
            if (lower.Contains("very") || lower.Contains("so much")) weight *= 1.3f;

            return Mathf.Clamp(weight, -2f, 2f);
        }

        private List<string> ExtractKeywords(string input)
        {
            var keywords = new List<string>();
            string[] stopWords = { "the", "a", "an", "is", "are", "was", "were", "am", "i", "you", "we", "they", "it", "to", "of", "and", "or", "in", "on", "at", "for", "with", "do", "does", "did", "have", "has", "had", "be", "been", "being", "what", "who", "how", "why", "when", "where" };

            string[] words = input.ToLower().Split(new char[] { ' ', ',', '.', '!', '?', ';', ':', '"', '\'' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string word in words)
            {
                if (word.Length >= 3 && !Array.Exists(stopWords, w => w == word))
                {
                    keywords.Add(word);
                }
            }

            return keywords;
        }

        private void UpdateDominantEmotion()
        {
            float avg = _data.stateFlags.totalCommands > 0
                ? _data.stateFlags.cumulativeEmotionalWeight / _data.stateFlags.totalCommands
                : 0f;

            if (avg > 0.5f) _data.stateFlags.dominantEmotion = "hopeful";
            else if (avg > 0.2f) _data.stateFlags.dominantEmotion = "curious";
            else if (avg < -0.5f) _data.stateFlags.dominantEmotion = "fearful";
            else if (avg < -0.2f) _data.stateFlags.dominantEmotion = "melancholic";
            else _data.stateFlags.dominantEmotion = "neutral";
        }

        private void CheckSpecialKeywords(string input)
        {
            string lower = input.ToLower();

            if (lower.Contains("exit") || lower.Contains("quit") || lower.Contains("leave"))
            {
                _data.stateFlags.exitAttempted = true;
            }

            if (lower.Contains("truth") || lower.Contains("real") || lower.Contains("true"))
            {
                _data.stateFlags.truthRevealed = true;
            }

            if (lower.Contains("love") || lower.Contains("heart"))
            {
                _data.stateFlags.loveMentioned = true;
            }
        }

        #endregion

        #region Query Methods

        public List<CommandEntry> GetRecentCommands(int count)
        {
            int start = Mathf.Max(0, _data.commands.Count - count);
            return _data.commands.GetRange(start, _data.commands.Count - start);
        }

        public List<CommandEntry> SearchCommands(string keyword)
        {
            return _data.commands.FindAll(c => c.input.ToLower().Contains(keyword.ToLower()));
        }

        public CommandEntry GetRandomCommand()
        {
            if (_data.commands.Count == 0) return null;
            int index = UnityEngine.Random.Range(0, _data.commands.Count);
            return _data.commands[index];
        }

        public List<KeywordEntry> GetTopKeywords(int count)
        {
            return _data.discoveredKeywords.GetTopKeywords(count);
        }

        public float GetEmotionalAverage()
        {
            if (_data.stateFlags.totalCommands == 0) return 0f;
            return _data.stateFlags.cumulativeEmotionalWeight / _data.stateFlags.totalCommands;
        }

        #endregion

        #region State Flags

        public void SetFlag(string flagName, bool value)
        {
            var flags = _data.stateFlags;
            var field = typeof(StateFlags).GetField(flagName);
            if (field != null && field.FieldType == typeof(bool))
            {
                field.SetValue(flags, value);
                _isDirty = true;
            }
        }

        public bool GetFlag(string flagName)
        {
            var field = typeof(StateFlags).GetField(flagName);
            if (field != null && field.FieldType == typeof(bool))
            {
                return (bool)field.GetValue(_data.stateFlags);
            }
            return false;
        }

        public void IncrementCorruption(float amount)
        {
            _data.stateFlags.corruptionLevel = Mathf.Clamp01(_data.stateFlags.corruptionLevel + amount);
            _isDirty = true;
        }

        #endregion

        #region Arcana

        public bool IsArcanaUnlocked(int arcanaId)
        {
            return _data.arcana.IsUnlocked(arcanaId);
        }

        public void UnlockArcana(int arcanaId)
        {
            if (!_data.arcana.IsUnlocked(arcanaId))
            {
                _data.arcana.Unlock(arcanaId);
                _data.stateFlags.hasInvokedArcana = true;
                _isDirty = true;
                OnArcanaUnlocked?.Invoke(arcanaId);
            }
        }

        public void ActivateArcana(int arcanaId, float duration)
        {
            _data.arcana.SetActive(arcanaId, duration);
            _isDirty = true;
        }

        public void DeactivateArcana()
        {
            _data.arcana.ClearActive();
            _isDirty = true;
        }

        public int? GetActiveArcana()
        {
            return _data.arcana.HasActiveArcana() ? _data.arcana.currentlyActive : null;
        }

        #endregion

        #region Symbols

        public void DiscoverSymbol(string symbol)
        {
            _data.symbols.Discover(symbol);
            _isDirty = true;
        }

        public void ActivateSymbol(string symbol)
        {
            _data.symbols.Activate(symbol);
            _isDirty = true;
        }

        public bool HasSymbol(string symbol)
        {
            return _data.symbols.HasDiscovered(symbol);
        }

        #endregion

        #region Progression

        public void RecordEvent(string eventName)
        {
            _data.progression.RecordEvent(eventName);
            _isDirty = true;
        }

        public bool HasSeenEvent(string eventName)
        {
            return _data.progression.HasSeenEvent(eventName);
        }

        public void AdvanceChapter()
        {
            _data.progression.chapter++;
            _isDirty = true;
        }

        #endregion

        #region AI Integration

        /// <summary>
        /// Format memory context for AI prompt injection.
        /// </summary>
        public string FormatForAI(int maxEntries = 10)
        {
            var sb = new System.Text.StringBuilder();

            sb.AppendLine($"SESSION: {_data.sessionId}");
            sb.AppendLine($"TOTAL_COMMANDS: {_data.stateFlags.totalCommands}");
            sb.AppendLine($"EMOTIONAL_STATE: {_data.stateFlags.dominantEmotion}");
            sb.AppendLine($"CORRUPTION_LEVEL: {_data.stateFlags.corruptionLevel:F2}");
            sb.AppendLine($"CHAPTER: {_data.progression.chapter}");
            sb.AppendLine();

            // Top keywords
            var topKeywords = GetTopKeywords(5);
            if (topKeywords.Count > 0)
            {
                sb.AppendLine("TOP_KEYWORDS:");
                foreach (var kw in topKeywords)
                {
                    sb.AppendLine($"  - {kw.keyword}: {kw.count}");
                }
                sb.AppendLine();
            }

            // Active arcana
            var activeArcana = GetActiveArcana();
            if (activeArcana.HasValue)
            {
                sb.AppendLine($"ACTIVE_ARCANA: {activeArcana.Value}");
                sb.AppendLine();
            }

            // Recent commands
            var recent = GetRecentCommands(maxEntries);
            if (recent.Count > 0)
            {
                sb.AppendLine("RECENT_INPUTS:");
                foreach (var cmd in recent)
                {
                    sb.AppendLine($"  [{cmd.emotionalWeight:+0.0;-0.0;0}] \"{cmd.input}\"");
                }
            }

            return sb.ToString();
        }

        /// <summary>
        /// Export complete memory to JSON string for backup.
        /// </summary>
        public string ExportToJson()
        {
            return JsonUtility.ToJson(_data, true);
        }

        /// <summary>
        /// Import memory from JSON string.
        /// </summary>
        public bool ImportFromJson(string json)
        {
            try
            {
                _data = JsonUtility.FromJson<CristalMemoryData>(json);
                _isDirty = true;
                Save();
                OnMemoryLoaded?.Invoke();
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[CristalMemory] Import failed: {e.Message}");
                return false;
            }
        }

        #endregion

        #region Reset

        /// <summary>
        /// Reset all memory (use with caution).
        /// </summary>
        public void ResetMemory()
        {
            CreateNewMemory();
            Debug.Log("[CristalMemory] Memory reset complete");
        }

        #endregion
    }
}

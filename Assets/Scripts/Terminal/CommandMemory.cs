using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI
{
    /// <summary>
    /// Command memory and log system.
    /// Tracks all player inputs for narrative purposes and future AI context.
    /// </summary>
    public class CommandMemory : MonoBehaviour
    {
        [Header("Memory Settings")]
        [SerializeField] private int _maxMemoryEntries = 100;
        [SerializeField] private bool _persistAcrossSessions = false;

        private List<MemoryEntry> _memoryLog = new List<MemoryEntry>();
        private Dictionary<string, int> _keywordFrequency = new Dictionary<string, int>();

        public event Action<MemoryEntry> OnMemoryAdded;
        public event Action OnMemoryCleared;

        public int GetCommandCount() => _memoryLog.Count;
        public IReadOnlyList<MemoryEntry> GetAllMemories() => _memoryLog.AsReadOnly();

        private void Awake()
        {
            if (_persistAcrossSessions)
            {
                LoadMemory();
            }
        }

        /// <summary>
        /// Log a command/input to memory.
        /// </summary>
        public void LogCommand(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return;

            MemoryEntry entry = new MemoryEntry
            {
                Input = input,
                Timestamp = DateTime.Now,
                SessionTime = Time.time,
                EmotionalWeight = AnalyzeEmotionalWeight(input),
                Keywords = ExtractKeywords(input)
            };

            _memoryLog.Add(entry);

            // Track keyword frequency
            foreach (string keyword in entry.Keywords)
            {
                if (_keywordFrequency.ContainsKey(keyword))
                {
                    _keywordFrequency[keyword]++;
                }
                else
                {
                    _keywordFrequency[keyword] = 1;
                }
            }

            // Trim if over capacity
            while (_memoryLog.Count > _maxMemoryEntries)
            {
                _memoryLog.RemoveAt(0);
            }

            OnMemoryAdded?.Invoke(entry);

            if (_persistAcrossSessions)
            {
                SaveMemory();
            }

            Debug.Log($"[CommandMemory] Logged: \"{input}\" (Weight: {entry.EmotionalWeight})");
        }

        /// <summary>
        /// Get the last N commands.
        /// </summary>
        public List<MemoryEntry> GetRecentMemories(int count)
        {
            int start = Mathf.Max(0, _memoryLog.Count - count);
            return _memoryLog.GetRange(start, _memoryLog.Count - start);
        }

        /// <summary>
        /// Search memories by keyword.
        /// </summary>
        public List<MemoryEntry> SearchMemories(string keyword)
        {
            string lowerKeyword = keyword.ToLower();
            return _memoryLog.FindAll(m => m.Input.ToLower().Contains(lowerKeyword));
        }

        /// <summary>
        /// Get most frequent keywords (for AI context).
        /// </summary>
        public List<KeyValuePair<string, int>> GetTopKeywords(int count)
        {
            List<KeyValuePair<string, int>> sorted = new List<KeyValuePair<string, int>>(_keywordFrequency);
            sorted.Sort((a, b) => b.Value.CompareTo(a.Value));
            return sorted.GetRange(0, Mathf.Min(count, sorted.Count));
        }

        /// <summary>
        /// Get emotional profile based on all inputs.
        /// </summary>
        public EmotionalProfile GetEmotionalProfile()
        {
            EmotionalProfile profile = new EmotionalProfile();

            foreach (MemoryEntry entry in _memoryLog)
            {
                profile.TotalWeight += entry.EmotionalWeight;
                profile.EntryCount++;
            }

            if (profile.EntryCount > 0)
            {
                profile.AverageWeight = profile.TotalWeight / profile.EntryCount;
            }

            return profile;
        }

        /// <summary>
        /// Format memory for AI context injection.
        /// </summary>
        public string FormatForAI(int maxEntries = 10)
        {
            var recent = GetRecentMemories(maxEntries);
            System.Text.StringBuilder sb = new System.Text.StringBuilder();

            sb.AppendLine("=== PLAYER MEMORY CONTEXT ===");
            sb.AppendLine($"Total Inputs: {_memoryLog.Count}");

            var topKeywords = GetTopKeywords(5);
            if (topKeywords.Count > 0)
            {
                sb.Append("Recurring themes: ");
                sb.AppendLine(string.Join(", ", topKeywords.ConvertAll(k => k.Key)));
            }

            sb.AppendLine("\nRecent inputs:");
            foreach (var entry in recent)
            {
                sb.AppendLine($"- \"{entry.Input}\"");
            }

            return sb.ToString();
        }

        /// <summary>
        /// Clear all memory.
        /// </summary>
        public void ClearMemory()
        {
            _memoryLog.Clear();
            _keywordFrequency.Clear();
            OnMemoryCleared?.Invoke();

            if (_persistAcrossSessions)
            {
                PlayerPrefs.DeleteKey("CristalCLI_Memory");
            }
        }

        private float AnalyzeEmotionalWeight(string input)
        {
            float weight = 0f;
            string lower = input.ToLower();

            // Positive indicators
            string[] positive = { "hope", "love", "happy", "good", "beautiful", "light", "peace" };
            // Negative indicators
            string[] negative = { "fear", "alone", "lost", "dark", "pain", "hate", "scared", "afraid", "confused" };
            // Intense indicators
            string[] intense = { "!", "?!", "always", "never", "everything", "nothing" };

            foreach (string word in positive)
            {
                if (lower.Contains(word)) weight += 0.5f;
            }

            foreach (string word in negative)
            {
                if (lower.Contains(word)) weight -= 0.5f;
            }

            foreach (string word in intense)
            {
                if (lower.Contains(word)) weight *= 1.2f;
            }

            // Length factor - longer inputs often carry more weight
            weight += Mathf.Log10(input.Length + 1) * 0.1f;

            return Mathf.Clamp(weight, -2f, 2f);
        }

        private List<string> ExtractKeywords(string input)
        {
            List<string> keywords = new List<string>();

            // Simple keyword extraction (future: use NLP)
            string[] stopWords = { "the", "a", "an", "is", "are", "was", "were", "i", "you", "we", "they", "it", "to", "of", "and", "or", "but", "in", "on", "at", "for", "with" };
            string[] words = input.ToLower().Split(new[] { ' ', ',', '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string word in words)
            {
                if (word.Length > 2 && !Array.Exists(stopWords, w => w == word))
                {
                    keywords.Add(word);
                }
            }

            return keywords;
        }

        private void SaveMemory()
        {
            // Simple JSON serialization for persistence
            string json = JsonUtility.ToJson(new MemoryData { entries = _memoryLog });
            PlayerPrefs.SetString("CristalCLI_Memory", json);
            PlayerPrefs.Save();
        }

        private void LoadMemory()
        {
            if (PlayerPrefs.HasKey("CristalCLI_Memory"))
            {
                string json = PlayerPrefs.GetString("CristalCLI_Memory");
                MemoryData data = JsonUtility.FromJson<MemoryData>(json);
                if (data != null && data.entries != null)
                {
                    _memoryLog = data.entries;
                }
            }
        }

        [Serializable]
        private class MemoryData
        {
            public List<MemoryEntry> entries;
        }
    }

    [Serializable]
    public class MemoryEntry
    {
        public string Input;
        public DateTime Timestamp;
        public float SessionTime;
        public float EmotionalWeight;
        public List<string> Keywords;
    }

    [Serializable]
    public class EmotionalProfile
    {
        public float TotalWeight;
        public float AverageWeight;
        public int EntryCount;
    }
}

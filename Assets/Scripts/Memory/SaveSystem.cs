using System;
using System.IO;
using UnityEngine;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.Memory
{
    /// <summary>
    /// Complete save system for CRISTAL.
    /// Handles full game state persistence, export, and import.
    /// </summary>
    public class SaveSystem : MonoBehaviour
    {
        public static SaveSystem Instance { get; private set; }

        [Header("Save Settings")]
        [SerializeField] private string _saveFileName = "cristal_save.json";
        [SerializeField] private bool _autoSaveOnQuit = true;

        // Events
        public event Action OnSaveStarted;
        public event Action OnSaveCompleted;
        public event Action OnLoadStarted;
        public event Action OnLoadCompleted;
        public event Action<string> OnExportCompleted;
        public event Action<string> OnError;

        private string SavePath => Path.Combine(Application.persistentDataPath, _saveFileName);

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void OnApplicationQuit()
        {
            if (_autoSaveOnQuit)
            {
                SaveGame();
            }
        }

        private void OnApplicationPause(bool pause)
        {
            if (pause && _autoSaveOnQuit)
            {
                SaveGame();
            }
        }

        /// <summary>
        /// Save the complete game state.
        /// </summary>
        public bool SaveGame()
        {
            try
            {
                OnSaveStarted?.Invoke();

                var saveData = CreateSaveData();
                string json = JsonUtility.ToJson(saveData, true);
                File.WriteAllText(SavePath, json);

                Debug.Log($"[SaveSystem] Game saved to {SavePath}");
                OnSaveCompleted?.Invoke();
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveSystem] Save failed: {e.Message}");
                OnError?.Invoke(e.Message);
                return false;
            }
        }

        /// <summary>
        /// Load the complete game state.
        /// </summary>
        public bool LoadGame()
        {
            if (!File.Exists(SavePath))
            {
                Debug.Log("[SaveSystem] No save file found");
                return false;
            }

            try
            {
                OnLoadStarted?.Invoke();

                string json = File.ReadAllText(SavePath);
                var saveData = JsonUtility.FromJson<CristalSaveData>(json);

                ApplySaveData(saveData);

                Debug.Log("[SaveSystem] Game loaded");
                OnLoadCompleted?.Invoke();
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveSystem] Load failed: {e.Message}");
                OnError?.Invoke(e.Message);
                return false;
            }
        }

        /// <summary>
        /// Export save data to a specified path.
        /// </summary>
        public bool ExportSave(string path)
        {
            try
            {
                var saveData = CreateSaveData();
                string json = JsonUtility.ToJson(saveData, true);
                File.WriteAllText(path, json);

                Debug.Log($"[SaveSystem] Exported to {path}");
                OnExportCompleted?.Invoke(path);
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveSystem] Export failed: {e.Message}");
                OnError?.Invoke(e.Message);
                return false;
            }
        }

        /// <summary>
        /// Import save data from a specified path.
        /// </summary>
        public bool ImportSave(string path)
        {
            if (!File.Exists(path))
            {
                Debug.LogError($"[SaveSystem] Import file not found: {path}");
                return false;
            }

            try
            {
                string json = File.ReadAllText(path);
                var saveData = JsonUtility.FromJson<CristalSaveData>(json);

                ApplySaveData(saveData);

                Debug.Log($"[SaveSystem] Imported from {path}");
                OnLoadCompleted?.Invoke();
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveSystem] Import failed: {e.Message}");
                OnError?.Invoke(e.Message);
                return false;
            }
        }

        /// <summary>
        /// Delete all save data.
        /// </summary>
        public void DeleteSave()
        {
            if (File.Exists(SavePath))
            {
                File.Delete(SavePath);
                Debug.Log("[SaveSystem] Save deleted");
            }

            // Also reset memory
            CristalMemory.Instance?.ResetMemory();
        }

        /// <summary>
        /// Check if a save file exists.
        /// </summary>
        public bool HasSave()
        {
            return File.Exists(SavePath);
        }

        /// <summary>
        /// Create save data from current game state.
        /// </summary>
        private CristalSaveData CreateSaveData()
        {
            var saveData = new CristalSaveData
            {
                version = "2.0",
                savedAt = DateTime.UtcNow.ToString("o"),
                playTime = Time.time
            };

            // Save memory data
            if (CristalMemory.Instance != null)
            {
                saveData.memoryData = CristalMemory.Instance.ExportToJson();
            }

            // Save arcana state (if different from memory)
            if (ArcanaSystem.Instance != null)
            {
                var currentInvocation = ArcanaSystem.Instance.CurrentInvocation;
                if (currentInvocation != null)
                {
                    saveData.activeArcanaId = currentInvocation.Definition.id;
                    saveData.arcanaRemainingTime = currentInvocation.RemainingTime;
                }
            }

            return saveData;
        }

        /// <summary>
        /// Apply save data to game state.
        /// </summary>
        private void ApplySaveData(CristalSaveData saveData)
        {
            // Restore memory data
            if (!string.IsNullOrEmpty(saveData.memoryData) && CristalMemory.Instance != null)
            {
                CristalMemory.Instance.ImportFromJson(saveData.memoryData);
            }

            // Restore arcana state
            if (saveData.activeArcanaId >= 0 && ArcanaSystem.Instance != null)
            {
                // Note: This would need additional logic to restore mid-invocation state
                Debug.Log($"[SaveSystem] Active arcana was: {saveData.activeArcanaId}");
            }
        }

        /// <summary>
        /// Get save file info.
        /// </summary>
        public SaveFileInfo GetSaveInfo()
        {
            if (!HasSave()) return null;

            try
            {
                string json = File.ReadAllText(SavePath);
                var saveData = JsonUtility.FromJson<CristalSaveData>(json);

                return new SaveFileInfo
                {
                    Path = SavePath,
                    SavedAt = saveData.savedAt,
                    PlayTime = saveData.playTime,
                    Version = saveData.version
                };
            }
            catch
            {
                return null;
            }
        }
    }

    /// <summary>
    /// Complete save data structure.
    /// </summary>
    [Serializable]
    public class CristalSaveData
    {
        public string version;
        public string savedAt;
        public float playTime;
        public string memoryData; // JSON string of CristalMemoryData
        public int activeArcanaId = -1;
        public float arcanaRemainingTime;
    }

    /// <summary>
    /// Info about a save file.
    /// </summary>
    public class SaveFileInfo
    {
        public string Path;
        public string SavedAt;
        public float PlayTime;
        public string Version;

        public string FormattedPlayTime
        {
            get
            {
                TimeSpan time = TimeSpan.FromSeconds(PlayTime);
                return $"{(int)time.TotalHours}:{time.Minutes:D2}:{time.Seconds:D2}";
            }
        }
    }
}

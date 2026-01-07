using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.Response;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Manages CRISTAL's visual manifestations - the Visions system.
    /// Handles loading, condition evaluation, display, and filesystem writing.
    /// </summary>
    public class VisionManager : MonoBehaviour
    {
        public static VisionManager Instance { get; private set; }

        [Header("Configuration")]
        [SerializeField] private TextAsset _visionRegistryJson;
        [SerializeField] private string _resourcesPath = "Visions/";

        [Header("Filesystem")]
        [SerializeField] private bool _enableFilesystemWrite = true;
        [SerializeField] private string _outputFolderName = "CRISTAL/visions";

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<VisionInstance> OnVisionUnlocked;
        public event Action<VisionInstance> OnVisionViewed;
        public event Action<string> OnVisionWrittenToDisk;
        public event Action<int> OnNewVisionsAvailable;

        private VisionRegistry _registry;
        private Dictionary<string, VisionInstance> _loadedVisions;
        private VisionProgress _progress;
        private string _outputPath;

        public int TotalVisionCount => _registry?.visions?.Length ?? 0;
        public int UnlockedVisionCount => _progress?.unlockedVisionIds?.Count ?? 0;
        public int SeenVisionCount => _progress?.seenVisions?.Count ?? 0;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                _loadedVisions = new Dictionary<string, VisionInstance>();
                InitializeOutputPath();
                LoadRegistry();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Load progress from memory
            LoadProgress();

            // Check for newly available visions
            CheckNewVisions();
        }

        private void InitializeOutputPath()
        {
            // Use Documents folder for cross-platform compatibility
            string documentsPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
            _outputPath = Path.Combine(documentsPath, _outputFolderName);

            if (_enableFilesystemWrite)
            {
                try
                {
                    if (!Directory.Exists(_outputPath))
                    {
                        Directory.CreateDirectory(_outputPath);
                        Log($"Created vision output folder: {_outputPath}");
                    }
                }
                catch (Exception e)
                {
                    Debug.LogError($"[VisionManager] Failed to create output folder: {e.Message}");
                    _enableFilesystemWrite = false;
                }
            }
        }

        private void LoadRegistry()
        {
            if (_visionRegistryJson != null)
            {
                try
                {
                    _registry = JsonUtility.FromJson<VisionRegistry>(_visionRegistryJson.text);
                    Log($"Loaded {_registry.visions.Length} vision definitions");

                    // Pre-load all vision textures
                    foreach (var vision in _registry.visions)
                    {
                        LoadVisionTexture(vision);
                    }
                }
                catch (Exception e)
                {
                    Debug.LogError($"[VisionManager] Failed to load registry: {e.Message}");
                }
            }
            else
            {
                Debug.LogWarning("[VisionManager] No vision registry assigned");
            }
        }

        private void LoadVisionTexture(VisionDefinition vision)
        {
            string resourcePath = _resourcesPath + vision.file;
            Texture2D texture = Resources.Load<Texture2D>(resourcePath);

            if (texture != null)
            {
                var instance = new VisionInstance(vision, texture);
                _loadedVisions[vision.id] = instance;
                Log($"Loaded vision texture: {vision.id}");
            }
            else
            {
                Debug.LogWarning($"[VisionManager] Failed to load texture: {resourcePath}");
            }
        }

        private void LoadProgress()
        {
            var memory = CristalMemory.Instance;
            if (memory != null && memory.Data != null)
            {
                // Check if vision progress exists in memory data
                // For now, create a new one if not present
                _progress = new VisionProgress();

                // Update vision instances with progress data
                foreach (var seen in _progress.seenVisions)
                {
                    if (_loadedVisions.TryGetValue(seen.visionId, out var instance))
                    {
                        instance.CurrentViewLevel = seen.viewLevel;
                        instance.IsUnlocked = true;
                    }
                }
            }
            else
            {
                _progress = new VisionProgress();
            }
        }

        /// <summary>
        /// Check for visions that are now available based on current game state.
        /// </summary>
        public void CheckNewVisions()
        {
            if (_registry == null) return;

            int newCount = 0;

            foreach (var vision in _registry.visions)
            {
                if (_loadedVisions.TryGetValue(vision.id, out var instance))
                {
                    bool wasUnlocked = instance.IsUnlocked;
                    bool isNowUnlocked = EvaluateTrigger(vision.trigger);

                    if (isNowUnlocked && !wasUnlocked)
                    {
                        instance.IsUnlocked = true;
                        instance.IsGlowing = true; // New visions glow
                        newCount++;
                        OnVisionUnlocked?.Invoke(instance);
                        Log($"Vision unlocked: {vision.id}");
                    }
                }
            }

            if (newCount > 0)
            {
                OnNewVisionsAvailable?.Invoke(newCount);
            }
        }

        /// <summary>
        /// Evaluate a trigger condition string.
        /// </summary>
        private bool EvaluateTrigger(string trigger)
        {
            if (string.IsNullOrEmpty(trigger)) return true;

            var memory = CristalMemory.Instance?.Data;
            if (memory == null) return false;

            // Parse and evaluate conditions
            // Format: "condition && condition" or single condition
            string[] conditions = trigger.Split(new[] { "&&" }, StringSplitOptions.RemoveEmptyEntries);

            foreach (string condition in conditions)
            {
                if (!EvaluateSingleCondition(condition.Trim(), memory))
                {
                    return false;
                }
            }

            return true;
        }

        private bool EvaluateSingleCondition(string condition, CristalMemoryData memory)
        {
            // memory_count >= N
            if (condition.StartsWith("memory_count"))
            {
                int required = ExtractNumber(condition);
                return memory.commands.Count >= required;
            }

            // corruption_level >= N
            if (condition.StartsWith("corruption_level"))
            {
                float required = ExtractFloat(condition);
                return memory.stateFlags.corruptionLevel >= required;
            }

            // state_visited_X
            if (condition.StartsWith("state_visited_"))
            {
                string state = condition.Replace("state_visited_", "");
                switch (state.ToLower())
                {
                    case "remembering": return memory.ritual.hasVisitedRemembering;
                    case "corrupted": return memory.ritual.hasVisitedCorrupted;
                    case "echo": return memory.ritual.hasVisitedEcho;
                }
            }

            // has_entered_unbound
            if (condition == "has_entered_unbound")
            {
                return memory.ritual.hasEnteredUnbound;
            }

            // ritual_complete
            if (condition == "ritual_complete")
            {
                return memory.ritual.IsRitualComplete();
            }

            // arcana_invoked_count >= N
            if (condition.StartsWith("arcana_invoked_count"))
            {
                int required = ExtractNumber(condition);
                return memory.arcana.invocationHistory.Count >= required;
            }

            // state=X (legacy format)
            if (condition.StartsWith("state="))
            {
                string state = condition.Replace("state=", "").ToUpper();
                // Would need current state reference
                return false;
            }

            return false;
        }

        private int ExtractNumber(string condition)
        {
            var parts = condition.Split(new[] { ">=", "<=", "==", ">", "<" }, StringSplitOptions.None);
            if (parts.Length >= 2 && int.TryParse(parts[1].Trim(), out int result))
            {
                return result;
            }
            return 0;
        }

        private float ExtractFloat(string condition)
        {
            var parts = condition.Split(new[] { ">=", "<=", "==", ">", "<" }, StringSplitOptions.None);
            if (parts.Length >= 2 && float.TryParse(parts[1].Trim(), out float result))
            {
                return result;
            }
            return 0f;
        }

        /// <summary>
        /// Get all unlocked visions.
        /// </summary>
        public List<VisionInstance> GetUnlockedVisions()
        {
            var result = new List<VisionInstance>();
            foreach (var instance in _loadedVisions.Values)
            {
                if (instance.IsUnlocked)
                {
                    result.Add(instance);
                }
            }
            return result;
        }

        /// <summary>
        /// Get a specific vision by ID.
        /// </summary>
        public VisionInstance GetVision(string visionId)
        {
            _loadedVisions.TryGetValue(visionId, out var instance);
            return instance;
        }

        /// <summary>
        /// Get the currently glowing (newest) vision.
        /// </summary>
        public VisionInstance GetGlowingVision()
        {
            foreach (var instance in _loadedVisions.Values)
            {
                if (instance.IsGlowing && instance.IsUnlocked)
                {
                    return instance;
                }
            }
            return null;
        }

        /// <summary>
        /// View a vision - increases view level and triggers effects.
        /// </summary>
        public VisionViewResult ViewVision(string visionId)
        {
            if (!_loadedVisions.TryGetValue(visionId, out var instance))
            {
                return new VisionViewResult { Success = false, Message = "Vision not found" };
            }

            if (!instance.IsUnlocked)
            {
                return new VisionViewResult { Success = false, Message = "Vision is locked" };
            }

            // Record the view
            _progress.RecordView(visionId);
            instance.CurrentViewLevel = _progress.GetViewLevel(visionId);
            instance.IsGlowing = false; // No longer new

            OnVisionViewed?.Invoke(instance);

            var result = new VisionViewResult
            {
                Success = true,
                Vision = instance,
                ViewLevel = instance.CurrentViewLevel,
                Message = GetViewMessage(instance)
            };

            // At view level 3, write to disk
            if (instance.CurrentViewLevel >= 3 && _enableFilesystemWrite)
            {
                WriteVisionToDisk(instance);
            }

            return result;
        }

        private string GetViewMessage(VisionInstance instance)
        {
            switch (instance.CurrentViewLevel)
            {
                case 1:
                    return "//VISION CAPTURED - VIEW AGAIN TO REVEAL MORE";
                case 2:
                    return "//DEEPER MEANING UNLOCKED - ONE MORE VIEW REMAINS";
                case 3:
                    return "//FULL VISION REVEALED - FILE WRITTEN TO YOUR SYSTEM";
                default:
                    return "//VISION ABSORBED";
            }
        }

        /// <summary>
        /// Write vision files to the player's filesystem.
        /// </summary>
        private void WriteVisionToDisk(VisionInstance instance)
        {
            if (!_enableFilesystemWrite) return;
            if (_progress.writtenToDisk.Contains(instance.Definition.id)) return;

            try
            {
                var fileData = VisionFileData.Create(instance.Definition, instance.CurrentViewLevel);

                // Write the text file
                string textPath = Path.Combine(_outputPath, fileData.TextFileName);
                File.WriteAllText(textPath, fileData.TextContent);

                // Copy the image if texture exists
                if (instance.Texture != null)
                {
                    string imagePath = Path.Combine(_outputPath, fileData.ImageFileName);
                    // For actual image copying, we'd need to read from Resources differently
                    // This is a simplified version - in production, copy from StreamingAssets
                    byte[] imageBytes = instance.Texture.EncodeToJPG();
                    File.WriteAllBytes(imagePath, imageBytes);
                }

                _progress.MarkWrittenToDisk(instance.Definition.id);
                OnVisionWrittenToDisk?.Invoke(instance.Definition.id);

                Log($"Vision written to disk: {instance.Definition.displayName}");
            }
            catch (Exception e)
            {
                Debug.LogError($"[VisionManager] Failed to write vision to disk: {e.Message}");
            }
        }

        /// <summary>
        /// Get vision summary for AI context.
        /// </summary>
        public string GetVisionContextForAI()
        {
            if (_progress == null || _progress.seenVisions.Count == 0)
            {
                return "No visions have been recovered yet.";
            }

            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"Visions recovered: {_progress.seenVisions.Count}/{TotalVisionCount}");

            foreach (var seen in _progress.seenVisions)
            {
                if (_loadedVisions.TryGetValue(seen.visionId, out var instance))
                {
                    sb.AppendLine($"- {instance.Definition.displayName} (viewed {seen.viewCount}x)");
                }
            }

            return sb.ToString();
        }

        /// <summary>
        /// Get list of seen vision names for AI prompts.
        /// </summary>
        public List<string> GetSeenVisionNames()
        {
            var names = new List<string>();
            foreach (var seen in _progress.seenVisions)
            {
                if (_loadedVisions.TryGetValue(seen.visionId, out var instance))
                {
                    names.Add(instance.Definition.displayName);
                }
            }
            return names;
        }

        /// <summary>
        /// Generate a response for the "see visions" command.
        /// </summary>
        public BuiltResponse GenerateSeeVisionsResponse()
        {
            CheckNewVisions(); // Update unlocked status

            var unlocked = GetUnlockedVisions();
            var glowing = GetGlowingVision();

            var lines = new List<string>
            {
                "",
                "VISION ARCHIVE ACCESSED",
                $"FRAGMENTS RECOVERED: {unlocked.Count}/{TotalVisionCount}",
                ""
            };

            if (glowing != null)
            {
                lines.Add($"ONE IS GLOWING: {glowing.Definition.displayName}");
                lines.Add($"\"{glowing.Definition.caption}\"");
            }
            else if (unlocked.Count > 0)
            {
                lines.Add("AVAILABLE VISIONS:");
                foreach (var v in unlocked)
                {
                    string marker = _progress.HasSeen(v.Definition.id) ? "[SEEN]" : "[NEW]";
                    lines.Add($"  {marker} {v.Definition.displayName}");
                }
            }
            else
            {
                lines.Add("NO VISIONS RECOVERED YET");
                lines.Add("CONTINUE YOUR JOURNEY");
            }

            lines.Add("");
            lines.Add("//USE: see [vision name] TO VIEW");
            lines.Add("");

            return new BuiltResponse
            {
                Lines = lines,
                Level = ResponseLevel.Narrative,
                ApplyGlitch = false,
                Effect = "vision_overlay"
            };
        }

        /// <summary>
        /// Generate a response for viewing a specific vision.
        /// </summary>
        public BuiltResponse GenerateViewVisionResponse(string visionName)
        {
            // Find vision by name (partial match)
            VisionInstance found = null;
            string searchName = visionName.ToLower().Trim();

            foreach (var instance in _loadedVisions.Values)
            {
                if (instance.Definition.displayName.ToLower().Contains(searchName) ||
                    instance.Definition.file.ToLower().Contains(searchName))
                {
                    found = instance;
                    break;
                }
            }

            if (found == null)
            {
                return new BuiltResponse
                {
                    Lines = new List<string>
                    {
                        "",
                        "VISION NOT FOUND",
                        $"NO RECORD OF: {visionName}",
                        "",
                        "//PERHAPS IT DOESN'T EXIST YET",
                        ""
                    },
                    Level = ResponseLevel.Literal,
                    ApplyGlitch = false
                };
            }

            var result = ViewVision(found.Definition.id);

            if (!result.Success)
            {
                return new BuiltResponse
                {
                    Lines = new List<string>
                    {
                        "",
                        "VISION LOCKED",
                        $"{found.Definition.displayName} CANNOT BE ACCESSED",
                        "",
                        "//THE CONDITIONS ARE NOT YET MET",
                        ""
                    },
                    Level = ResponseLevel.Literal,
                    ApplyGlitch = true
                };
            }

            var lines = new List<string>
            {
                "",
                $"=== {found.Definition.displayName.ToUpper()} ===",
                "",
                found.GetVisibleCaption(),
                ""
            };

            if (result.ViewLevel >= 2)
            {
                lines.Add(found.GetVisibleDescription());
                lines.Add("");
            }

            if (result.ViewLevel >= 3)
            {
                lines.Add("=== DEEP DATA ===");
                lines.Add(found.GetVisibleSecret());
                lines.Add("");
                lines.Add("//FILE WRITTEN TO YOUR SYSTEM");
            }

            lines.Add("");
            lines.Add(result.Message);
            lines.Add("");

            return new BuiltResponse
            {
                Lines = lines,
                Level = ResponseLevel.Ritual,
                ApplyGlitch = true,
                Effect = "vision_display"
            };
        }

        private void Log(string message)
        {
            if (_debugMode)
            {
                Debug.Log($"[VisionManager] {message}");
            }
        }
    }

    /// <summary>
    /// Result of viewing a vision.
    /// </summary>
    public class VisionViewResult
    {
        public bool Success;
        public VisionInstance Vision;
        public int ViewLevel;
        public string Message;
    }
}

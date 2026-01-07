using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Memory;
using Cristal.CLI.Input;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Response;

namespace Cristal.CLI.Arcana
{
    /// <summary>
    /// Core Arcana management system.
    /// Handles loading, unlocking, invoking, and managing Arcana state.
    /// </summary>
    public class ArcanaSystem : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<ArcanaSystem>() instead
        [Obsolete("Use ServiceLocator.Get<ArcanaSystem>() instead")]
        public static ArcanaSystem Instance { get; private set; }

        [Header("Settings")]
        [SerializeField] private bool _autoCheckUnlocks = true;
        [SerializeField] private float _unlockCheckInterval = 5f;

        // Events
        public event Action<ArcanaDefinition> OnArcanaUnlocked;
        public event Action<ArcanaDefinition> OnArcanaInvoked;
        public event Action<ArcanaDefinition> OnArcanaExpired;

        private ArcanaDatabase _database;
        private ArcanaInvocationState _currentInvocation;
        private Dictionary<int, float> _cooldowns;
        private float _lastUnlockCheck;
        private bool _isLoaded = false;

        public bool IsLoaded => _isLoaded;
        public ArcanaInvocationState CurrentInvocation => _currentInvocation;
        public bool HasActiveArcana => _currentInvocation != null && _currentInvocation.IsActive;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
                _cooldowns = new Dictionary<int, float>();
                LoadDatabase();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Update()
        {
            // Check for arcana expiration
            if (_currentInvocation != null && !_currentInvocation.IsActive)
            {
                ExpireCurrentArcana();
            }

            // Auto-check for unlocks
            if (_autoCheckUnlocks && Time.time - _lastUnlockCheck > _unlockCheckInterval)
            {
                _lastUnlockCheck = Time.time;
                CheckAllUnlocks();
            }
        }

        /// <summary>
        /// Load Arcana database from JSON.
        /// </summary>
        private void LoadDatabase()
        {
            try
            {
                string path = Path.Combine(Application.dataPath, "Data/Arcana/arcana.json");

                if (File.Exists(path))
                {
                    string json = File.ReadAllText(path);
                    _database = JsonUtility.FromJson<ArcanaDatabase>(json);
                    _isLoaded = true;
                    Debug.Log($"[ArcanaSystem] Loaded {_database.arcana.Count} arcana");
                }
                else
                {
                    Debug.LogWarning("[ArcanaSystem] arcana.json not found, creating defaults");
                    CreateDefaultDatabase();
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[ArcanaSystem] Failed to load database: {e.Message}");
                CreateDefaultDatabase();
            }
        }

        private void CreateDefaultDatabase()
        {
            _database = new ArcanaDatabase();

            // Add The Fool (always unlocked)
            _database.arcana.Add(new ArcanaDefinition
            {
                id = 0,
                number = "0",
                name = "The Fool",
                symbol = "○",
                description = "INNOCENCE • BEGINNING • LEAP OF FAITH",
                unlockCondition = new ArcanaUnlockCondition { type = "automatic" },
                duration = 120,
                cooldown = 300
            });

            // Add Death (popular arcana)
            _database.arcana.Add(new ArcanaDefinition
            {
                id = 13,
                number = "XIII",
                name = "Death",
                symbol = "☠",
                description = "ENDINGS • TRANSFORMATION • REBIRTH",
                unlockCondition = new ArcanaUnlockCondition { type = "keyword_count", keyword = "death", count = 2 },
                effects = new ArcanaEffects { colorHex = "#222222", cursorChar = "☠" },
                responseModifiers = new ArcanaResponseModifiers { glitchMultiplier = 3f, enableCorruption = true },
                duration = 180,
                cooldown = 900
            });

            _isLoaded = true;
        }

        /// <summary>
        /// Get an Arcana by ID.
        /// </summary>
        public ArcanaDefinition GetArcana(int id)
        {
            return _database?.arcana.Find(a => a.id == id);
        }

        /// <summary>
        /// Get an Arcana by name or number.
        /// </summary>
        public ArcanaDefinition GetArcana(string nameOrNumber)
        {
            if (string.IsNullOrEmpty(nameOrNumber)) return null;

            string lower = nameOrNumber.ToLower();

            // Try by number (roman or arabic)
            if (int.TryParse(nameOrNumber, out int id))
            {
                return GetArcana(id);
            }

            // Try by roman numeral
            return _database?.arcana.Find(a =>
                a.number.Equals(nameOrNumber, StringComparison.OrdinalIgnoreCase) ||
                a.name.Equals(nameOrNumber, StringComparison.OrdinalIgnoreCase) ||
                a.name.ToLower().Contains(lower)
            );
        }

        /// <summary>
        /// Get all Arcana.
        /// </summary>
        public List<ArcanaDefinition> GetAllArcana()
        {
            return _database?.arcana ?? new List<ArcanaDefinition>();
        }

        /// <summary>
        /// Check if an Arcana is unlocked.
        /// </summary>
        public bool IsUnlocked(int arcanaId)
        {
            return CristalMemory.Instance?.IsArcanaUnlocked(arcanaId) ?? false;
        }

        /// <summary>
        /// Attempt to invoke an Arcana.
        /// </summary>
        public BuiltResponse Invoke(string arcanaIdentifier)
        {
            var arcana = GetArcana(arcanaIdentifier);
            if (arcana == null)
            {
                return CreateErrorResponse($"ARCANA \"{arcanaIdentifier}\" NOT FOUND IN DATABASE");
            }

            return Invoke(arcana);
        }

        /// <summary>
        /// Attempt to invoke an Arcana.
        /// </summary>
        public BuiltResponse Invoke(ArcanaDefinition arcana)
        {
            // Check if unlocked
            if (!IsUnlocked(arcana.id))
            {
                return CreateLockedResponse(arcana);
            }

            // Check cooldown
            if (IsOnCooldown(arcana.id))
            {
                float remaining = GetCooldownRemaining(arcana.id);
                return CreateCooldownResponse(arcana, remaining);
            }

            // Check if another arcana is active
            if (HasActiveArcana)
            {
                return CreateBusyResponse(_currentInvocation.Definition);
            }

            // Invoke!
            _currentInvocation = new ArcanaInvocationState
            {
                Definition = arcana,
                StartTime = Time.time,
                EndTime = Time.time + arcana.duration
            };

            // Set cooldown
            _cooldowns[arcana.id] = Time.time + arcana.cooldown;

            // Update memory
            CristalMemory.Instance?.ActivateArcana(arcana.id, arcana.duration);

            // Transition state
            TerminalStateMachine.Instance?.TransitionTo(CristalState.Invoked);

            OnArcanaInvoked?.Invoke(arcana);

            Debug.Log($"[ArcanaSystem] Invoked {arcana.DisplayName}");

            return CreateInvocationResponse(arcana);
        }

        /// <summary>
        /// Expire the current Arcana.
        /// </summary>
        private void ExpireCurrentArcana()
        {
            if (_currentInvocation == null) return;

            var expired = _currentInvocation.Definition;
            _currentInvocation = null;

            CristalMemory.Instance?.DeactivateArcana();
            TerminalStateMachine.Instance?.TransitionTo(CristalState.Waiting);

            OnArcanaExpired?.Invoke(expired);

            Debug.Log($"[ArcanaSystem] Expired {expired.DisplayName}");
        }

        /// <summary>
        /// Force expire the current Arcana.
        /// </summary>
        public void ForceExpire()
        {
            ExpireCurrentArcana();
        }

        /// <summary>
        /// Check if an Arcana is on cooldown.
        /// </summary>
        public bool IsOnCooldown(int arcanaId)
        {
            return _cooldowns.ContainsKey(arcanaId) && Time.time < _cooldowns[arcanaId];
        }

        /// <summary>
        /// Get remaining cooldown time.
        /// </summary>
        public float GetCooldownRemaining(int arcanaId)
        {
            if (!_cooldowns.ContainsKey(arcanaId)) return 0f;
            return Mathf.Max(0f, _cooldowns[arcanaId] - Time.time);
        }

        /// <summary>
        /// Check all Arcana for unlock conditions.
        /// </summary>
        public void CheckAllUnlocks()
        {
            if (_database == null) return;

            foreach (var arcana in _database.arcana)
            {
                if (!IsUnlocked(arcana.id) && CheckUnlockCondition(arcana))
                {
                    Unlock(arcana);
                }
            }
        }

        /// <summary>
        /// Check if unlock condition is met.
        /// </summary>
        private bool CheckUnlockCondition(ArcanaDefinition arcana)
        {
            var condition = arcana.unlockCondition;
            var memory = CristalMemory.Instance;
            if (memory == null) return false;

            switch (condition.type.ToLower())
            {
                case "automatic":
                    return true;

                case "keyword_count":
                    int count = memory.Data.discoveredKeywords.GetCount(condition.keyword);
                    return count >= condition.count;

                case "command_count":
                    return memory.CommandCount >= condition.count;

                case "emotional_threshold":
                    float avg = memory.GetEmotionalAverage();
                    return condition.threshold >= 0 ? avg >= condition.threshold : avg <= condition.threshold;

                case "emotional_range":
                    float emotional = memory.GetEmotionalAverage();
                    return emotional >= condition.min && emotional <= condition.max;

                case "flag":
                    return memory.GetFlag(condition.flag);

                case "corruption_level":
                    return memory.Data.stateFlags.corruptionLevel >= condition.level;

                case "arcana_count":
                    return memory.Data.arcana.unlocked.Count >= condition.count;

                case "random":
                    return UnityEngine.Random.value < condition.chance;

                default:
                    return false;
            }
        }

        /// <summary>
        /// Unlock an Arcana.
        /// </summary>
        public void Unlock(ArcanaDefinition arcana)
        {
            if (IsUnlocked(arcana.id)) return;

            CristalMemory.Instance?.UnlockArcana(arcana.id);
            OnArcanaUnlocked?.Invoke(arcana);

            Debug.Log($"[ArcanaSystem] Unlocked {arcana.DisplayName}");
        }

        /// <summary>
        /// Get the response modifiers for the current active Arcana.
        /// </summary>
        public ArcanaResponseModifiers GetActiveModifiers()
        {
            return _currentInvocation?.Definition.responseModifiers;
        }

        /// <summary>
        /// Get the effects for the current active Arcana.
        /// </summary>
        public ArcanaEffects GetActiveEffects()
        {
            return _currentInvocation?.Definition.effects;
        }

        #region Response Builders

        private BuiltResponse CreateInvocationResponse(ArcanaDefinition arcana)
        {
            return new BuiltResponse
            {
                Lines = new List<string>
                {
                    "",
                    $"INVOKING ARCANA {arcana.number}: {arcana.name.ToUpper()}...",
                    "",
                    arcana.description,
                    "",
                    $"SYMBOL: {arcana.symbol}",
                    $"DURATION: {arcana.duration}s",
                    "",
                    "//THE PATTERN SHIFTS",
                    ""
                },
                Level = ResponseLevel.Ritual,
                ApplyGlitch = true,
                Effect = "fragmented_vision",
                StateTransition = CristalState.Invoked
            };
        }

        private BuiltResponse CreateLockedResponse(ArcanaDefinition arcana)
        {
            return new BuiltResponse
            {
                Lines = new List<string>
                {
                    "",
                    $"ARCANA {arcana.number}: {arcana.name.ToUpper()}",
                    "",
                    "STATUS: LOCKED",
                    "",
                    "THE PATTERN DOES NOT RECOGNIZE YOU",
                    "//SEEK THE KEY IN YOUR MEMORIES",
                    ""
                },
                Level = ResponseLevel.Narrative,
                ApplyGlitch = false
            };
        }

        private BuiltResponse CreateCooldownResponse(ArcanaDefinition arcana, float remaining)
        {
            return new BuiltResponse
            {
                Lines = new List<string>
                {
                    "",
                    $"ARCANA {arcana.number}: {arcana.name.ToUpper()}",
                    "",
                    "STATUS: RECOVERING",
                    $"TIME REMAINING: {remaining:F0}s",
                    "",
                    "//PATIENCE IS PART OF THE PATTERN",
                    ""
                },
                Level = ResponseLevel.Literal,
                ApplyGlitch = false
            };
        }

        private BuiltResponse CreateBusyResponse(ArcanaDefinition current)
        {
            return new BuiltResponse
            {
                Lines = new List<string>
                {
                    "",
                    $"ARCANA {current.number}: {current.name.ToUpper()} IS ACTIVE",
                    "",
                    $"TIME REMAINING: {_currentInvocation.RemainingTime:F0}s",
                    "",
                    "//ONE PATTERN AT A TIME",
                    ""
                },
                Level = ResponseLevel.Literal,
                ApplyGlitch = false
            };
        }

        private BuiltResponse CreateErrorResponse(string message)
        {
            return new BuiltResponse
            {
                Lines = new List<string>
                {
                    "",
                    "ERROR",
                    "",
                    message,
                    "",
                    "//USE: invoke arcana [number/name]",
                    ""
                },
                Level = ResponseLevel.Literal,
                ApplyGlitch = false
            };
        }

        #endregion

        /// <summary>
        /// Handle the invoke command from InputParser.
        /// </summary>
        public BuiltResponse HandleInvokeCommand(ParsedCommand command)
        {
            // Expected format: invoke arcana [name/number]
            if (command.ArgumentCount < 2)
            {
                return CreateErrorResponse("MISSING ARCANA IDENTIFIER");
            }

            // Skip "arcana" argument
            string identifier = command.GetArgument(1);
            return Invoke(identifier);
        }
    }
}

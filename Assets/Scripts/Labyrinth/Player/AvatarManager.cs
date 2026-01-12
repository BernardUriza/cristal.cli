using UnityEngine;
using System;
using System.Collections.Generic;
using System.Linq;
using Cristal.CLI.Core;

namespace Cristal.CLI.Labyrinth.Player
{
    /// <summary>
    /// Centralized avatar registry and management.
    /// Loads avatar definitions from Resources, provides lookup, and tracks current selection.
    /// </summary>
    public class AvatarManager : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private AvatarData[] _availableAvatars;
        [SerializeField] private string _resourcesPath = "Avatars";

        [Header("Current State")]
        [SerializeField] private string _currentAvatarId;

        private Dictionary<string, AvatarData> _avatarRegistry;
        private AvatarData _currentAvatar;

        public AvatarData CurrentAvatar => _currentAvatar;
        public IReadOnlyCollection<AvatarData> AllAvatars => _avatarRegistry?.Values;

        public event Action<AvatarData> OnAvatarChanged;

        private void Awake()
        {
            InitializeRegistry();
            ServiceLocator.Register(this);
        }

        private void OnDestroy()
        {
            ServiceLocator.Unregister<AvatarManager>();
        }

        private void InitializeRegistry()
        {
            _avatarRegistry = new Dictionary<string, AvatarData>();

            // Load from Resources if path specified
            if (!string.IsNullOrEmpty(_resourcesPath))
            {
                var resourceAvatars = Resources.LoadAll<AvatarData>(_resourcesPath);
                foreach (var avatar in resourceAvatars)
                {
                    RegisterAvatar(avatar);
                }
                CristalLog.Info("AvatarManager", $"Loaded {resourceAvatars.Length} avatars from Resources/{_resourcesPath}");
            }

            // Add manually assigned avatars
            if (_availableAvatars != null)
            {
                foreach (var avatar in _availableAvatars)
                {
                    if (avatar != null)
                    {
                        RegisterAvatar(avatar);
                    }
                }
            }

            if (_avatarRegistry.Count == 0)
            {
                CristalLog.Warning("AvatarManager", "No avatars registered. Add AvatarData assets to Resources/Avatars or assign manually.");
            }

            // Set initial avatar
            if (!string.IsNullOrEmpty(_currentAvatarId))
            {
                SelectAvatar(_currentAvatarId);
            }
            else if (_avatarRegistry.Count > 0)
            {
                // Select first available
                var firstAvatar = _avatarRegistry.Values.First();
                SelectAvatar(firstAvatar.AvatarId);
            }
        }

        private void RegisterAvatar(AvatarData avatar)
        {
            if (avatar == null || string.IsNullOrEmpty(avatar.AvatarId))
            {
                CristalLog.Warning("AvatarManager", "Attempted to register null or invalid avatar");
                return;
            }

            if (_avatarRegistry.ContainsKey(avatar.AvatarId))
            {
                CristalLog.Warning("AvatarManager", $"Avatar '{avatar.AvatarId}' already registered. Skipping duplicate.");
                return;
            }

            _avatarRegistry[avatar.AvatarId] = avatar;
        }

        public bool SelectAvatar(string avatarId)
        {
            if (string.IsNullOrEmpty(avatarId))
            {
                CristalLog.Warning("AvatarManager", "Cannot select avatar: null or empty ID");
                return false;
            }

            if (!_avatarRegistry.TryGetValue(avatarId, out var avatar))
            {
                CristalLog.Warning("AvatarManager", $"Avatar '{avatarId}' not found in registry");
                return false;
            }

            if (_currentAvatar == avatar)
            {
                CristalLog.Info("AvatarManager", $"Avatar '{avatarId}' already selected");
                return true;
            }

            _currentAvatar = avatar;
            _currentAvatarId = avatarId;

            CristalLog.Info("AvatarManager", $"Avatar changed: {avatar.DisplayName} ({avatarId})");
            OnAvatarChanged?.Invoke(avatar);

            return true;
        }

        public AvatarData GetAvatar(string avatarId)
        {
            return _avatarRegistry.TryGetValue(avatarId, out var avatar) ? avatar : null;
        }

        public List<AvatarData> GetAvatarsByArchetype(AvatarArchetype archetype)
        {
            return _avatarRegistry.Values.Where(a => a.Archetype == archetype).ToList();
        }

        public string FormatAvatarList()
        {
            if (_avatarRegistry == null || _avatarRegistry.Count == 0)
            {
                return "No avatars available.";
            }

            var grouped = _avatarRegistry.Values.GroupBy(a => a.Archetype).OrderBy(g => g.Key);
            var output = "\n=== AVAILABLE AVATARS ===\n\n";

            foreach (var group in grouped)
            {
                output += $"[{GetArchetypeName(group.Key)}]\n";
                foreach (var avatar in group.OrderBy(a => a.DisplayName))
                {
                    var marker = (avatar.AvatarId == _currentAvatarId) ? ">" : " ";
                    output += $"{marker} {avatar.AvatarId,-20} - {avatar.DisplayName}\n";
                    if (!string.IsNullOrEmpty(avatar.FlavorText))
                    {
                        output += $"  \"{avatar.FlavorText}\"\n";
                    }
                    output += "\n";
                }
            }

            output += "Command: avatar <id>\n";
            output += "Example: avatar vampire_lusth\n";

            return output;
        }

        public string GetCurrentAvatarInfo()
        {
            if (_currentAvatar == null)
            {
                return "No avatar selected.";
            }

            return $"\n=== CURRENT AVATAR ===\n\n" +
                   $"Name: {_currentAvatar.DisplayName}\n" +
                   $"ID: {_currentAvatar.AvatarId}\n" +
                   $"Archetype: {GetArchetypeName(_currentAvatar.Archetype)}\n" +
                   $"Description: {_currentAvatar.Description}\n\n" +
                   $"\"{_currentAvatar.FlavorText}\"\n";
        }

        private string GetArchetypeName(AvatarArchetype archetype)
        {
            return archetype switch
            {
                AvatarArchetype.TheCorrupted => "THE CORRUPTED",
                AvatarArchetype.TheForsaken => "THE FORSAKEN",
                AvatarArchetype.TheEldritch => "THE ELDRITCH",
                AvatarArchetype.TheHollow => "THE HOLLOW",
                AvatarArchetype.TheWanderer => "THE WANDERER",
                AvatarArchetype.TheVoid => "THE VOID",
                _ => "UNKNOWN"
            };
        }
    }
}

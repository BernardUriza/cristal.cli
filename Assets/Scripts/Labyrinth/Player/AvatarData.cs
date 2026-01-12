using UnityEngine;

namespace Cristal.CLI.Labyrinth.Player
{
    /// <summary>
    /// ScriptableObject that defines an avatar's identity and visual representation.
    /// One instance per character model.
    /// </summary>
    [CreateAssetMenu(fileName = "Avatar_", menuName = "CRISTAL/Labyrinth/Avatar Data", order = 1)]
    public class AvatarData : ScriptableObject
    {
        [Header("Identity")]
        [SerializeField] private string _avatarId;
        [SerializeField] private string _displayName;
        [TextArea(2, 4)]
        [SerializeField] private string _description;
        [TextArea(2, 4)]
        [SerializeField] private string _flavorText;

        [Header("Archetype")]
        [SerializeField] private AvatarArchetype _archetype;

        [Header("Visual")]
        [SerializeField] private GameObject _modelPrefab;
        [SerializeField] private Color _themeColor = Color.white;
        [SerializeField] private Material _overrideMaterial;

        [Header("Audio")]
        [SerializeField] private AudioClip _selectionSound;

        public string AvatarId => _avatarId;
        public string DisplayName => _displayName;
        public string Description => _description;
        public string FlavorText => _flavorText;
        public AvatarArchetype Archetype => _archetype;
        public GameObject ModelPrefab => _modelPrefab;
        public Color ThemeColor => _themeColor;
        public Material OverrideMaterial => _overrideMaterial;
        public AudioClip SelectionSound => _selectionSound;

        private void OnValidate()
        {
            // Auto-generate ID from display name if empty
            if (string.IsNullOrEmpty(_avatarId) && !string.IsNullOrEmpty(_displayName))
            {
                _avatarId = _displayName.ToLower().Replace(" ", "_");
            }
        }
    }

    public enum AvatarArchetype
    {
        TheCorrupted,     // Zombies, mutants, decay
        TheForsaken,      // Prisoners, exiles, forgotten
        TheEldritch,      // Demons, vampires, supernatural
        TheHollow,        // Skeletons, existential void
        TheWanderer,      // Neutral characters, seeking
        TheVoid           // Abstractions, unknowable
    }
}

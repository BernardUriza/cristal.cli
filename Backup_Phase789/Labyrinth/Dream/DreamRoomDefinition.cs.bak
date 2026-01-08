using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.StateMachine;
using Cristal.CLI.VFX;

namespace Cristal.CLI.Labyrinth.Dream
{
    /// <summary>
    /// ScriptableObject defining a dream room archetype.
    /// Contains visual, audio, and symbolic properties.
    /// </summary>
    [CreateAssetMenu(fileName = "NewDreamRoom", menuName = "CRISTAL/Dream/Room Definition")]
    public class DreamRoomDefinition : ScriptableObject
    {
        [Header("Identity")]
        [Tooltip("Internal identifier for this room type")]
        public string roomId;

        [Tooltip("Display name (can be overridden by AI)")]
        public string displayName;

        [Tooltip("Symbolic meaning of this room")]
        [TextArea(2, 4)]
        public string symbolism;

        [Header("Visual - Colors")]
        public Color primaryColor = new Color(0.4f, 0.2f, 0.6f);
        public Color secondaryColor = new Color(0.2f, 0.1f, 0.3f);
        public Color fogColor = new Color(0.1f, 0.05f, 0.15f);
        public Color lightColor = new Color(0.6f, 0.4f, 1f);

        [Header("Visual - Atmosphere")]
        [Range(0f, 0.1f)]
        public float fogDensity = 0.03f;

        [Range(0f, 2f)]
        public float lightIntensity = 0.5f;

        [Range(0f, 1f)]
        public float glitchIntensity = 0.1f;

        [Header("Visual - Effects")]
        public bool enableScanlines = true;
        [Range(0f, 1f)]
        public float scanlineAlpha = 0.3f;

        public bool enableParticles = true;
        public Color particleColor = new Color(0.5f, 0.3f, 0.8f, 0.5f);

        [Header("Geometry")]
        public RoomShape shape = RoomShape.Corridor;

        [Tooltip("Base size multiplier")]
        public Vector3 sizeMultiplier = Vector3.one;

        [Tooltip("Number of rooms in sequence for tunnel type")]
        public int segmentCount = 3;

        [Header("Symbols")]
        [Tooltip("Primary symbol associated with this room")]
        public SymbolType primarySymbol = SymbolType.Eye;

        [Tooltip("Secondary symbols that may appear")]
        public SymbolType[] secondarySymbols;

        [Tooltip("Chance for symbols to appear on walls")]
        [Range(0f, 1f)]
        public float symbolDensity = 0.3f;

        [Header("Narrative")]
        [Tooltip("Default inscriptions if AI is unavailable")]
        [TextArea(1, 3)]
        public string[] fallbackInscriptions;

        [Tooltip("Default narrative fragments if AI is unavailable")]
        [TextArea(2, 4)]
        public string[] fallbackNarratives;

        [Header("Audio")]
        public AudioClip ambientLoop;
        public AudioClip entryStinger;
        public AudioClip exitStinger;

        [Range(0f, 1f)]
        public float ambientVolume = 0.5f;

        [Header("Behavior")]
        [Tooltip("Minimum time player must spend in room")]
        public float minDuration = 10f;

        [Tooltip("Maximum time before forced exit")]
        public float maxDuration = 120f;

        [Tooltip("Can player exit freely?")]
        public bool allowFreeExit = true;

        [Tooltip("Triggers state change on entry")]
        public bool triggerStateOnEntry = false;
        public CristalState entryState = CristalState.Remembering;

        [Header("Connections")]
        [Tooltip("Arcana that can trigger this room")]
        public int[] triggerArcana;

        [Tooltip("Emotional states that can trigger this room")]
        public string[] triggerEmotions;

        [Tooltip("Required corruption level to access")]
        [Range(0f, 1f)]
        public float requiredCorruption = 0f;

        #region Public Methods

        /// <summary>
        /// Get a random inscription from fallbacks.
        /// </summary>
        public string GetRandomInscription()
        {
            if (fallbackInscriptions == null || fallbackInscriptions.Length == 0)
            {
                return $"the {displayName} remembers...";
            }
            return fallbackInscriptions[Random.Range(0, fallbackInscriptions.Length)];
        }

        /// <summary>
        /// Get a random narrative fragment from fallbacks.
        /// </summary>
        public string GetRandomNarrative()
        {
            if (fallbackNarratives == null || fallbackNarratives.Length == 0)
            {
                return $"You have entered {displayName}.\nThe walls breathe with meaning.";
            }
            return fallbackNarratives[Random.Range(0, fallbackNarratives.Length)];
        }

        /// <summary>
        /// Get symbol definition for this room's primary symbol.
        /// </summary>
        public SymbolDefinition GetPrimarySymbolDefinition()
        {
            return new SymbolDefinition
            {
                type = primarySymbol,
                color = primaryColor,
                glowColor = lightColor,
                scale = 1f
            };
        }

        /// <summary>
        /// Get a random secondary symbol definition.
        /// </summary>
        public SymbolDefinition GetRandomSecondarySymbol()
        {
            if (secondarySymbols == null || secondarySymbols.Length == 0)
            {
                return GetPrimarySymbolDefinition();
            }

            return new SymbolDefinition
            {
                type = secondarySymbols[Random.Range(0, secondarySymbols.Length)],
                color = secondaryColor,
                glowColor = lightColor * 0.7f,
                scale = 0.8f
            };
        }

        /// <summary>
        /// Check if this room can be triggered by the given arcana.
        /// </summary>
        public bool CanTriggerByArcana(int arcanaId)
        {
            if (triggerArcana == null || triggerArcana.Length == 0) return false;
            return System.Array.IndexOf(triggerArcana, arcanaId) >= 0;
        }

        /// <summary>
        /// Check if this room can be triggered by the given emotion.
        /// </summary>
        public bool CanTriggerByEmotion(string emotion)
        {
            if (triggerEmotions == null || triggerEmotions.Length == 0) return false;
            if (string.IsNullOrEmpty(emotion)) return false;

            string lower = emotion.ToLower();
            foreach (var e in triggerEmotions)
            {
                if (e.ToLower() == lower) return true;
            }
            return false;
        }

        /// <summary>
        /// Check if corruption level meets requirement.
        /// </summary>
        public bool MeetsCorruptionRequirement(float currentCorruption)
        {
            return currentCorruption >= requiredCorruption;
        }

        #endregion
    }

    #region Enums

    public enum RoomShape
    {
        Corridor,       // Long narrow passage
        Chamber,        // Larger open room
        Spiral,         // Spiraling path
        Crossroads,     // Multiple exits
        DeadEnd,        // Single exit
        Void,           // Infinite seeming space
        Mirror          // Reflected/symmetric
    }

    #endregion
}

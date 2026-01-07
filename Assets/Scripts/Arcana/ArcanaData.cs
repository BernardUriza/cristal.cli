using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Arcana
{
    /// <summary>
    /// Root container for arcana.json
    /// </summary>
    [Serializable]
    public class ArcanaDatabase
    {
        public string version = "1.0";
        public List<ArcanaDefinition> arcana = new List<ArcanaDefinition>();
    }

    /// <summary>
    /// Definition of a single Arcana.
    /// </summary>
    [Serializable]
    public class ArcanaDefinition
    {
        public int id;
        public string number;
        public string name;
        public string symbol;
        public string description;
        public ArcanaUnlockCondition unlockCondition = new ArcanaUnlockCondition();
        public ArcanaEffects effects = new ArcanaEffects();
        public ArcanaResponseModifiers responseModifiers = new ArcanaResponseModifiers();
        public float duration = 120f;
        public float cooldown = 300f;

        public string DisplayName => $"Arcana {number}: {name}";
    }

    /// <summary>
    /// Conditions for unlocking an Arcana.
    /// </summary>
    [Serializable]
    public class ArcanaUnlockCondition
    {
        public string type = "automatic";
        public string keyword;
        public int count;
        public string flag;
        public float threshold;
        public float level;
        public float min;
        public float max;
        public float chance;
    }

    /// <summary>
    /// Visual and audio effects for an Arcana.
    /// </summary>
    [Serializable]
    public class ArcanaEffects
    {
        public string visualFilter;
        public string cursorChar = "█";
        public string colorHex = "#FFFFFF";

        public Color GetColor()
        {
            if (ColorUtility.TryParseHtmlString(colorHex, out Color color))
            {
                return color;
            }
            return Color.white;
        }
    }

    /// <summary>
    /// Response modifiers when an Arcana is active.
    /// </summary>
    [Serializable]
    public class ArcanaResponseModifiers
    {
        public string prefix = "";
        public float glitchMultiplier = 1f;
        public float emotionalBias = 0f;
        public float typeSpeedMultiplier = 1f;
        public bool forceUppercase = false;
        public bool enableCorruption = false;
        public bool screenShake = false;
        public bool invertResponses = false;
        public bool randomizeResponses = false;
        public string responseLevel = "";
    }

    /// <summary>
    /// Runtime state for an active Arcana invocation.
    /// </summary>
    public class ArcanaInvocationState
    {
        public ArcanaDefinition Definition { get; set; }
        public float StartTime { get; set; }
        public float EndTime { get; set; }
        public bool IsActive => Time.time < EndTime;
        public float RemainingTime => Mathf.Max(0f, EndTime - Time.time);
        public float Progress => 1f - (RemainingTime / Definition.duration);
    }

    /// <summary>
    /// Types of unlock conditions.
    /// </summary>
    public enum UnlockConditionType
    {
        Automatic,          // Unlocked from start
        KeywordCount,       // Said keyword N times
        CommandCount,       // Total commands issued
        EmotionalThreshold, // Reached emotional weight
        EmotionalRange,     // Within emotional range
        Flag,               // State flag is set
        CorruptionLevel,    // Corruption at level
        ArcanaCount,        // Unlocked N arcana
        Random              // Random chance per input
    }
}

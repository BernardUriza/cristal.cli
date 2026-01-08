using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Response
{
    /// <summary>
    /// Data structures for the response system.
    /// Loaded from JSON files in Assets/Data/Responses/
    /// </summary>

    #region Pattern Matching Data

    /// <summary>
    /// Root container for patterns.json
    /// </summary>
    [Serializable]
    public class PatternData
    {
        public string version = "1.0";
        public List<ResponsePattern> patterns = new List<ResponsePattern>();
        public FallbackPattern fallback = new FallbackPattern();
    }

    /// <summary>
    /// A pattern that matches input and triggers responses.
    /// </summary>
    [Serializable]
    public class ResponsePattern
    {
        public string id;
        public int priority = 0;
        public List<string> keywords = new List<string>();
        public string regex;
        public string command;
        public List<string> arguments = new List<string>();
        public string responseSet;
        public string level = "literal";
        public string stateTransition;
        public string handler;
        public PatternContext context = new PatternContext();

        public ResponseLevel GetLevel()
        {
            return level.ToLower() switch
            {
                "narrative" => ResponseLevel.Narrative,
                "ritual" => ResponseLevel.Ritual,
                _ => ResponseLevel.Literal
            };
        }

        public CristalState? GetStateTransition()
        {
            if (string.IsNullOrEmpty(stateTransition)) return null;

            return stateTransition.ToUpper() switch
            {
                "BOOTSTRAP" => CristalState.Bootstrap,
                "WAITING" => CristalState.Waiting,
                "PROCESSING" => CristalState.Processing,
                "RESPONDING" => CristalState.Responding,
                "SEEKING" => CristalState.Seeking,
                "ECHO" => CristalState.Echo,
                "CORRUPTED" => CristalState.Corrupted,
                "REMEMBERING" => CristalState.Remembering,
                "INVOKED" => CristalState.Invoked,
                "ERROR" => CristalState.Error,
                "LOCKED" => CristalState.Locked,
                _ => null
            };
        }
    }

    /// <summary>
    /// Context requirements for pattern matching.
    /// </summary>
    [Serializable]
    public class PatternContext
    {
        public List<string> requiredFlags = new List<string>();
        public List<string> excludedFlags = new List<string>();
        public float minEmotionalWeight = -999f;
        public float maxEmotionalWeight = 999f;
        public int minCommandCount = 0;
        public int maxCommandCount = int.MaxValue;
    }

    /// <summary>
    /// Fallback pattern when no other matches.
    /// </summary>
    [Serializable]
    public class FallbackPattern
    {
        public string responseSet = "default_responses";
        public string level = "literal";
    }

    #endregion

    #region Response Data

    /// <summary>
    /// Root container for responses.json
    /// </summary>
    [Serializable]
    public class ResponseData
    {
        public string version = "1.0";
        public ResponseSetCollection responseSets = new ResponseSetCollection();
    }

    /// <summary>
    /// Collection of response sets.
    /// </summary>
    [Serializable]
    public class ResponseSetCollection
    {
        // Using Dictionary-like structure through list for JSON compatibility
        public List<ResponseSetEntry> entries = new List<ResponseSetEntry>();

        public ResponseSet GetSet(string name)
        {
            var entry = entries.Find(e => e.name == name);
            return entry?.set;
        }
    }

    [Serializable]
    public class ResponseSetEntry
    {
        public string name;
        public ResponseSet set = new ResponseSet();
    }

    /// <summary>
    /// A set of responses organized by level.
    /// </summary>
    [Serializable]
    public class ResponseSet
    {
        public List<ResponseTemplate> literal = new List<ResponseTemplate>();
        public List<ResponseTemplate> narrative = new List<ResponseTemplate>();
        public List<ResponseTemplate> ritual = new List<ResponseTemplate>();

        public List<ResponseTemplate> GetTemplates(ResponseLevel level)
        {
            return level switch
            {
                ResponseLevel.Narrative => narrative,
                ResponseLevel.Ritual => ritual,
                _ => literal
            };
        }
    }

    /// <summary>
    /// A single response template with lines and effects.
    /// </summary>
    [Serializable]
    public class ResponseTemplate
    {
        public List<string> lines = new List<string>();
        public bool glitch = false;
        public string effect;
        public float delay = 0f;
        public ResponseConditions conditions = new ResponseConditions();
    }

    /// <summary>
    /// Conditions for selecting a response template.
    /// </summary>
    [Serializable]
    public class ResponseConditions
    {
        public int memoryCountMin = -1;
        public int memoryCountMax = -1;
        public bool arcanaUnlocked = false;
        public List<string> requiredFlags = new List<string>();
    }

    #endregion

    #region Built Response

    /// <summary>
    /// A fully built response ready for display.
    /// </summary>
    public class BuiltResponse
    {
        public List<string> Lines { get; set; } = new List<string>();
        public ResponseLevel Level { get; set; } = ResponseLevel.Literal;
        public bool ApplyGlitch { get; set; } = false;
        public string Effect { get; set; }
        public float Delay { get; set; } = 0f;
        public CristalState? StateTransition { get; set; }
        public string PatternId { get; set; }

        /// <summary>
        /// Convert to legacy TerminalResponse for compatibility.
        /// </summary>
        public TerminalResponse ToTerminalResponse()
        {
            return new TerminalResponse
            {
                Lines = Lines,
                ApplyGlitch = ApplyGlitch,
                CustomDelay = Delay,
                ResponseType = Level switch
                {
                    ResponseLevel.Ritual => ResponseType.Identity,
                    ResponseLevel.Narrative => ResponseType.Memory,
                    _ => ResponseType.Default
                }
            };
        }
    }

    #endregion
}

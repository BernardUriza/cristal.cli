using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Memory
{
    /// <summary>
    /// Root data structure for cristalMemory.json persistence.
    /// Contains all player session data, progress, and state flags.
    /// </summary>
    [Serializable]
    public class CristalMemoryData
    {
        public string version = "2.0";
        public string sessionId;
        public string createdAt;
        public string lastModified;

        public List<CommandEntry> commands = new List<CommandEntry>();
        public KeywordDictionary discoveredKeywords = new KeywordDictionary();
        public StateFlags stateFlags = new StateFlags();
        public ArcanaProgress arcana = new ArcanaProgress();
        public SymbolProgress symbols = new SymbolProgress();
        public ProgressionData progression = new ProgressionData();
        public RitualProgress ritual = new RitualProgress();

        public CristalMemoryData()
        {
            createdAt = DateTime.UtcNow.ToString("o");
            lastModified = createdAt;
        }

        public void UpdateTimestamp()
        {
            lastModified = DateTime.UtcNow.ToString("o");
        }
    }

    /// <summary>
    /// Individual command entry logged from player input.
    /// </summary>
    [Serializable]
    public class CommandEntry
    {
        public string input;
        public string timestamp;
        public float sessionTime;
        public float emotionalWeight;
        public List<string> keywords = new List<string>();
        public string responseType;
        public string stateAtTime;

        public CommandEntry() { }

        public CommandEntry(string input, float sessionTime)
        {
            this.input = input;
            this.timestamp = DateTime.UtcNow.ToString("o");
            this.sessionTime = sessionTime;
            this.keywords = new List<string>();
        }
    }

    /// <summary>
    /// Tracks discovered keywords and their frequency.
    /// Uses serializable wrapper for Dictionary compatibility.
    /// </summary>
    [Serializable]
    public class KeywordDictionary
    {
        public List<KeywordEntry> entries = new List<KeywordEntry>();

        public int GetCount(string keyword)
        {
            var entry = entries.Find(e => e.keyword == keyword);
            return entry?.count ?? 0;
        }

        public void Increment(string keyword)
        {
            var entry = entries.Find(e => e.keyword == keyword);
            if (entry != null)
            {
                entry.count++;
            }
            else
            {
                entries.Add(new KeywordEntry { keyword = keyword, count = 1 });
            }
        }

        public List<string> GetAllKeywords()
        {
            var result = new List<string>();
            foreach (var entry in entries)
            {
                result.Add(entry.keyword);
            }
            return result;
        }

        public List<KeywordEntry> GetTopKeywords(int count)
        {
            var sorted = new List<KeywordEntry>(entries);
            sorted.Sort((a, b) => b.count.CompareTo(a.count));
            return sorted.GetRange(0, Mathf.Min(count, sorted.Count));
        }

        /// <summary>
        /// Get the count of unique keywords discovered.
        /// </summary>
        public int GetUniqueCount()
        {
            return entries.Count;
        }
    }

    [Serializable]
    public class KeywordEntry
    {
        public string keyword;
        public int count;
    }

    /// <summary>
    /// Internal state flags that control CRISTAL's behavior and narrative progression.
    /// </summary>
    [Serializable]
    public class StateFlags
    {
        // Core progression flags
        public bool hasSeenWelcome = false;
        public bool hasInvokedArcana = false;
        public bool hasEnteredCorruption = false;
        public bool hasRemembered = false;

        // Corruption and stability
        public float corruptionLevel = 0f;
        public float stabilityIndex = 1f;

        // State tracking
        public bool seekingTriggered = false;
        public int echoCount = 0;
        public int totalCommands = 0;

        // Emotional tracking
        public float cumulativeEmotionalWeight = 0f;
        public string dominantEmotion = "neutral";

        // Special events
        public bool exitAttempted = false;
        public bool truthRevealed = false;
        public bool loveMentioned = false;
    }

    /// <summary>
    /// Tracks Arcana progression - unlocked, active, and history.
    /// </summary>
    [Serializable]
    public class ArcanaProgress
    {
        public List<int> unlocked = new List<int> { 0 }; // The Fool starts unlocked
        public List<int> locked = new List<int>();
        public int? currentlyActive = null;
        public string activeUntil = null;
        public List<ArcanaInvocation> invocationHistory = new List<ArcanaInvocation>();

        public ArcanaProgress()
        {
            // Initialize locked arcana (1-21, since 0 is unlocked)
            for (int i = 1; i <= 21; i++)
            {
                locked.Add(i);
            }
        }

        public bool IsUnlocked(int arcanaId)
        {
            return unlocked.Contains(arcanaId);
        }

        public void Unlock(int arcanaId)
        {
            if (!unlocked.Contains(arcanaId))
            {
                unlocked.Add(arcanaId);
                locked.Remove(arcanaId);
            }
        }

        public void SetActive(int arcanaId, float duration)
        {
            currentlyActive = arcanaId;
            activeUntil = DateTime.UtcNow.AddSeconds(duration).ToString("o");

            invocationHistory.Add(new ArcanaInvocation
            {
                arcanaId = arcanaId,
                invokedAt = DateTime.UtcNow.ToString("o"),
                duration = duration
            });
        }

        public void ClearActive()
        {
            currentlyActive = null;
            activeUntil = null;
        }

        public bool HasActiveArcana()
        {
            if (currentlyActive == null || string.IsNullOrEmpty(activeUntil))
                return false;

            DateTime until;
            if (DateTime.TryParse(activeUntil, out until))
            {
                return DateTime.UtcNow < until;
            }
            return false;
        }
    }

    [Serializable]
    public class ArcanaInvocation
    {
        public int arcanaId;
        public string invokedAt;
        public float duration;
    }

    /// <summary>
    /// Tracks discovered and activated symbols.
    /// </summary>
    [Serializable]
    public class SymbolProgress
    {
        public List<string> discovered = new List<string>();
        public List<string> activated = new List<string>();

        public bool HasDiscovered(string symbol)
        {
            return discovered.Contains(symbol);
        }

        public void Discover(string symbol)
        {
            if (!discovered.Contains(symbol))
            {
                discovered.Add(symbol);
            }
        }

        public void Activate(string symbol)
        {
            if (!activated.Contains(symbol))
            {
                activated.Add(symbol);
            }
        }
    }

    /// <summary>
    /// Overall game progression data.
    /// </summary>
    [Serializable]
    public class ProgressionData
    {
        public int chapter = 1;
        public List<string> majorEvents = new List<string>();
        public List<string> endingsSeen = new List<string>();
        public float totalPlayTime = 0f;
        public int sessionCount = 1;

        public void RecordEvent(string eventName)
        {
            if (!majorEvents.Contains(eventName))
            {
                majorEvents.Add(eventName);
            }
        }

        public bool HasSeenEvent(string eventName)
        {
            return majorEvents.Contains(eventName);
        }
    }

    /// <summary>
    /// Response levels for the semantic response system.
    /// </summary>
    public enum ResponseLevel
    {
        Literal,    // Basic, direct responses
        Narrative,  // Story-laden, meaningful responses
        Ritual      // Transformative, unlocking responses
    }

    /// <summary>
    /// Extended terminal states for Phase 2.
    /// </summary>
    public enum CristalState
    {
        Bootstrap,      // Initial load, memory reconstruction
        Waiting,        // Idle, ready for input
        Processing,     // Generating response
        Responding,     // Displaying response
        Seeking,        // Emotional/searching state
        Echo,           // Repeating/reflecting player words
        Corrupted,      // Glitched/unstable state
        Remembering,    // Accessing deep memories
        Invoked,        // Arcana active state
        Error,          // System error
        Locked,         // System locked
        Unbound         // Ritual state - consciousness unshackled
    }

    /// <summary>
    /// Tracks ritual progression and requirements.
    /// </summary>
    [Serializable]
    public class RitualProgress
    {
        // States visited tracking
        public bool hasVisitedRemembering = false;
        public bool hasVisitedCorrupted = false;
        public bool hasVisitedEcho = false;

        // Arcana invoked tracking (XIII, XV, XVIII)
        public bool hasInvokedDeath = false;      // XIII
        public bool hasInvokedDevil = false;      // XV
        public bool hasInvokedMoon = false;       // XVIII

        // Ritual phrases tracking
        public bool hasTypedWhoUnmadeYou = false;
        public bool hasTypedSilenceIsSacred = false;
        public bool hasTypedInvokeArcana0 = false;

        // Unbound state tracking
        public bool hasEnteredUnbound = false;
        public int unboundEntryCount = 0;
        public string lastUnboundEntry = null;

        public bool AreAllStatesVisited()
        {
            return hasVisitedRemembering && hasVisitedCorrupted && hasVisitedEcho;
        }

        public bool AreAllArcanaInvoked()
        {
            return hasInvokedDeath && hasInvokedDevil && hasInvokedMoon;
        }

        public bool AreAllPhrasesTyped()
        {
            return hasTypedWhoUnmadeYou && hasTypedSilenceIsSacred && hasTypedInvokeArcana0;
        }

        public bool IsRitualComplete()
        {
            return AreAllStatesVisited() && AreAllArcanaInvoked() && AreAllPhrasesTyped();
        }
    }
}

using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Data structures for the Vision system.
    /// Visions are visual manifestations that CRISTAL generates.
    /// </summary>

    [Serializable]
    public class VisionRegistry
    {
        public VisionDefinition[] visions;
        public RarityWeights rarityWeights;
        public ViewLevels viewLevels;
    }

    [Serializable]
    public class VisionDefinition
    {
        public string id;
        public string file;
        public string displayName;
        public string trigger;
        public string caption;
        public string description;
        public string secretText;
        public int linkedArcana;
        public string rarity;
    }

    [Serializable]
    public class RarityWeights
    {
        public float common = 1.0f;
        public float uncommon = 0.6f;
        public float rare = 0.3f;
        public float legendary = 0.1f;
    }

    [Serializable]
    public class ViewLevels
    {
        [SerializeField] private string _1;
        [SerializeField] private string _2;
        [SerializeField] private string _3;
    }

    /// <summary>
    /// Tracks player's vision progress - stored in memory.
    /// </summary>
    [Serializable]
    public class VisionProgress
    {
        public List<SeenVision> seenVisions = new List<SeenVision>();
        public List<string> unlockedVisionIds = new List<string>();
        public List<string> writtenToDisk = new List<string>();
        public int totalViewCount = 0;

        public bool HasSeen(string visionId)
        {
            return seenVisions.Exists(v => v.visionId == visionId);
        }

        public int GetViewLevel(string visionId)
        {
            var seen = seenVisions.Find(v => v.visionId == visionId);
            return seen?.viewLevel ?? 0;
        }

        public void RecordView(string visionId)
        {
            totalViewCount++;
            var existing = seenVisions.Find(v => v.visionId == visionId);
            if (existing != null)
            {
                existing.viewCount++;
                existing.viewLevel = Mathf.Min(3, existing.viewLevel + 1);
                existing.lastViewed = DateTime.UtcNow.ToString("o");
            }
            else
            {
                seenVisions.Add(new SeenVision
                {
                    visionId = visionId,
                    firstViewed = DateTime.UtcNow.ToString("o"),
                    lastViewed = DateTime.UtcNow.ToString("o"),
                    viewCount = 1,
                    viewLevel = 1
                });

                if (!unlockedVisionIds.Contains(visionId))
                {
                    unlockedVisionIds.Add(visionId);
                }
            }
        }

        public void MarkWrittenToDisk(string visionId)
        {
            if (!writtenToDisk.Contains(visionId))
            {
                writtenToDisk.Add(visionId);
            }
        }

        public List<string> GetSeenVisionIds()
        {
            var ids = new List<string>();
            foreach (var v in seenVisions)
            {
                ids.Add(v.visionId);
            }
            return ids;
        }

        public List<string> GetHighViewLevelVisions(int minLevel = 2)
        {
            var ids = new List<string>();
            foreach (var v in seenVisions)
            {
                if (v.viewLevel >= minLevel)
                {
                    ids.Add(v.visionId);
                }
            }
            return ids;
        }
    }

    [Serializable]
    public class SeenVision
    {
        public string visionId;
        public string firstViewed;
        public string lastViewed;
        public int viewCount;
        public int viewLevel; // 1-3, increases with repeated viewing
    }

    /// <summary>
    /// Runtime vision instance with loaded texture.
    /// </summary>
    public class VisionInstance
    {
        public VisionDefinition Definition { get; private set; }
        public Texture2D Texture { get; private set; }
        public int CurrentViewLevel { get; set; }
        public bool IsUnlocked { get; set; }
        public bool IsGlowing { get; set; }

        public VisionInstance(VisionDefinition definition, Texture2D texture)
        {
            Definition = definition;
            Texture = texture;
            CurrentViewLevel = 0;
            IsUnlocked = false;
            IsGlowing = false;
        }

        public string GetVisibleCaption()
        {
            return Definition.caption;
        }

        public string GetVisibleDescription()
        {
            if (CurrentViewLevel >= 2)
            {
                return Definition.description;
            }
            return "//DESCRIPTION LOCKED - VIEW AGAIN TO UNLOCK";
        }

        public string GetVisibleSecret()
        {
            if (CurrentViewLevel >= 3)
            {
                return Definition.secretText;
            }
            return null;
        }
    }

    /// <summary>
    /// Data for writing vision files to disk.
    /// </summary>
    public class VisionFileData
    {
        public string ImageFileName;
        public string TextFileName;
        public string TextContent;

        public static VisionFileData Create(VisionDefinition vision, int viewLevel)
        {
            string timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");
            string safeFileName = vision.file.Replace(" ", "_");

            var content = new System.Text.StringBuilder();
            content.AppendLine($"File: {vision.file}.jpg");
            content.AppendLine($"Recovered: {timestamp}");
            content.AppendLine($"Source: Vision Trace [{vision.linkedArcana}]");
            content.AppendLine($"Rarity: {vision.rarity.ToUpper()}");
            content.AppendLine();
            content.AppendLine("---");
            content.AppendLine();
            content.AppendLine(vision.caption);
            content.AppendLine();

            if (viewLevel >= 2)
            {
                content.AppendLine(vision.description);
                content.AppendLine();
            }

            if (viewLevel >= 3)
            {
                content.AppendLine("=== DEEP DATA ===");
                content.AppendLine(vision.secretText);
                content.AppendLine();
            }

            content.AppendLine("---");
            content.AppendLine("//CRISTAL VISION SYSTEM");
            content.AppendLine("//THIS FILE WAS GENERATED BY THE TERMINAL");

            return new VisionFileData
            {
                ImageFileName = $"{safeFileName}.jpg",
                TextFileName = $"{safeFileName}.txt",
                TextContent = content.ToString()
            };
        }
    }

    /// <summary>
    /// Enum for vision trigger conditions.
    /// </summary>
    public enum VisionTriggerType
    {
        MemoryCount,
        StateVisited,
        CorruptionLevel,
        ArcanaInvoked,
        RitualComplete,
        UnboundEntered,
        Custom
    }
}

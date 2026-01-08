using System;
using UnityEngine;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Stub for VisionDefinition - the static data for a vision
    /// </summary>
    [Serializable]
    public class VisionDefinition
    {
        public string id;
        public string title;
        public string displayName; // Alias for title
        public string description;
        public Texture2D texture;
        public int maxViewLevel = 3;
    }

    /// <summary>
    /// Stub for VisionInstance - TODO: Restore from Phase 7 when ready
    /// Represents an instance of a Vision that can be displayed to the player
    /// </summary>
    [Serializable]
    public class VisionInstance
    {
        public string id;
        public string title;
        public string description;
        public Sprite image;
        public bool isUnlocked;
        public bool hasBeenSeen;
        
        // Properties expected by HologramProjector
        public VisionDefinition Definition { get; set; }
        public int CurrentViewLevel { get; set; }
        public Texture2D Texture => Definition?.texture;
        public bool IsUnlocked => isUnlocked;  // Property accessor
        
        // Stub constructor
        public VisionInstance(string id = "", string title = "")
        {
            this.id = id;
            this.title = title;
            this.Definition = new VisionDefinition { id = id, title = title, displayName = title };
        }
    }
}

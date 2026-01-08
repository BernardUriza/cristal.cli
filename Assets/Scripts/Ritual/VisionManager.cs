using System;
using UnityEngine;
using Cristal.CLI.Core;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Stub for VisionManager - TODO: Restore from Phase 7 when ready
    /// Manages CRISTAL's visual manifestations - the Visions system.
    /// </summary>
    public class VisionManager : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<VisionManager>() instead
        [Obsolete("Use ServiceLocator.Get<VisionManager>() instead")]
        public static VisionManager Instance { get; private set; }

        // Events
        public event Action<VisionInstance> OnVisionUnlocked;
        public event Action<VisionInstance> OnVisionViewed;
        public event Action<int> OnNewVisionsAvailable;

        public int TotalVisionCount => 0;
        public int UnlockedVisionCount => 0;
        public int SeenVisionCount => 0;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        /// <summary>
        /// Get a vision by ID - stub
        /// </summary>
        public VisionInstance GetVision(string visionId)
        {
            return new VisionInstance(visionId, "Stub Vision");
        }

        /// <summary>
        /// Check if a vision is unlocked - stub
        /// </summary>
        public bool IsVisionUnlocked(string visionId)
        {
            return false;
        }

        /// <summary>
        /// Unlock a vision - stub
        /// </summary>
        public void UnlockVision(string visionId)
        {
            var vision = GetVision(visionId);
            vision.isUnlocked = true;
            OnVisionUnlocked?.Invoke(vision);
            Debug.Log($"[VisionManager] Vision {visionId} unlocked (stub)");
        }

        /// <summary>
        /// Subscribe to vision unlocks - stub
        /// </summary>
        public void SubscribeToVisionUnlocks(Action<VisionInstance> callback)
        {
            OnVisionUnlocked += callback;
        }

        /// <summary>
        /// Unsubscribe from vision unlocks - stub
        /// </summary>
        public void UnsubscribeFromVisionUnlocks(Action<VisionInstance> callback)
        {
            OnVisionUnlocked -= callback;
        }
    }
}

using UnityEngine;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Configuration asset for interaction prompts.
    /// Centralizes visual settings, prevents magic numbers in code.
    /// </summary>
    [CreateAssetMenu(fileName = "InteractPromptConfig", menuName = "CRISTAL/Labyrinth/Interact Prompt Config")]
    public class InteractPromptConfig : ScriptableObject
    {
        [Header("Positioning")]
        [Tooltip("Vertical offset above the interactable object")]
        public float verticalOffset = 1.8f;
        
        [Tooltip("Billboard prompt to face camera")]
        public bool billboardToCamera = true;

        [Header("Fade Animation")]
        [Tooltip("Duration of fade in/out transitions")]
        public float fadeDuration = 0.2f;
        
        [Tooltip("Easing curve for fade")]
        public AnimationCurve fadeCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        [Header("Bob Animation")]
        [Tooltip("Enable floating bob effect")]
        public bool enableBob = true;
        
        [Tooltip("Speed of bob cycle (cycles per second)")]
        public float bobFrequency = 1.5f;
        
        [Tooltip("Amplitude of bob in world units")]
        public float bobAmplitude = 0.08f;

        [Header("Pulse Animation")]
        [Tooltip("Enable scale pulse effect")]
        public bool enablePulse = true;
        
        [Tooltip("Speed of pulse cycle")]
        public float pulseFrequency = 2f;
        
        [Tooltip("Scale multiplier for pulse (0.1 = 10% scale change)")]
        [Range(0f, 0.3f)]
        public float pulseIntensity = 0.08f;

        [Header("Colors")]
        public Color primaryColor = new Color(0.4f, 1f, 0.4f);
        public Color glowColor = new Color(0.6f, 1f, 0.6f);
        public Color textColor = new Color(0.9f, 0.9f, 0.9f);
        public Color backgroundColor = new Color(0.05f, 0.05f, 0.05f, 0.85f);

        [Header("Glow Animation")]
        [Tooltip("Enable color glow oscillation")]
        public bool enableGlow = true;
        
        [Tooltip("Speed of glow cycle")]
        public float glowFrequency = 2f;

        [Header("Scale")]
        [Tooltip("Base scale of the prompt in world space")]
        public float worldScale = 0.012f;
        
        [Tooltip("Minimum scale when far from camera")]
        public float minScale = 0.006f;
        
        [Tooltip("Maximum scale when close to camera")]
        public float maxScale = 0.018f;
        
        [Tooltip("Enable distance-based scaling")]
        public bool scaleWithDistance = true;
        
        [Tooltip("Reference distance for scale calculation")]
        public float referenceDistance = 3f;

        /// <summary>
        /// Calculate scale based on distance to camera.
        /// </summary>
        public float CalculateScale(float distance)
        {
            if (!scaleWithDistance) return worldScale;
            
            float scaleFactor = distance / referenceDistance;
            float calculatedScale = worldScale * scaleFactor;
            return Mathf.Clamp(calculatedScale, minScale, maxScale);
        }

        /// <summary>
        /// Get bob offset for current time.
        /// </summary>
        public float GetBobOffset(float time)
        {
            if (!enableBob) return 0f;
            return Mathf.Sin(time * bobFrequency * Mathf.PI * 2f) * bobAmplitude;
        }

        /// <summary>
        /// Get pulse scale multiplier for current time.
        /// </summary>
        public float GetPulseMultiplier(float time)
        {
            if (!enablePulse) return 1f;
            return 1f + Mathf.Sin(time * pulseFrequency * Mathf.PI * 2f) * pulseIntensity;
        }

        /// <summary>
        /// Get glow color lerp factor for current time.
        /// </summary>
        public float GetGlowFactor(float time)
        {
            if (!enableGlow) return 0f;
            return (Mathf.Sin(time * glowFrequency * Mathf.PI * 2f) + 1f) * 0.5f;
        }

        /// <summary>
        /// Evaluate fade curve.
        /// </summary>
        public float EvaluateFade(float t)
        {
            return fadeCurve.Evaluate(t);
        }
    }
}

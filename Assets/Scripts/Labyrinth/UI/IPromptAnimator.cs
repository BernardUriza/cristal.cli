using UnityEngine;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Interface for prompt animation strategies.
    /// Allows swapping animation behaviors without modifying the core prompt component.
    /// </summary>
    public interface IPromptAnimator
    {
        /// <summary>
        /// Calculate position offset based on current time.
        /// </summary>
        Vector3 CalculatePositionOffset(float time, InteractPromptConfig config);

        /// <summary>
        /// Calculate scale multiplier based on current time and distance.
        /// </summary>
        float CalculateScaleMultiplier(float time, float distance, InteractPromptConfig config);

        /// <summary>
        /// Calculate glow intensity based on current time.
        /// </summary>
        float CalculateGlowIntensity(float time, InteractPromptConfig config);
    }

    /// <summary>
    /// Default animator using config-driven bob, pulse, and glow effects.
    /// </summary>
    public class DefaultPromptAnimator : IPromptAnimator
    {
        public Vector3 CalculatePositionOffset(float time, InteractPromptConfig config)
        {
            if (config == null || !config.enableBob) return Vector3.zero;

            float bobOffset = Mathf.Sin(time * config.bobFrequency * Mathf.PI * 2f) * config.bobAmplitude;
            return new Vector3(0f, bobOffset, 0f);
        }

        public float CalculateScaleMultiplier(float time, float distance, InteractPromptConfig config)
        {
            if (config == null) return 1f;

            // Distance-based scaling
            float distanceScale = config.CalculateScale(distance);

            // Pulse effect
            float pulseMultiplier = 1f;
            if (config.enablePulse)
            {
                pulseMultiplier = config.GetPulseMultiplier(time);
            }

            return distanceScale * pulseMultiplier;
        }

        public float CalculateGlowIntensity(float time, InteractPromptConfig config)
        {
            if (config == null || !config.enableGlowAnimation) return 1f;
            return config.GetGlowFactor(time);
        }
    }

    /// <summary>
    /// Urgent/alert animator with faster, more intense effects.
    /// </summary>
    public class UrgentPromptAnimator : IPromptAnimator
    {
        private const float URGENCY_MULTIPLIER = 2f;

        public Vector3 CalculatePositionOffset(float time, InteractPromptConfig config)
        {
            if (config == null) return Vector3.zero;

            // Faster, more pronounced bob
            float bobOffset = Mathf.Sin(time * config.bobFrequency * URGENCY_MULTIPLIER * Mathf.PI * 2f) 
                            * config.bobAmplitude * 1.5f;
            return new Vector3(0f, bobOffset, 0f);
        }

        public float CalculateScaleMultiplier(float time, float distance, InteractPromptConfig config)
        {
            if (config == null) return 1f;

            float distanceScale = config.CalculateScale(distance);
            
            // More intense pulse
            float pulse = 1f + Mathf.Sin(time * 8f) * 0.15f;
            
            return distanceScale * pulse;
        }

        public float CalculateGlowIntensity(float time, InteractPromptConfig config)
        {
            // Always high glow for urgent
            return 0.7f + Mathf.Sin(time * 6f) * 0.3f;
        }
    }
}

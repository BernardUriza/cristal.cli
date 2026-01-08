using UnityEngine;

namespace Cristal.CLI.Labyrinth.UI
{
    public enum PromptUrgency { Normal, Warning, Critical }

    /// <summary>
    /// Interface for prompt animation strategies.
    /// Allows swapping animation behaviors without modifying the core prompt component.
    /// </summary>
    public interface IPromptAnimator
    {
        /// <summary>
        /// Calculate position offset based on current time.
        /// </summary>
        Vector3 CalculatePositionOffset(float time, InteractPromptConfig config, PromptUrgency urgency);

        /// <summary>
        /// Calculate scale multiplier based on current time and distance.
        /// </summary>
        float CalculateScaleMultiplier(float time, float distance, InteractPromptConfig config, PromptUrgency urgency);

        /// <summary>
        /// Calculate glow intensity based on current time.
        /// </summary>
        float CalculateGlowIntensity(float time, InteractPromptConfig config, PromptUrgency urgency);
    }

    /// <summary>
    /// Default animator using config-driven bob, pulse, and glow effects.
    /// </summary>
    public class DefaultPromptAnimator : IPromptAnimator
    {
        public Vector3 CalculatePositionOffset(float time, InteractPromptConfig config, PromptUrgency urgency)
        {
            if (config == null || !config.enableBob) return Vector3.zero;

            float urgencyMultiplier = urgency == PromptUrgency.Critical ? 1.6f : (urgency == PromptUrgency.Warning ? 1.2f : 1f);
            float bobOffset = Mathf.Sin(time * config.bobFrequency * urgencyMultiplier * Mathf.PI * 2f) * config.bobAmplitude;
            return new Vector3(0f, bobOffset, 0f);
        }

        public float CalculateScaleMultiplier(float time, float distance, InteractPromptConfig config, PromptUrgency urgency)
        {
            if (config == null) return 1f;

            // Distance-based scaling
            float distanceScale = config.CalculateScale(distance);

            // Pulse effect
            float pulseMultiplier = 1f;
            if (config.enablePulse)
            {
                float basePulse = config.GetPulseMultiplier(time);
                if (urgency == PromptUrgency.Warning)
                {
                    // Slightly stronger pulse
                    pulseMultiplier = 1f + (basePulse - 1f) * 1.5f;
                }
                else if (urgency == PromptUrgency.Critical)
                {
                    // Much stronger pulse
                    pulseMultiplier = 1f + (basePulse - 1f) * 2.25f;
                }
                else
                {
                    pulseMultiplier = basePulse;
                }
            }

            return distanceScale * pulseMultiplier;
        }

        public float CalculateGlowIntensity(float time, InteractPromptConfig config, PromptUrgency urgency)
        {
            if (config == null || !config.enableGlow) return 1f;

            float glow = config.GetGlowFactor(time);
            if (urgency == PromptUrgency.Warning) return Mathf.Clamp01(glow * 1.1f);
            if (urgency == PromptUrgency.Critical) return Mathf.Clamp01(glow * 1.25f);
            return glow;
        }
    }

    /// <summary>
    /// Urgent/alert animator with faster, more intense effects.
    /// </summary>
    public class UrgentPromptAnimator : IPromptAnimator
    {
        private const float URGENCY_MULTIPLIER = 2f;

        public Vector3 CalculatePositionOffset(float time, InteractPromptConfig config, PromptUrgency urgency)
        {
            if (config == null) return Vector3.zero;

            // Faster, more pronounced bob
            float bobOffset = Mathf.Sin(time * config.bobFrequency * URGENCY_MULTIPLIER * Mathf.PI * 2f) 
                            * config.bobAmplitude * 1.5f;
            return new Vector3(0f, bobOffset, 0f);
        }

        public float CalculateScaleMultiplier(float time, float distance, InteractPromptConfig config, PromptUrgency urgency)
        {
            if (config == null) return 1f;

            float distanceScale = config.CalculateScale(distance);
            
            // More intense pulse
            float pulse = 1f + Mathf.Sin(time * 8f) * 0.15f;
            
            return distanceScale * pulse;
        }

        public float CalculateGlowIntensity(float time, InteractPromptConfig config, PromptUrgency urgency)
        {
            // Always high glow for urgent
            return 0.7f + Mathf.Sin(time * 6f) * 0.3f;
        }
    }
}

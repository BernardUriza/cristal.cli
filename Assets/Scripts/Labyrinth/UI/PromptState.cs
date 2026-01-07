using System;
using UnityEngine;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Defines the visual state of an interaction prompt.
    /// Immutable struct for clean state management.
    /// </summary>
    public readonly struct PromptState : IEquatable<PromptState>
    {
        public readonly Transform Target;
        public readonly string KeyText;
        public readonly string ActionText;
        public readonly bool IsVisible;
        public readonly float ShowTime;

        public static PromptState Hidden => new PromptState(null, "", "", false, 0f);

        public PromptState(Transform target, string keyText, string actionText, bool isVisible, float showTime)
        {
            Target = target;
            KeyText = keyText ?? "E";
            ActionText = actionText ?? "";
            IsVisible = isVisible;
            ShowTime = showTime;
        }

        public PromptState WithVisibility(bool visible, float time)
        {
            return new PromptState(Target, KeyText, ActionText, visible, visible ? time : ShowTime);
        }

        public bool HasTarget => Target != null;

        public bool Equals(PromptState other)
        {
            return Target == other.Target && 
                   KeyText == other.KeyText && 
                   ActionText == other.ActionText &&
                   IsVisible == other.IsVisible;
        }

        public override bool Equals(object obj) => obj is PromptState other && Equals(other);
        public override int GetHashCode() => HashCode.Combine(Target, KeyText, ActionText, IsVisible);
        public static bool operator ==(PromptState left, PromptState right) => left.Equals(right);
        public static bool operator !=(PromptState left, PromptState right) => !left.Equals(right);
    }

    /// <summary>
    /// Transition state for smooth fade animations.
    /// </summary>
    public struct PromptTransition
    {
        public float Progress;
        public float StartTime;
        public float Duration;
        public bool FadingIn;

        public bool IsComplete => Progress >= 1f;
        public float Alpha => FadingIn ? Progress : 1f - Progress;

        public static PromptTransition FadeIn(float duration) => new PromptTransition
        {
            Progress = 0f,
            StartTime = Time.time,
            Duration = duration,
            FadingIn = true
        };

        public static PromptTransition FadeOut(float duration) => new PromptTransition
        {
            Progress = 0f,
            StartTime = Time.time,
            Duration = duration,
            FadingIn = false
        };

        public static PromptTransition Complete => new PromptTransition
        {
            Progress = 1f,
            FadingIn = true
        };

        public void Update(float deltaTime)
        {
            if (Duration <= 0f)
            {
                Progress = 1f;
                return;
            }
            Progress = Mathf.Clamp01(Progress + deltaTime / Duration);
        }
    }
}

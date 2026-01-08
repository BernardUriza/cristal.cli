using System;
using UnityEngine;
using Cristal.CLI.Core;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Stub for RitualSystem - TODO: Restore from Phase 7 when ready
    /// Manages the ritual progression and state in the labyrinth.
    /// </summary>
    public class RitualSystem : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<RitualSystem>() instead
        [Obsolete("Use ServiceLocator.Get<RitualSystem>() instead")]
        public static RitualSystem Instance { get; private set; }

        // Events
        public event Action<RitualPhase> OnPhaseChanged;
        public event Action<RitualState> OnRitualStateChanged;
        public event Action OnRitualCompleted;
        public event Action OnRitualComplete;  // Alias for compatibility
        public event Action OnUnboundTriggered;
        public event Action OnUnboundEnded;

        // State
        private RitualState _currentState = RitualState.NotStarted;
        private RitualPhase _currentPhase = RitualPhase.Preparation;

        public RitualState CurrentState => _currentState;
        public RitualPhase CurrentPhase => _currentPhase;
        public bool IsRitualActive => _currentState == RitualState.InProgress;
        public float Progress => 0f; // TODO: implement actual progress

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
        /// Subscribe to ritual phase changes - stub
        /// </summary>
        public void SubscribeToPhaseChanges(Action<RitualPhase> callback)
        {
            OnPhaseChanged += callback;
        }

        /// <summary>
        /// Unsubscribe from ritual phase changes - stub
        /// </summary>
        public void UnsubscribeFromPhaseChanges(Action<RitualPhase> callback)
        {
            OnPhaseChanged -= callback;
        }

        /// <summary>
        /// Start the ritual - stub
        /// </summary>
        public void StartRitual()
        {
            _currentState = RitualState.InProgress;
            OnRitualStateChanged?.Invoke(_currentState);
            Debug.Log("[RitualSystem] Ritual started (stub)");
        }
    }
}

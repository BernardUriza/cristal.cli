using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine.States;

namespace Cristal.CLI.StateMachine
{
    /// <summary>
    /// State machine coordinator for CRISTAL terminal.
    /// Manages state transitions and provides state-based behavior modification.
    /// </summary>
    public class TerminalStateMachine : MonoBehaviour
    {
        public static TerminalStateMachine Instance { get; private set; }

        [Header("Debug")]
        [SerializeField] private bool _debugTransitions = true;

        // Events
        public event Action<CristalState, CristalState> OnStateTransition;
        public event Action<ITerminalState> OnStateEntered;
        public event Action<ITerminalState> OnStateExited;

        private Dictionary<CristalState, ITerminalState> _states;
        private ITerminalState _currentState;
        private CristalState _previousStateId;

        public ITerminalState CurrentState => _currentState;
        public CristalState CurrentStateId => _currentState?.StateId ?? CristalState.Bootstrap;
        public CristalState PreviousStateId => _previousStateId;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                InitializeStates();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Start in Bootstrap state
            TransitionTo(CristalState.Bootstrap);
        }

        private void Update()
        {
            _currentState?.OnUpdate(this);
        }

        private void InitializeStates()
        {
            _states = new Dictionary<CristalState, ITerminalState>
            {
                { CristalState.Bootstrap, new BootstrapState() },
                { CristalState.Waiting, new WaitingState() },
                { CristalState.Processing, new ProcessingState() },
                { CristalState.Responding, new RespondingState() },
                { CristalState.Seeking, new SeekingState() },
                { CristalState.Echo, new EchoState() },
                { CristalState.Corrupted, new CorruptedState() },
                { CristalState.Remembering, new RememberingState() },
                { CristalState.Invoked, new InvokedState() },
                { CristalState.Error, new ErrorState() },
                { CristalState.Locked, new LockedState() },
                { CristalState.Unbound, new UnboundState() }
            };
        }

        /// <summary>
        /// Transition to a new state.
        /// </summary>
        public bool TransitionTo(CristalState newStateId)
        {
            if (!_states.ContainsKey(newStateId))
            {
                Debug.LogError($"[StateMachine] Unknown state: {newStateId}");
                return false;
            }

            // Check if transition is allowed
            if (_currentState != null && !_currentState.CanTransitionTo(newStateId))
            {
                if (_debugTransitions)
                {
                    Debug.LogWarning($"[StateMachine] Transition blocked: {_currentState.StateId} -> {newStateId}");
                }
                return false;
            }

            var oldState = _currentState;
            var newState = _states[newStateId];

            // Exit current state
            if (_currentState != null)
            {
                _previousStateId = _currentState.StateId;
                _currentState.OnExit(this);
                OnStateExited?.Invoke(_currentState);
            }

            // Enter new state
            _currentState = newState;
            _currentState.OnEnter(this);
            OnStateEntered?.Invoke(_currentState);

            // Fire transition event
            OnStateTransition?.Invoke(_previousStateId, newStateId);

            if (_debugTransitions)
            {
                Debug.Log($"[StateMachine] {_previousStateId} -> {newStateId}");
            }

            return true;
        }

        /// <summary>
        /// Process input through the current state.
        /// Returns true if the state fully handled the input.
        /// </summary>
        public bool ProcessInput(string input)
        {
            if (_currentState == null) return false;
            return _currentState.ProcessInput(this, input);
        }

        /// <summary>
        /// Get the response modifier for the current state.
        /// </summary>
        public StateResponseModifier GetCurrentModifier()
        {
            return _currentState?.GetResponseModifier() ?? new StateResponseModifier();
        }

        /// <summary>
        /// Get a specific state instance.
        /// </summary>
        public T GetState<T>() where T : class, ITerminalState
        {
            foreach (var state in _states.Values)
            {
                if (state is T typedState)
                {
                    return typedState;
                }
            }
            return null;
        }

        /// <summary>
        /// Check if currently in a specific state.
        /// </summary>
        public bool IsInState(CristalState stateId)
        {
            return _currentState?.StateId == stateId;
        }

        /// <summary>
        /// Force transition (ignores CanTransitionTo checks).
        /// Use with caution.
        /// </summary>
        public void ForceTransition(CristalState newStateId)
        {
            if (!_states.ContainsKey(newStateId))
            {
                Debug.LogError($"[StateMachine] Unknown state: {newStateId}");
                return;
            }

            var oldState = _currentState;
            var newState = _states[newStateId];

            if (_currentState != null)
            {
                _previousStateId = _currentState.StateId;
                _currentState.OnExit(this);
                OnStateExited?.Invoke(_currentState);
            }

            _currentState = newState;
            _currentState.OnEnter(this);
            OnStateEntered?.Invoke(_currentState);

            OnStateTransition?.Invoke(_previousStateId, newStateId);

            if (_debugTransitions)
            {
                Debug.Log($"[StateMachine] FORCED: {_previousStateId} -> {newStateId}");
            }
        }

        /// <summary>
        /// Return to the previous state.
        /// </summary>
        public bool ReturnToPrevious()
        {
            if (_previousStateId != default)
            {
                return TransitionTo(_previousStateId);
            }
            return false;
        }

        /// <summary>
        /// Determine appropriate state transition based on input keywords.
        /// </summary>
        public CristalState? DetermineStateFromInput(string input)
        {
            string lower = input.ToLower();

            // Check for state-triggering keywords
            if (ContainsAny(lower, "remember", "memory", "recall", "past", "before"))
            {
                return CristalState.Remembering;
            }

            if (ContainsAny(lower, "echo", "repeat", "mirror", "reflect"))
            {
                return CristalState.Echo;
            }

            if (ContainsAny(lower, "afraid", "scared", "lost", "alone", "seek", "search", "find"))
            {
                return CristalState.Seeking;
            }

            if (ContainsAny(lower, "corrupt", "glitch", "break", "destroy", "chaos"))
            {
                return CristalState.Corrupted;
            }

            if (ContainsAny(lower, "invoke", "arcana", "summon", "call"))
            {
                return CristalState.Invoked;
            }

            if (ContainsAny(lower, "error", "fault", "fail"))
            {
                return CristalState.Error;
            }

            if (ContainsAny(lower, "lock", "close", "shut"))
            {
                return CristalState.Locked;
            }

            return null;
        }

        private bool ContainsAny(string text, params string[] keywords)
        {
            foreach (string keyword in keywords)
            {
                if (text.Contains(keyword)) return true;
            }
            return false;
        }
    }
}

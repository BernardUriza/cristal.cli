using System;
using System.Collections.Generic;
using Cristal.CLI.Memory;

namespace Cristal.CLI.StateMachine.Core
{
    /// <summary>
    /// Testable state machine implementation without Unity dependencies.
    /// Use this for unit tests, then wrap with TerminalStateMachine for Unity.
    /// </summary>
    public class TestableStateMachine : IStateContext
    {
        private readonly Dictionary<CristalState, IStateLogic> _states;
        private IStateLogic _currentState;
        private CristalState _previousStateId;
        private float _timeInCurrentState;

        public CristalState CurrentStateId => _currentState?.StateId ?? CristalState.Bootstrap;
        public CristalState PreviousStateId => _previousStateId;
        public float TimeInCurrentState => _timeInCurrentState;

        public event Action<CristalState, CristalState> OnStateTransition;

        public TestableStateMachine()
        {
            _states = new Dictionary<CristalState, IStateLogic>();
        }

        /// <summary>
        /// Register a state logic handler.
        /// </summary>
        public void RegisterState(IStateLogic stateLogic)
        {
            _states[stateLogic.StateId] = stateLogic;
        }

        /// <summary>
        /// Transition to a new state.
        /// </summary>
        public bool TransitionTo(CristalState newState)
        {
            if (!_states.ContainsKey(newState))
            {
                return false;
            }

            if (_currentState != null && !_currentState.CanTransitionTo(newState))
            {
                return false;
            }

            var oldStateId = CurrentStateId;
            
            _currentState?.OnExit(this);
            _previousStateId = oldStateId;
            _currentState = _states[newState];
            _timeInCurrentState = 0f;
            _currentState.OnEnter(this);

            OnStateTransition?.Invoke(oldStateId, newState);
            return true;
        }

        /// <summary>
        /// Process input through current state.
        /// </summary>
        public bool ProcessInput(string input)
        {
            return _currentState?.ProcessInput(input, this) ?? false;
        }

        /// <summary>
        /// Update current state.
        /// </summary>
        public void Update(float deltaTime)
        {
            _timeInCurrentState += deltaTime;
            _currentState?.OnUpdate(this, deltaTime);
        }

        /// <summary>
        /// Get current state's response modifier.
        /// </summary>
        public StateResponseModifier GetCurrentModifier()
        {
            return _currentState?.GetModifier() ?? new StateResponseModifier();
        }
    }
}

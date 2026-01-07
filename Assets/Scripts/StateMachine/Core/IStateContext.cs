using System;
using Cristal.CLI.Memory;

namespace Cristal.CLI.StateMachine.Core
{
    /// <summary>
    /// Context interface for state machine - enables testing without Unity.
    /// </summary>
    public interface IStateContext
    {
        /// <summary>
        /// Current state identifier.
        /// </summary>
        CristalState CurrentStateId { get; }

        /// <summary>
        /// Previous state identifier.
        /// </summary>
        CristalState PreviousStateId { get; }

        /// <summary>
        /// Transition to a new state.
        /// </summary>
        bool TransitionTo(CristalState newState);

        /// <summary>
        /// Time spent in current state.
        /// </summary>
        float TimeInCurrentState { get; }

        /// <summary>
        /// Event fired on state transition.
        /// </summary>
        event Action<CristalState, CristalState> OnStateTransition;
    }

    /// <summary>
    /// Testable state logic without Unity dependencies.
    /// </summary>
    public interface IStateLogic
    {
        /// <summary>
        /// State identifier.
        /// </summary>
        CristalState StateId { get; }

        /// <summary>
        /// Check if transition to target state is allowed.
        /// </summary>
        bool CanTransitionTo(CristalState targetState);

        /// <summary>
        /// Process input, returns true if fully handled.
        /// </summary>
        bool ProcessInput(string input, IStateContext context);

        /// <summary>
        /// Get response modifier for this state.
        /// </summary>
        StateResponseModifier GetModifier();

        /// <summary>
        /// Called on state enter.
        /// </summary>
        void OnEnter(IStateContext context);

        /// <summary>
        /// Called on state exit.
        /// </summary>
        void OnExit(IStateContext context);

        /// <summary>
        /// Update logic (delta time in seconds).
        /// </summary>
        void OnUpdate(IStateContext context, float deltaTime);
    }
}

using Cristal.CLI.Memory;

namespace Cristal.CLI.StateMachine.States
{
    /// <summary>
    /// Base class for terminal states with default implementations.
    /// </summary>
    public abstract class BaseState : ITerminalState
    {
        public abstract CristalState StateId { get; }
        public abstract string DisplayName { get; }

        protected StateResponseModifier _modifier = new StateResponseModifier();

        public virtual void OnEnter(TerminalStateMachine machine)
        {
            // Override in derived classes
        }

        public virtual void OnExit(TerminalStateMachine machine)
        {
            // Override in derived classes
        }

        public virtual void OnUpdate(TerminalStateMachine machine)
        {
            // Override in derived classes
        }

        public virtual bool ProcessInput(TerminalStateMachine machine, string input)
        {
            // Default: don't handle, let the response engine process
            return false;
        }

        public virtual StateResponseModifier GetResponseModifier()
        {
            return _modifier;
        }

        public virtual bool CanTransitionTo(CristalState targetState)
        {
            // Default: allow all transitions
            return true;
        }
    }
}

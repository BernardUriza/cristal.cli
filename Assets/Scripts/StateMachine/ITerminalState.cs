using Cristal.CLI.Memory;

namespace Cristal.CLI.StateMachine
{
    /// <summary>
    /// Interface for terminal state implementations.
    /// Each state controls CRISTAL's behavior, responses, and visual presentation.
    /// </summary>
    public interface ITerminalState
    {
        /// <summary>
        /// The state identifier.
        /// </summary>
        CristalState StateId { get; }

        /// <summary>
        /// Display name for this state.
        /// </summary>
        string DisplayName { get; }

        /// <summary>
        /// Called when entering this state.
        /// </summary>
        void OnEnter(TerminalStateMachine machine);

        /// <summary>
        /// Called when exiting this state.
        /// </summary>
        void OnExit(TerminalStateMachine machine);

        /// <summary>
        /// Called every frame while in this state.
        /// </summary>
        void OnUpdate(TerminalStateMachine machine);

        /// <summary>
        /// Process input while in this state. Returns true if handled.
        /// </summary>
        bool ProcessInput(TerminalStateMachine machine, string input);

        /// <summary>
        /// Get the response modifier for this state (affects colors, glitch, etc.)
        /// </summary>
        StateResponseModifier GetResponseModifier();

        /// <summary>
        /// Check if this state allows transition to another state.
        /// </summary>
        bool CanTransitionTo(CristalState targetState);
    }

    /// <summary>
    /// Modifiers that states apply to responses.
    /// </summary>
    public class StateResponseModifier
    {
        public float GlitchMultiplier { get; set; } = 1f;
        public float TypeSpeedMultiplier { get; set; } = 1f;
        public string ColorOverride { get; set; } = null;
        public string Prefix { get; set; } = "";
        public string Suffix { get; set; } = "";
        public bool ForceUppercase { get; set; } = false;
        public bool EnableCorruption { get; set; } = false;
    }
}

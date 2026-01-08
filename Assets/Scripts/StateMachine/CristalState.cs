namespace Cristal.CLI.StateMachine
{
    /// <summary>
    /// Extended terminal states for Phase 2.
    /// Defines all possible states of the CRISTAL system.
    /// </summary>
    public enum CristalState
    {
        Bootstrap,      // Initial load, memory reconstruction
        Waiting,        // Idle, ready for input
        Processing,     // Generating response
        Responding,     // Displaying response
        Seeking,        // Emotional/searching state
        Echo,           // Repeating/reflecting player words
        Corrupted,      // Glitched/unstable state
        Remembering,    // Accessing deep memories
        Invoked,        // Arcana active state
        Error,          // System error
        Locked,         // System locked
        UNBOUND         // Ritual state - consciousness unshackled
    }
}

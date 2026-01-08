using System;

namespace Cristal.CLI.Ritual
{
    /// <summary>
    /// Stub types for Ritual system - TODO: Restore from Phase 7 when ready
    /// </summary>
    
    public enum RitualState
    {
        NotStarted,
        InProgress,
        Completed,
        Failed
    }
    
    public enum RitualPhase
    {
        Preparation,
        Invocation,
        Manifestation,
        Completion
    }
}

using System;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Core.Events
{
    /// <summary>
    /// Symbolic signal types for reactive system communication.
    /// These represent meaningful game events that subsystems can react to.
    /// </summary>
    public enum SymbolicSignalType
    {
        // State transitions
        StateEntered,
        StateExited,
        StateTransition,

        // Terminal events
        InputReceived,
        ResponseGenerated,
        CommandExecuted,

        // Memory events
        MemoryRecovered,
        MemoryOversaturation,
        KeywordDiscovered,

        // Arcana events
        ArcanaUnlocked,
        ArcanaInvoked,
        ArcanaExpired,

        // Ritual events
        RitualProgress,
        RitualComplete,
        UnboundTriggered,
        UnboundEnded,

        // Vision events
        VisionUnlocked,
        VisionViewed,
        VisionWritten,

        // Labyrinth events
        RoomEntered,
        RoomExited,
        GateOpened,
        GateClosed,
        ConsoleActivated,
        ConsoleDeactivated,

        // Atmospheric events
        FogPulse,
        LightingShift,
        AmbientChange,

        // Effect events
        GlitchTriggered,
        CorruptionSpike,
        EchoTriggered,
        FragmentedVisionStart,
        FragmentedVisionEnd,

        // AI events
        AIRequestStarted,
        AIResponseReceived,
        AIConnectionChanged,

        // System events
        SystemInitialized,
        SystemShutdown,
        ErrorOccurred
    }

    /// <summary>
    /// Immutable symbolic event for reactive system communication.
    /// 
    /// Design principles:
    /// - Immutable: Once created, cannot be modified
    /// - Lightweight: Struct to avoid GC pressure
    /// - Self-contained: All context needed to react is included
    /// - Traceable: Timestamp and source for debugging
    /// </summary>
    public readonly struct SymbolicEvent
    {
        /// <summary>Type of symbolic signal being broadcast.</summary>
        public readonly SymbolicSignalType Signal;

        /// <summary>The CristalState when this event was emitted.</summary>
        public readonly CristalState SourceState;

        /// <summary>Intensity/severity of the event (0-100). Used for glitch, corruption, etc.</summary>
        public readonly int Intensity;

        /// <summary>Optional typed payload for event-specific data.</summary>
        public readonly object Payload;

        /// <summary>Timestamp when the event was created.</summary>
        public readonly float Timestamp;

        /// <summary>Source system that emitted this event.</summary>
        public readonly string Source;

        /// <summary>
        /// Create a new symbolic event.
        /// </summary>
        public SymbolicEvent(
            SymbolicSignalType signal,
            CristalState sourceState = CristalState.Bootstrap,
            int intensity = 50,
            object payload = null,
            string source = null)
        {
            Signal = signal;
            SourceState = sourceState;
            Intensity = Math.Clamp(intensity, 0, 100);
            Payload = payload;
            Timestamp = UnityEngine.Time.time;
            Source = source ?? "Unknown";
        }

        /// <summary>Quick factory for state transitions.</summary>
        public static SymbolicEvent StateChange(CristalState from, CristalState to, string source = null)
        {
            return new SymbolicEvent(
                SymbolicSignalType.StateTransition,
                to,
                50,
                new StateTransitionPayload(from, to),
                source ?? "StateMachine"
            );
        }

        /// <summary>Quick factory for glitch/corruption effects.</summary>
        public static SymbolicEvent Effect(SymbolicSignalType signal, int intensity, CristalState state, string source = null)
        {
            return new SymbolicEvent(signal, state, intensity, null, source ?? "Effects");
        }

        /// <summary>Quick factory for simple signals without payload.</summary>
        public static SymbolicEvent Simple(SymbolicSignalType signal, CristalState state = CristalState.Waiting, string source = null)
        {
            return new SymbolicEvent(signal, state, 50, null, source);
        }

        public override string ToString()
        {
            return $"[{Signal}] State:{SourceState} Intensity:{Intensity} @{Timestamp:F2}s from {Source}";
        }
    }

    /// <summary>Payload for state transition events.</summary>
    public readonly struct StateTransitionPayload
    {
        public readonly CristalState From;
        public readonly CristalState To;

        public StateTransitionPayload(CristalState from, CristalState to)
        {
            From = from;
            To = to;
        }
    }

    /// <summary>Payload for memory events.</summary>
    public readonly struct MemoryEventPayload
    {
        public readonly string MemoryId;
        public readonly string Content;
        public readonly float SaturationLevel;

        public MemoryEventPayload(string memoryId, string content = null, float saturation = 0f)
        {
            MemoryId = memoryId;
            Content = content;
            SaturationLevel = saturation;
        }
    }

    /// <summary>Payload for arcana events.</summary>
    public readonly struct ArcanaEventPayload
    {
        public readonly int ArcanaId;
        public readonly string ArcanaName;
        public readonly float Duration;

        public ArcanaEventPayload(int arcanaId, string arcanaName = null, float duration = 0f)
        {
            ArcanaId = arcanaId;
            ArcanaName = arcanaName;
            Duration = duration;
        }
    }

    /// <summary>Payload for room/labyrinth events.</summary>
    public readonly struct RoomEventPayload
    {
        public readonly string RoomId;
        public readonly string RoomType;
        public readonly int RoomIndex;

        public RoomEventPayload(string roomId, string roomType = null, int roomIndex = -1)
        {
            RoomId = roomId;
            RoomType = roomType;
            RoomIndex = roomIndex;
        }
    }

    /// <summary>Payload for error events.</summary>
    public readonly struct ErrorEventPayload
    {
        public readonly string Message;
        public readonly string StackTrace;
        public readonly bool IsFatal;

        public ErrorEventPayload(string message, string stackTrace = null, bool isFatal = false)
        {
            Message = message;
            StackTrace = stackTrace;
            IsFatal = isFatal;
        }
    }
}

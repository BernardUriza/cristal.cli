using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Core.Events
{
    /// <summary>
    /// Bridge component that publishes existing system events to ReactiveSystemBus.
    /// Attach to a persistent GameObject to enable reactive event flow.
    /// 
    /// This acts as a transitional layer during migration from direct coupling
    /// to full reactive architecture.
    /// </summary>
    [DefaultExecutionOrder(-50)] // After CristalBootstrap, before most systems
    public class ReactiveEventBridge : MonoBehaviour
    {
        [Header("Debug")]
        [SerializeField] private bool _logPublishedEvents = false;

        private TerminalStateMachine _stateMachine;
        private CristalMemory _memory;

        private void Start()
        {
            // Get references from ServiceLocator
            _stateMachine = ServiceLocator.TryGet<TerminalStateMachine>();
            _memory = ServiceLocator.TryGet<CristalMemory>();

            SubscribeToSystems();

            // Publish initialization event
            ReactiveSystemBus.Publish(SymbolicEvent.Simple(
                SymbolicSignalType.SystemInitialized,
                CristalState.Bootstrap,
                "ReactiveEventBridge"
            ));

            if (_logPublishedEvents)
            {
                ReactiveSystemBus.SetDebugMode(true, true);
            }
        }

        private void OnDestroy()
        {
            UnsubscribeFromSystems();

            ReactiveSystemBus.Publish(SymbolicEvent.Simple(
                SymbolicSignalType.SystemShutdown,
                CristalState.Bootstrap,
                "ReactiveEventBridge"
            ));
        }

        private void SubscribeToSystems()
        {
            // State Machine events
            if (_stateMachine != null)
            {
                _stateMachine.OnStateTransition += PublishStateTransition;
            }

            // Memory events
            if (_memory != null)
            {
                _memory.OnCommandLogged += PublishCommandLogged;
                _memory.OnKeywordDiscovered += PublishKeywordDiscovered;
                _memory.OnArcanaUnlocked += PublishArcanaUnlocked;
            }

            // TODO: Add subscriptions for other systems as they're migrated
            // - RitualSystem
            // - ArcanaSystem
            // - VisionManager
            // - etc.
        }

        private void UnsubscribeFromSystems()
        {
            if (_stateMachine != null)
            {
                _stateMachine.OnStateTransition -= PublishStateTransition;
            }

            if (_memory != null)
            {
                _memory.OnCommandLogged -= PublishCommandLogged;
                _memory.OnKeywordDiscovered -= PublishKeywordDiscovered;
                _memory.OnArcanaUnlocked -= PublishArcanaUnlocked;
            }
        }

        #region Event Publishers

        private void PublishStateTransition(CristalState from, CristalState to)
        {
            var evt = SymbolicEvent.StateChange(from, to, "TerminalStateMachine");
            ReactiveSystemBus.Publish(in evt);

            // Also publish state-specific events
            PublishStateSpecificEvents(to);
        }

        private void PublishStateSpecificEvents(CristalState newState)
        {
            // Publish additional events based on state
            switch (newState)
            {
                case CristalState.Corrupted:
                    ReactiveSystemBus.Publish(
                        SymbolicSignalType.CorruptionSpike,
                        70,
                        newState,
                        "StateTransition"
                    );
                    break;

                case CristalState.Echo:
                    ReactiveSystemBus.Publish(
                        SymbolicSignalType.EchoTriggered,
                        50,
                        newState,
                        "StateTransition"
                    );
                    break;

                case CristalState.Unbound:
                    ReactiveSystemBus.Publish(SymbolicEvent.Simple(
                        SymbolicSignalType.UnboundTriggered,
                        newState,
                        "StateTransition"
                    ));
                    break;
            }
        }

        private void PublishCommandLogged(CommandEntry entry)
        {
            ReactiveSystemBus.Publish(new SymbolicEvent(
                SymbolicSignalType.CommandExecuted,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                50,
                entry.input,
                "CristalMemory"
            ));
        }

        private void PublishKeywordDiscovered(string keyword)
        {
            ReactiveSystemBus.Publish(new SymbolicEvent(
                SymbolicSignalType.KeywordDiscovered,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                60,
                keyword,
                "CristalMemory"
            ));
        }

        private void PublishArcanaUnlocked(int arcanaId)
        {
            ReactiveSystemBus.Publish(new SymbolicEvent(
                SymbolicSignalType.ArcanaUnlocked,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                80,
                new ArcanaEventPayload(arcanaId),
                "CristalMemory"
            ));
        }

        #endregion

        #region Manual Event Triggers (for testing or scripted events)

        /// <summary>Manually trigger a glitch event.</summary>
        public void TriggerGlitch(int intensity = 50)
        {
            ReactiveSystemBus.Publish(
                SymbolicSignalType.GlitchTriggered,
                intensity,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                "Manual"
            );
        }

        /// <summary>Manually trigger a fog pulse.</summary>
        public void TriggerFogPulse(int intensity = 50)
        {
            ReactiveSystemBus.Publish(
                SymbolicSignalType.FogPulse,
                intensity,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                "Manual"
            );
        }

        /// <summary>Manually trigger a corruption spike.</summary>
        public void TriggerCorruptionSpike(int intensity = 70)
        {
            ReactiveSystemBus.Publish(
                SymbolicSignalType.CorruptionSpike,
                intensity,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                "Manual"
            );
        }

        /// <summary>Manually trigger room entered event.</summary>
        public void TriggerRoomEntered(string roomId, string roomType = null, int roomIndex = -1)
        {
            ReactiveSystemBus.Publish(new SymbolicEvent(
                SymbolicSignalType.RoomEntered,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                50,
                new RoomEventPayload(roomId, roomType, roomIndex),
                "Manual"
            ));
        }

        /// <summary>Manually trigger gate opened event.</summary>
        public void TriggerGateOpened()
        {
            ReactiveSystemBus.Publish(SymbolicEvent.Simple(
                SymbolicSignalType.GateOpened,
                _stateMachine?.CurrentStateId ?? CristalState.Waiting,
                "Manual"
            ));
        }

        #endregion
    }
}

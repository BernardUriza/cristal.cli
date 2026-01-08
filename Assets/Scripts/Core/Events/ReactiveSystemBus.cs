using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Core.Events
{
    /// <summary>
    /// Delegate for symbolic event handlers.
    /// </summary>
    public delegate void SymbolicEventHandler(in SymbolicEvent evt);

    /// <summary>
    /// Central event bus for reactive system communication.
    /// 
    /// Design principles:
    /// - Decoupled: Publishers don't know about subscribers
    /// - Type-safe: Events are strongly typed via SymbolicSignalType
    /// - Performant: Uses pooled lists, minimal allocations
    /// - Debuggable: Full event history and statistics
    /// - Thread-aware: Main thread only (Unity constraint)
    /// 
    /// Usage:
    /// - Publish: ReactiveSystemBus.Publish(SymbolicEvent.Simple(SignalType.GateOpened));
    /// - Subscribe: ReactiveSystemBus.Subscribe(SignalType.GateOpened, OnGateOpened);
    /// - Unsubscribe: ReactiveSystemBus.Unsubscribe(SignalType.GateOpened, OnGateOpened);
    /// </summary>
    public static class ReactiveSystemBus
    {
        // Subscriptions per signal type
        private static readonly Dictionary<SymbolicSignalType, List<SymbolicEventHandler>> _subscriptions = new();

        // Wildcard subscribers (receive ALL events)
        private static readonly List<SymbolicEventHandler> _wildcardSubscribers = new();

        // Event history for debugging
        private static readonly Queue<SymbolicEvent> _eventHistory = new();
        private const int MAX_HISTORY_SIZE = 100;

        // Statistics
        private static readonly Dictionary<SymbolicSignalType, int> _eventCounts = new();
        private static int _totalEventsPublished = 0;
        private static bool _isPublishing = false;

        // Pending operations (to avoid modification during iteration)
        private static readonly List<(SymbolicSignalType, SymbolicEventHandler, bool)> _pendingOperations = new();

        // Debug settings
        private static bool _debugMode = false;
        private static bool _logAllEvents = false;

        #region Configuration

        /// <summary>Enable/disable debug logging.</summary>
        public static void SetDebugMode(bool enabled, bool logAllEvents = false)
        {
            _debugMode = enabled;
            _logAllEvents = logAllEvents;
        }

        #endregion

        #region Subscribe / Unsubscribe

        /// <summary>
        /// Subscribe to a specific signal type.
        /// </summary>
        public static void Subscribe(SymbolicSignalType signal, SymbolicEventHandler handler)
        {
            if (handler == null) return;

            if (_isPublishing)
            {
                _pendingOperations.Add((signal, handler, true));
                return;
            }

            if (!_subscriptions.TryGetValue(signal, out var handlers))
            {
                handlers = new List<SymbolicEventHandler>();
                _subscriptions[signal] = handlers;
            }

            if (!handlers.Contains(handler))
            {
                handlers.Add(handler);

                if (_debugMode)
                {
                    Debug.Log($"[ReactiveSystemBus] Subscribed to {signal}: {handler.Method.DeclaringType?.Name}.{handler.Method.Name}");
                }
            }
        }

        /// <summary>
        /// Subscribe to multiple signal types at once.
        /// </summary>
        public static void Subscribe(SymbolicEventHandler handler, params SymbolicSignalType[] signals)
        {
            foreach (var signal in signals)
            {
                Subscribe(signal, handler);
            }
        }

        /// <summary>
        /// Subscribe to ALL events (wildcard).
        /// Use sparingly - meant for debugging/logging systems.
        /// </summary>
        public static void SubscribeAll(SymbolicEventHandler handler)
        {
            if (handler == null) return;

            if (!_wildcardSubscribers.Contains(handler))
            {
                _wildcardSubscribers.Add(handler);

                if (_debugMode)
                {
                    Debug.Log($"[ReactiveSystemBus] Wildcard subscription: {handler.Method.DeclaringType?.Name}.{handler.Method.Name}");
                }
            }
        }

        /// <summary>
        /// Unsubscribe from a specific signal type.
        /// </summary>
        public static void Unsubscribe(SymbolicSignalType signal, SymbolicEventHandler handler)
        {
            if (handler == null) return;

            if (_isPublishing)
            {
                _pendingOperations.Add((signal, handler, false));
                return;
            }

            if (_subscriptions.TryGetValue(signal, out var handlers))
            {
                handlers.Remove(handler);

                if (_debugMode)
                {
                    Debug.Log($"[ReactiveSystemBus] Unsubscribed from {signal}: {handler.Method.DeclaringType?.Name}.{handler.Method.Name}");
                }
            }
        }

        /// <summary>
        /// Unsubscribe from all signal types.
        /// </summary>
        public static void UnsubscribeAll(SymbolicEventHandler handler)
        {
            if (handler == null) return;

            foreach (var handlers in _subscriptions.Values)
            {
                handlers.Remove(handler);
            }

            _wildcardSubscribers.Remove(handler);
        }

        #endregion

        #region Publish

        /// <summary>
        /// Publish a symbolic event to all subscribers.
        /// </summary>
        public static void Publish(in SymbolicEvent evt)
        {
            _totalEventsPublished++;

            // Track statistics
            if (!_eventCounts.ContainsKey(evt.Signal))
            {
                _eventCounts[evt.Signal] = 0;
            }
            _eventCounts[evt.Signal]++;

            // Add to history
            _eventHistory.Enqueue(evt);
            while (_eventHistory.Count > MAX_HISTORY_SIZE)
            {
                _eventHistory.Dequeue();
            }

            if (_logAllEvents)
            {
                Debug.Log($"[ReactiveSystemBus] {evt}");
            }

            _isPublishing = true;

            try
            {
                // Notify specific subscribers
                if (_subscriptions.TryGetValue(evt.Signal, out var handlers))
                {
                    for (int i = 0; i < handlers.Count; i++)
                    {
                        try
                        {
                            handlers[i]?.Invoke(in evt);
                        }
                        catch (Exception ex)
                        {
                            Debug.LogError($"[ReactiveSystemBus] Handler exception for {evt.Signal}: {ex.Message}\n{ex.StackTrace}");
                        }
                    }
                }

                // Notify wildcard subscribers
                for (int i = 0; i < _wildcardSubscribers.Count; i++)
                {
                    try
                    {
                        _wildcardSubscribers[i]?.Invoke(in evt);
                    }
                    catch (Exception ex)
                    {
                        Debug.LogError($"[ReactiveSystemBus] Wildcard handler exception: {ex.Message}\n{ex.StackTrace}");
                    }
                }
            }
            finally
            {
                _isPublishing = false;
                ProcessPendingOperations();
            }
        }

        /// <summary>
        /// Publish a simple signal without creating the event manually.
        /// </summary>
        public static void Publish(SymbolicSignalType signal, string source = null)
        {
            Publish(SymbolicEvent.Simple(signal, CristalState.Waiting, source));
        }

        /// <summary>
        /// Publish a signal with intensity.
        /// </summary>
        public static void Publish(SymbolicSignalType signal, int intensity, CristalState state, string source = null)
        {
            Publish(SymbolicEvent.Effect(signal, intensity, state, source));
        }

        private static void ProcessPendingOperations()
        {
            foreach (var (signal, handler, isSubscribe) in _pendingOperations)
            {
                if (isSubscribe)
                {
                    Subscribe(signal, handler);
                }
                else
                {
                    Unsubscribe(signal, handler);
                }
            }
            _pendingOperations.Clear();
        }

        #endregion

        #region Query / Debug

        /// <summary>Get total events published since startup.</summary>
        public static int TotalEventsPublished => _totalEventsPublished;

        /// <summary>Get count for a specific signal type.</summary>
        public static int GetEventCount(SymbolicSignalType signal)
        {
            return _eventCounts.TryGetValue(signal, out var count) ? count : 0;
        }

        /// <summary>Get all event counts.</summary>
        public static IReadOnlyDictionary<SymbolicSignalType, int> GetAllEventCounts()
        {
            return _eventCounts;
        }

        /// <summary>Get subscriber count for a signal type.</summary>
        public static int GetSubscriberCount(SymbolicSignalType signal)
        {
            return _subscriptions.TryGetValue(signal, out var handlers) ? handlers.Count : 0;
        }

        /// <summary>Get total subscriber count (including wildcards).</summary>
        public static int GetTotalSubscriberCount()
        {
            int count = _wildcardSubscribers.Count;
            foreach (var handlers in _subscriptions.Values)
            {
                count += handlers.Count;
            }
            return count;
        }

        /// <summary>Get recent event history.</summary>
        public static IEnumerable<SymbolicEvent> GetEventHistory()
        {
            return _eventHistory;
        }

        /// <summary>Get the most recent event of a specific type.</summary>
        public static SymbolicEvent? GetLastEvent(SymbolicSignalType signal)
        {
            SymbolicEvent? last = null;
            foreach (var evt in _eventHistory)
            {
                if (evt.Signal == signal)
                {
                    last = evt;
                }
            }
            return last;
        }

        /// <summary>Clear all subscriptions and history. Use for testing or scene reload.</summary>
        public static void Clear()
        {
            _subscriptions.Clear();
            _wildcardSubscribers.Clear();
            _eventHistory.Clear();
            _eventCounts.Clear();
            _pendingOperations.Clear();
            _totalEventsPublished = 0;
            _isPublishing = false;

            if (_debugMode)
            {
                Debug.Log("[ReactiveSystemBus] Cleared all subscriptions and history");
            }
        }

        #endregion
    }

    /// <summary>
    /// Interface for systems that react to symbolic events.
    /// Implement this for automatic subscription management.
    /// </summary>
    public interface IReactiveSystem
    {
        /// <summary>Signal types this system wants to receive.</summary>
        SymbolicSignalType[] SubscribedSignals { get; }

        /// <summary>Handle an incoming symbolic event.</summary>
        void OnSymbolicEvent(in SymbolicEvent evt);
    }

    /// <summary>
    /// Base class for MonoBehaviours that react to symbolic events.
    /// Handles subscription/unsubscription automatically.
    /// </summary>
    public abstract class ReactiveMonoBehaviour : MonoBehaviour, IReactiveSystem
    {
        public abstract SymbolicSignalType[] SubscribedSignals { get; }

        protected virtual void OnEnable()
        {
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Subscribe(signal, OnSymbolicEvent);
            }
        }

        protected virtual void OnDisable()
        {
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Unsubscribe(signal, OnSymbolicEvent);
            }
        }

        public abstract void OnSymbolicEvent(in SymbolicEvent evt);
    }
}

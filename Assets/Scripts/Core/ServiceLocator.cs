using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Core
{
    /// <summary>
    /// Centralized service locator for CRISTAL systems.
    /// 
    /// Why:
    /// - 13+ singletons scattered across the codebase is unmaintainable
    /// - Tight coupling between systems makes testing impossible
    /// - No clear initialization order causes race conditions
    /// 
    /// Usage:
    /// - Register: ServiceLocator.Register<ITerminalUI>(myTerminalUI);
    /// - Resolve:  var ui = ServiceLocator.Get<ITerminalUI>();
    /// - Optional: var ui = ServiceLocator.TryGet<ITerminalUI>();
    /// 
    /// For MonoBehaviours that need to be singletons, use ServiceLocator
    /// instead of implementing Instance property directly.
    /// </summary>
    public static class ServiceLocator
    {
        private static readonly Dictionary<Type, object> _services = new();
        private static readonly Dictionary<Type, Func<object>> _factories = new();
        private static bool _isShuttingDown;

        /// <summary>
        /// Register a service instance.
        /// </summary>
        public static void Register<T>(T service) where T : class
        {
            if (_isShuttingDown) return;

            var type = typeof(T);
            if (_services.ContainsKey(type))
            {
                Debug.LogWarning($"[ServiceLocator] Overwriting existing service: {type.Name}");
            }

            _services[type] = service;

            if (Debug.isDebugBuild)
            {
                Debug.Log($"[ServiceLocator] Registered: {type.Name}");
            }
        }

        /// <summary>
        /// Register a lazy factory for deferred instantiation.
        /// </summary>
        public static void RegisterFactory<T>(Func<T> factory) where T : class
        {
            if (_isShuttingDown) return;

            _factories[typeof(T)] = () => factory();
        }

        /// <summary>
        /// Get a required service. Throws if not found.
        /// </summary>
        public static T Get<T>() where T : class
        {
            var type = typeof(T);

            if (_services.TryGetValue(type, out var service))
            {
                return (T)service;
            }

            if (_factories.TryGetValue(type, out var factory))
            {
                var instance = (T)factory();
                _services[type] = instance;
                return instance;
            }

            throw new InvalidOperationException(
                $"[ServiceLocator] Service not registered: {type.Name}. " +
                $"Ensure it's registered before accessing."
            );
        }

        /// <summary>
        /// Try to get a service. Returns null if not found.
        /// </summary>
        public static T TryGet<T>() where T : class
        {
            var type = typeof(T);

            if (_services.TryGetValue(type, out var service))
            {
                return (T)service;
            }

            if (_factories.TryGetValue(type, out var factory))
            {
                var instance = (T)factory();
                _services[type] = instance;
                return (T)instance;
            }

            return null;
        }

        /// <summary>
        /// Check if a service is registered.
        /// </summary>
        public static bool IsRegistered<T>() where T : class
        {
            return _services.ContainsKey(typeof(T)) || _factories.ContainsKey(typeof(T));
        }

        /// <summary>
        /// Unregister a service.
        /// </summary>
        public static void Unregister<T>() where T : class
        {
            var type = typeof(T);
            _services.Remove(type);
            _factories.Remove(type);
        }

        /// <summary>
        /// Clear all services. Call on scene unload or application quit.
        /// </summary>
        public static void Clear()
        {
            _services.Clear();
            _factories.Clear();
        }

        /// <summary>
        /// Mark as shutting down to prevent late registrations.
        /// </summary>
        public static void Shutdown()
        {
            _isShuttingDown = true;
            Clear();
        }

        /// <summary>
        /// Reset for testing or scene reload.
        /// </summary>
        public static void Reset()
        {
            _isShuttingDown = false;
            Clear();
        }

        #region Unity Integration

        /// <summary>
        /// Helper to register a MonoBehaviour and handle its lifecycle.
        /// </summary>
        public static void RegisterMono<T>(T mono) where T : MonoBehaviour
        {
            Register<T>(mono);

            // Auto-unregister on destroy
            var tracker = mono.gameObject.AddComponent<ServiceLifetimeTracker>();
            tracker.Initialize(typeof(T), () => Unregister<T>());
        }

        #endregion
    }

    /// <summary>
    /// Tracks MonoBehaviour lifetime and unregisters from ServiceLocator on destroy.
    /// </summary>
    [AddComponentMenu("")] // Hide from menu
    public class ServiceLifetimeTracker : MonoBehaviour
    {
        private Type _serviceType;
        private Action _onDestroy;

        public void Initialize(Type serviceType, Action onDestroy)
        {
            _serviceType = serviceType;
            _onDestroy = onDestroy;
            hideFlags = HideFlags.HideInInspector;
        }

        private void OnDestroy()
        {
            _onDestroy?.Invoke();
        }
    }
}

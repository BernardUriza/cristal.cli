using UnityEngine;

namespace Cristal.CLI.Core
{
    /// <summary>
    /// Centralized logging configuration for CRISTAL.
    /// 
    /// Instead of 50+ scattered Debug.Log calls that can't be toggled:
    /// - Use CristalLog.Info/Warning/Error
    /// - Configure verbosity per-system via ScriptableObject
    /// - Strip logs in release builds automatically
    /// </summary>
    public static class CristalLog
    {
        private static LogConfig _config;
        private static bool _initialized;

        public static void Initialize(LogConfig config)
        {
            _config = config;
            _initialized = true;
        }

        public static void Info(string system, string message)
        {
            if (!ShouldLog(system, LogLevel.Info)) return;
            Debug.Log($"[{system}] {message}");
        }

        public static void Warning(string system, string message)
        {
            if (!ShouldLog(system, LogLevel.Warning)) return;
            Debug.LogWarning($"[{system}] {message}");
        }

        public static void Error(string system, string message)
        {
            // Errors always log
            Debug.LogError($"[{system}] {message}");
        }

        public static void State(string system, string from, string to)
        {
            if (!ShouldLog(system, LogLevel.State)) return;
            Debug.Log($"[{system}] {from} → {to}");
        }

        public static void Event(string system, string eventName)
        {
            if (!ShouldLog(system, LogLevel.Event)) return;
            Debug.Log($"[{system}] EVENT: {eventName}");
        }

        private static bool ShouldLog(string system, LogLevel level)
        {
            #if !UNITY_EDITOR && !DEVELOPMENT_BUILD
            // Strip verbose logs in release
            if (level == LogLevel.Info || level == LogLevel.State)
                return false;
            #endif

            if (!_initialized || _config == null)
                return true; // Default: log everything in dev

            return _config.ShouldLog(system, level);
        }
    }

    public enum LogLevel
    {
        None = 0,
        Error = 1,
        Warning = 2,
        Info = 3,
        State = 4,
        Event = 5,
        Verbose = 6
    }

    /// <summary>
    /// ScriptableObject for log configuration.
    /// Create via: Create > CRISTAL > Log Config
    /// </summary>
    [CreateAssetMenu(menuName = "CRISTAL/Log Config", fileName = "LogConfig")]
    public class LogConfig : ScriptableObject
    {
        [Header("Global")]
        public LogLevel globalLevel = LogLevel.Info;
        public bool enableInEditor = true;

        [Header("Per-System Overrides")]
        public SystemLogOverride[] systemOverrides;

        public bool ShouldLog(string system, LogLevel level)
        {
            // Check for system-specific override
            if (systemOverrides != null)
            {
                foreach (var so in systemOverrides)
                {
                    if (so.systemName == system)
                    {
                        return level <= so.maxLevel;
                    }
                }
            }

            // Fall back to global
            return level <= globalLevel;
        }
    }

    [System.Serializable]
    public struct SystemLogOverride
    {
        public string systemName;
        public LogLevel maxLevel;
    }
}

using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Terminal.UI;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Arcana;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Terminal
{
    /// <summary>
    /// Handles system/debug commands for the terminal.
    /// Commands: set theme, debug, status, etc.
    /// </summary>
    public class TerminalCommandHandler : MonoBehaviour
    {
        public static TerminalCommandHandler Instance { get; private set; }

        [Header("Settings")]
        [SerializeField] private bool _enableDebugCommands = true;
        [SerializeField] private string _debugCommandPrefix = "debug";

        public event Action<string> OnCommandResponse;

        private Dictionary<string, Func<string[], string>> _commands;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                InitializeCommands();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void InitializeCommands()
        {
            _commands = new Dictionary<string, Func<string[], string>>(StringComparer.OrdinalIgnoreCase)
            {
                { "set", HandleSetCommand },
                { "theme", HandleThemeCommand },
                { "themes", HandleListThemesCommand },
                { "status", HandleStatusCommand },
                { "debug", HandleDebugCommand },
                { "help", HandleHelpCommand }
            };
        }

        /// <summary>
        /// Try to process input as a system command.
        /// Returns true if it was handled, false otherwise.
        /// </summary>
        public bool TryProcessCommand(string input, out string response)
        {
            response = null;
            if (string.IsNullOrWhiteSpace(input)) return false;

            string[] parts = input.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return false;

            string command = parts[0].ToLower();

            if (_commands.TryGetValue(command, out var handler))
            {
                response = handler(parts);
                return response != null;
            }

            return false;
        }

        #region Command Handlers

        private string HandleSetCommand(string[] args)
        {
            if (args.Length < 3) return null;

            string property = args[1].ToLower();

            switch (property)
            {
                case "theme":
                    string themeName = string.Join(" ", args, 2, args.Length - 2);
                    return SetTheme(themeName);
                
                case "glitch":
                    if (float.TryParse(args[2], out float glitchVal))
                    {
                        TerminalThemeManager.Instance?.SetGlitchIntensity(glitchVal);
                        return $"Glitch intensity set to {glitchVal:F2}";
                    }
                    return "Invalid glitch value. Use: set glitch [0.0-1.0]";

                case "scanlines":
                    if (args[2].ToLower() == "on" || args[2] == "1")
                    {
                        var scanline = FindFirstObjectByType<ScanlineEffect>();
                        scanline?.gameObject.SetActive(true);
                        return "Scanlines enabled";
                    }
                    else if (args[2].ToLower() == "off" || args[2] == "0")
                    {
                        var scanline = FindFirstObjectByType<ScanlineEffect>();
                        scanline?.gameObject.SetActive(false);
                        return "Scanlines disabled";
                    }
                    return "Use: set scanlines [on|off]";

                case "crt":
                    var effect = FindFirstObjectByType<ScanlineEffect>();
                    if (effect == null) return "ScanlineEffect not found";
                    
                    if (args[2].ToLower() == "advanced")
                    {
                        effect.SetMode(ScanlineEffect.EffectMode.Advanced);
                        return "CRT mode: Advanced (shader-based)";
                    }
                    else if (args[2].ToLower() == "simple")
                    {
                        effect.SetMode(ScanlineEffect.EffectMode.Simple);
                        return "CRT mode: Simple (texture-based)";
                    }
                    return "Use: set crt [simple|advanced]";

                default:
                    return null;
            }
        }

        private string HandleThemeCommand(string[] args)
        {
            if (args.Length < 2)
            {
                return HandleListThemesCommand(args);
            }

            string themeName = string.Join(" ", args, 1, args.Length - 1);
            return SetTheme(themeName);
        }

        private string SetTheme(string themeName)
        {
            if (TerminalThemeManager.Instance == null)
            {
                return "Theme system not initialized";
            }

            if (TerminalThemeManager.Instance.ApplyThemeByName(themeName))
            {
                return $"Theme changed to: {themeName}";
            }

            var available = TerminalThemeManager.Instance.GetAvailableThemeNames();
            return $"Theme '{themeName}' not found. Available: {string.Join(", ", available)}";
        }

        private string HandleListThemesCommand(string[] args)
        {
            if (TerminalThemeManager.Instance == null)
            {
                return "Theme system not initialized";
            }

            var themes = TerminalThemeManager.Instance.GetAvailableThemeNames();
            string current = TerminalThemeManager.Instance.LastAppliedThemeName;

            return $"Available themes: {string.Join(", ", themes)}\nCurrent: {current}";
        }

        private string HandleStatusCommand(string[] args)
        {
            var lines = new List<string>
            {
                "=== CRISTAL STATUS ==="
            };

            // State machine
            if (TerminalStateMachine.Instance != null)
            {
                lines.Add($"State: {TerminalStateMachine.Instance.CurrentStateId}");
            }

            // Theme
            if (TerminalThemeManager.Instance != null)
            {
                lines.Add($"Theme: {TerminalThemeManager.Instance.LastAppliedThemeName}");
                lines.Add($"Transitioning: {TerminalThemeManager.Instance.IsTransitioning}");
            }

            // Arcana
            if (ArcanaSystem.Instance != null)
            {
                lines.Add($"Active Arcana: {(ArcanaSystem.Instance.HasActiveArcana ? ArcanaSystem.Instance.CurrentInvocation?.Definition?.name : "none")}");
            }

            // Ritual
            if (RitualSystem.Instance != null)
            {
                lines.Add($"Ritual Active: {RitualSystem.Instance.IsRitualActive}");
                lines.Add($"UNBOUND: {RitualSystem.Instance.IsUnboundActive}");
            }

            return string.Join("\n", lines);
        }

        private string HandleDebugCommand(string[] args)
        {
            if (!_enableDebugCommands)
            {
                return "Debug commands disabled";
            }

            if (args.Length < 2)
            {
                return "Debug commands: state, arcana, unbound, glitch, theme";
            }

            string subCommand = args[1].ToLower();

            switch (subCommand)
            {
                case "state":
                    if (args.Length < 3) return "Use: debug state [Waiting|Processing|Corrupted|Remembering|Echo|Unbound|...]";
                    if (Enum.TryParse<CristalState>(args[2], true, out var newState))
                    {
                        TerminalStateMachine.Instance?.TransitionTo(newState);
                        return $"State forced to: {newState}";
                    }
                    return $"Invalid state. Valid: {string.Join(", ", Enum.GetNames(typeof(CristalState)))}";

                case "arcana":
                    if (args.Length < 3) return "Use: debug arcana [name|id]";
                    var arcana = ArcanaSystem.Instance?.GetArcana(args[2]);
                    if (arcana != null)
                    {
                        ArcanaSystem.Instance?.Invoke(arcana);
                        return $"Arcana invoked: {arcana.DisplayName}";
                    }
                    return $"Arcana '{args[2]}' not found";

                case "unbound":
                    // Trigger UNBOUND manually
                    RitualSystem.Instance?.TriggerUnbound();
                    return "UNBOUND triggered manually";

                case "glitch":
                    var scanline = FindFirstObjectByType<ScanlineEffect>();
                    scanline?.TriggerGlitch();
                    return "Glitch triggered";

                case "theme":
                    if (TerminalThemeManager.Instance != null)
                    {
                        return TerminalThemeManager.Instance.GetDebugInfo();
                    }
                    return "Theme manager not found";

                case "reset":
                    TerminalStateMachine.Instance?.TransitionTo(CristalState.Waiting);
                    TerminalThemeManager.Instance?.ResetToDefault();
                    return "State and theme reset to defaults";

                default:
                    return $"Unknown debug command: {subCommand}";
            }
        }

        private string HandleHelpCommand(string[] args)
        {
            return @"CRISTAL Terminal Commands:
  set theme [name]     - Change visual theme
  set glitch [0-1]     - Set glitch intensity
  set scanlines [on|off]
  set crt [simple|advanced]
  
  themes               - List available themes
  status               - Show system status
  
  debug state [name]   - Force state transition
  debug arcana [name]  - Force arcana invocation
  debug unbound        - Trigger UNBOUND
  debug glitch         - Trigger glitch effect
  debug reset          - Reset to defaults";
        }

        #endregion

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }
    }
}

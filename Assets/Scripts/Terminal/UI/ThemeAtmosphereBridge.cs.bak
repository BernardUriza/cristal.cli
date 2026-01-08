using System.Collections;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Labyrinth;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Bridges TerminalThemeManager events to atmospheric systems (fog, lighting, audio).
    /// Ensures coordinated visual identity across terminal and environment.
    /// </summary>
    public class ThemeAtmosphereBridge : MonoBehaviour
    {
        public static ThemeAtmosphereBridge Instance { get; private set; }

        [Header("Sync Settings")]
        [SerializeField] private bool _syncFogToTheme = true;
        [SerializeField] private bool _syncLightingToTheme = true;
        [SerializeField] private bool _syncAudioToTheme = true;

        [Header("Color Influence")]
        [Tooltip("How much the terminal primary color influences atmospheric lighting")]
        [SerializeField, Range(0f, 1f)] private float _colorInfluence = 0.5f;

        [Tooltip("How much to darken the theme color for fog")]
        [SerializeField, Range(0f, 1f)] private float _fogDarkenFactor = 0.3f;

        [Header("Transition Override")]
        [Tooltip("If true, uses theme transition duration instead of atmosphere default")]
        [SerializeField] private bool _overrideTransitionDuration = false;
        [SerializeField] private float _transitionDuration = 1.5f;

        [Header("Glitch Sync")]
        [SerializeField] private bool _syncGlitchToParticles = true;
        [SerializeField] private ParticleSystem _glitchParticles;

        [Header("Debug")]
        [SerializeField] private bool _debugLog = false;

        // Cached references
        private TerminalThemeManager _themeManager;
        private LabyrinthAtmosphere _atmosphere;
        private Coroutine _colorTransitionCoroutine;

        // State
        private Color _lastPrimaryColor;
        private float _lastGlitchIntensity;

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            ServiceLocator.RegisterMono(this);
        }

        private void Start()
        {
            _themeManager = TerminalThemeManager.Instance;
            _atmosphere = LabyrinthAtmosphere.Instance;

            if (_themeManager == null)
            {
                LogDebug("[ThemeAtmosphereBridge] No TerminalThemeManager found. Bridge inactive.");
                enabled = false;
                return;
            }

            // Subscribe to theme events
            _themeManager.OnThemeTransitionStarted += HandleThemeTransitionStarted;
            _themeManager.OnPrimaryColorChanged += HandlePrimaryColorChanged;
            _themeManager.OnGlitchIntensityChanged += HandleGlitchIntensityChanged;
            _themeManager.OnThemeApplied += HandleThemeApplied;

            LogDebug("[ThemeAtmosphereBridge] Subscribed to theme events");
        }

        private void OnDestroy()
        {
            if (_themeManager != null)
            {
                _themeManager.OnThemeTransitionStarted -= HandleThemeTransitionStarted;
                _themeManager.OnPrimaryColorChanged -= HandlePrimaryColorChanged;
                _themeManager.OnGlitchIntensityChanged -= HandleGlitchIntensityChanged;
                _themeManager.OnThemeApplied -= HandleThemeApplied;
            }

            ServiceLocator.Unregister<ThemeAtmosphereBridge>();
        }

        #endregion

        #region Event Handlers

        private void HandleThemeTransitionStarted(string themeName, float duration)
        {
            LogDebug($"[ThemeAtmosphereBridge] Theme transition started: {themeName} ({duration}s)");

            // Could trigger audio stinger here
            if (_syncAudioToTheme)
            {
                var audio = LabyrinthAmbientAudio.Instance;
                if (audio != null)
                {
                    // Play subtle transition sound
                    // audio.PlayThemeTransitionStinger();
                }
            }
        }

        private void HandlePrimaryColorChanged(Color newColor)
        {
            if (_lastPrimaryColor == newColor) return;
            _lastPrimaryColor = newColor;

            LogDebug($"[ThemeAtmosphereBridge] Primary color changed: {ColorUtility.ToHtmlStringRGB(newColor)}");

            if (_colorTransitionCoroutine != null)
            {
                StopCoroutine(_colorTransitionCoroutine);
            }
            _colorTransitionCoroutine = StartCoroutine(TransitionAtmosphereColor(newColor));
        }

        private void HandleGlitchIntensityChanged(float intensity)
        {
            if (Mathf.Approximately(_lastGlitchIntensity, intensity)) return;
            _lastGlitchIntensity = intensity;

            LogDebug($"[ThemeAtmosphereBridge] Glitch intensity changed: {intensity:F2}");

            if (_syncGlitchToParticles && _glitchParticles != null)
            {
                var emission = _glitchParticles.emission;
                emission.enabled = intensity > 0.1f;

                // Scale emission rate with glitch intensity
                var rate = emission.rateOverTime;
                rate.constant = Mathf.Lerp(0f, 50f, intensity);
                emission.rateOverTime = rate;
            }

            // Sync with atmosphere's glitch particles if available
            if (_atmosphere != null && _syncGlitchToParticles)
            {
                // LabyrinthAtmosphere has its own glitch particle management
                // We could call a public method here if it exists
            }
        }

        private void HandleThemeApplied(TerminalVisualConfig config)
        {
            LogDebug($"[ThemeAtmosphereBridge] Theme applied: {config?.name ?? "null"}");

            if (config == null) return;

            // Full sync when a new theme is applied
            if (_syncLightingToTheme)
            {
                ApplyLightingFromConfig(config);
            }

            if (_syncFogToTheme && _atmosphere != null)
            {
                ApplyFogFromConfig(config);
            }
        }

        #endregion

        #region Atmosphere Sync

        private IEnumerator TransitionAtmosphereColor(Color targetColor)
        {
            Color startFogColor = RenderSettings.fogColor;
            Color targetFogColor = CalculateFogColor(targetColor);

            Color startAmbient = RenderSettings.ambientLight;
            Color targetAmbient = CalculateAmbientColor(targetColor);

            float duration = _overrideTransitionDuration ? _transitionDuration : 1.5f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / duration);

                if (_syncFogToTheme)
                {
                    RenderSettings.fogColor = Color.Lerp(startFogColor, targetFogColor, t * _colorInfluence);
                }

                if (_syncLightingToTheme)
                {
                    RenderSettings.ambientLight = Color.Lerp(startAmbient, targetAmbient, t * _colorInfluence);
                }

                yield return null;
            }

            _colorTransitionCoroutine = null;
        }

        private Color CalculateFogColor(Color primaryColor)
        {
            // Darken and desaturate for fog
            Color.RGBToHSV(primaryColor, out float h, out float s, out float v);
            return Color.HSVToRGB(h, s * 0.5f, v * _fogDarkenFactor);
        }

        private Color CalculateAmbientColor(Color primaryColor)
        {
            // Slightly desaturate and dim for ambient
            Color.RGBToHSV(primaryColor, out float h, out float s, out float v);
            return Color.HSVToRGB(h, s * 0.6f, v * 0.4f);
        }

        private void ApplyLightingFromConfig(TerminalVisualConfig config)
        {
            // Get theme primary color and influence ambient lighting
            Color primaryColor = config.textColor;

            // Find all RoomLighting instances and suggest color tint
            var roomLights = FindObjectsByType<RoomLighting>(FindObjectsSortMode.None);
            foreach (var roomLight in roomLights)
            {
                // RoomLighting uses state-based colors, but we can override accent
                // This requires adding a public method to RoomLighting
                // roomLight.SetAccentColorOverride(primaryColor);
            }

            LogDebug($"[ThemeAtmosphereBridge] Applied lighting from config: {config.name}");
        }

        private void ApplyFogFromConfig(TerminalVisualConfig config)
        {
            if (_atmosphere == null) return;

            Color fogColor = CalculateFogColor(config.textColor);

            // Start transition
            if (_colorTransitionCoroutine != null)
            {
                StopCoroutine(_colorTransitionCoroutine);
            }
            _colorTransitionCoroutine = StartCoroutine(TransitionAtmosphereColor(config.textColor));

            LogDebug($"[ThemeAtmosphereBridge] Applied fog from config: {config.name}");
        }

        #endregion

        #region Public API

        /// <summary>
        /// Force immediate sync with current theme
        /// </summary>
        public void ForceSyncNow()
        {
            if (_themeManager == null) return;

            var config = _themeManager.GetCurrentTheme();
            if (config != null)
            {
                HandleThemeApplied(config);
            }
        }

        /// <summary>
        /// Set color influence at runtime
        /// </summary>
        public void SetColorInfluence(float influence)
        {
            _colorInfluence = Mathf.Clamp01(influence);
        }

        /// <summary>
        /// Enable/disable fog sync
        /// </summary>
        public void SetFogSyncEnabled(bool enabled)
        {
            _syncFogToTheme = enabled;
        }

        /// <summary>
        /// Enable/disable lighting sync
        /// </summary>
        public void SetLightingSyncEnabled(bool enabled)
        {
            _syncLightingToTheme = enabled;
        }

        /// <summary>
        /// Trigger a pulse effect across all synced systems
        /// </summary>
        public void TriggerPulse(Color pulseColor, float duration = 0.5f)
        {
            StartCoroutine(PulseEffect(pulseColor, duration));
        }

        private IEnumerator PulseEffect(Color pulseColor, float duration)
        {
            Color originalFog = RenderSettings.fogColor;
            Color originalAmbient = RenderSettings.ambientLight;

            float halfDuration = duration * 0.5f;
            float elapsed = 0f;

            // Fade in
            while (elapsed < halfDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / halfDuration;

                RenderSettings.fogColor = Color.Lerp(originalFog, pulseColor, t);
                RenderSettings.ambientLight = Color.Lerp(originalAmbient, pulseColor, t);

                yield return null;
            }

            elapsed = 0f;

            // Fade out
            while (elapsed < halfDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / halfDuration;

                RenderSettings.fogColor = Color.Lerp(pulseColor, originalFog, t);
                RenderSettings.ambientLight = Color.Lerp(pulseColor, originalAmbient, t);

                yield return null;
            }

            RenderSettings.fogColor = originalFog;
            RenderSettings.ambientLight = originalAmbient;
        }

        /// <summary>
        /// Get debug info for the bridge
        /// </summary>
        public string GetDebugInfo()
        {
            return $"ThemeAtmosphereBridge:\n" +
                   $"  Fog Sync: {_syncFogToTheme}\n" +
                   $"  Lighting Sync: {_syncLightingToTheme}\n" +
                   $"  Audio Sync: {_syncAudioToTheme}\n" +
                   $"  Color Influence: {_colorInfluence:F2}\n" +
                   $"  Last Primary Color: {ColorUtility.ToHtmlStringRGB(_lastPrimaryColor)}\n" +
                   $"  Last Glitch: {_lastGlitchIntensity:F2}\n" +
                   $"  Active Transition: {_colorTransitionCoroutine != null}";
        }

        #endregion

        #region Debug

        private void LogDebug(string message)
        {
            if (_debugLog)
            {
                Debug.Log(message);
            }
        }

        #endregion
    }
}

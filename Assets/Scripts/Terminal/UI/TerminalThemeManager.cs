using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Manages dynamic terminal themes based on game state and Arcana invocations.
    /// Enables seamless transitions between visual styles.
    /// </summary>
    public class TerminalThemeManager : MonoBehaviour
    {
        public static TerminalThemeManager Instance { get; private set; }

        [Header("Configuration")]
        [SerializeField] private TerminalVisualConfig _defaultConfig;
        [SerializeField] private float _transitionDuration = 0.5f;
        [SerializeField] private AnimationCurve _transitionCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        [Header("Arcana Theme Overrides")]
        [SerializeField] private List<ArcanaThemeMapping> _arcanaThemes = new List<ArcanaThemeMapping>();

        [Header("References")]
        [SerializeField] private CrystalCLI _cli;
        [SerializeField] private ScanlineEffect _scanlineEffect;
        [SerializeField] private TerminalFrame _frame;

        public event Action<TerminalVisualConfig> OnThemeChanged;

        private TerminalVisualConfig _currentConfig;
        private TerminalVisualConfig _targetConfig;
        private float _transitionProgress = 1f;
        private bool _isTransitioning = false;

        // Cached interpolated values
        private Color _currentBgColor;
        private Color _currentOutputColor;
        private Color _currentInputColor;
        private Color _currentCursorColor;
        private Color _currentBorderColor;
        private float _currentScanlineAlpha;
        private float _currentGlitchChance;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
                return;
            }

            if (_defaultConfig == null)
            {
                _defaultConfig = Resources.Load<TerminalVisualConfig>("Config/DefaultTerminalVisualConfig");
            }

            _currentConfig = _defaultConfig;
            _targetConfig = _defaultConfig;
        }

        private void Start()
        {
            // Subscribe to Arcana events
            if (ArcanaSystem.Instance != null)
            {
                ArcanaSystem.Instance.OnArcanaInvoked += HandleArcanaInvoked;
                ArcanaSystem.Instance.OnArcanaExpired += HandleArcanaExpired;
            }

            // Find references if not assigned
            if (_cli == null)
            {
                _cli = FindFirstObjectByType<CrystalCLI>();
            }
            if (_scanlineEffect == null)
            {
                _scanlineEffect = FindFirstObjectByType<ScanlineEffect>();
            }
            if (_frame == null)
            {
                _frame = FindFirstObjectByType<TerminalFrame>();
            }

            // Apply initial theme
            if (_currentConfig != null)
            {
                ApplyThemeImmediate(_currentConfig);
            }
        }

        private void Update()
        {
            if (_isTransitioning)
            {
                _transitionProgress += Time.deltaTime / _transitionDuration;
                
                if (_transitionProgress >= 1f)
                {
                    _transitionProgress = 1f;
                    _isTransitioning = false;
                    _currentConfig = _targetConfig;
                    ApplyThemeImmediate(_targetConfig);
                }
                else
                {
                    float t = _transitionCurve.Evaluate(_transitionProgress);
                    ApplyInterpolatedTheme(t);
                }
            }
        }

        private void HandleArcanaInvoked(ArcanaDefinition arcana)
        {
            TerminalVisualConfig arcanaConfig = GetThemeForArcana(arcana);
            if (arcanaConfig != null)
            {
                TransitionToTheme(arcanaConfig);
                
                // Trigger glitch effect on theme change
                if (_scanlineEffect != null)
                {
                    _scanlineEffect.TriggerGlitch();
                }
            }
        }

        private void HandleArcanaExpired(ArcanaDefinition arcana)
        {
            // Return to default theme
            TransitionToTheme(_defaultConfig);
        }

        /// <summary>
        /// Get theme config for a specific Arcana.
        /// Returns null if no mapping exists.
        /// </summary>
        public TerminalVisualConfig GetThemeForArcana(ArcanaDefinition arcana)
        {
            if (arcana == null) return null;

            // Check mapped themes
            foreach (var mapping in _arcanaThemes)
            {
                if (mapping.arcanaId == arcana.id && mapping.config != null)
                {
                    return mapping.config;
                }
            }

            // Generate dynamic theme from Arcana colors if no mapping
            if (_defaultConfig != null)
            {
                return CreateDynamicThemeFromArcana(arcana);
            }

            return null;
        }

        /// <summary>
        /// Create a runtime theme based on Arcana definition colors.
        /// </summary>
        private TerminalVisualConfig CreateDynamicThemeFromArcana(ArcanaDefinition arcana)
        {
            TerminalVisualConfig dynamicConfig = ScriptableObject.CreateInstance<TerminalVisualConfig>();
            
            // Copy base values from default
            dynamicConfig.backgroundColor = _defaultConfig.backgroundColor;
            dynamicConfig.inputColor = _defaultConfig.inputColor;
            dynamicConfig.fontSize = _defaultConfig.fontSize;
            dynamicConfig.font = _defaultConfig.font;
            dynamicConfig.lineSpacing = _defaultConfig.lineSpacing;
            dynamicConfig.padding = _defaultConfig.padding;
            dynamicConfig.typewriterSpeed = _defaultConfig.typewriterSpeed;
            dynamicConfig.glitchChars = _defaultConfig.glitchChars;
            dynamicConfig.enableScanlines = _defaultConfig.enableScanlines;
            dynamicConfig.scanlineAlpha = _defaultConfig.scanlineAlpha;
            dynamicConfig.scanlineSpeed = _defaultConfig.scanlineSpeed;
            dynamicConfig.showBorder = _defaultConfig.showBorder;
            dynamicConfig.borderWidth = _defaultConfig.borderWidth;

            // Apply Arcana color
            Color arcanaColor = arcana.effects.GetColor();
            dynamicConfig.outputColor = arcanaColor;
            dynamicConfig.cursorColor = arcanaColor;
            dynamicConfig.borderColor = arcanaColor * 0.6f;
            dynamicConfig.arcanaColor = arcanaColor;

            // Apply response modifiers
            if (arcana.responseModifiers != null)
            {
                dynamicConfig.glitchChance = _defaultConfig.glitchChance * arcana.responseModifiers.glitchMultiplier;
                dynamicConfig.typewriterSpeed = _defaultConfig.typewriterSpeed / arcana.responseModifiers.typeSpeedMultiplier;
            }

            return dynamicConfig;
        }

        /// <summary>
        /// Smoothly transition to a new theme.
        /// </summary>
        public void TransitionToTheme(TerminalVisualConfig newConfig)
        {
            if (newConfig == null) return;

            // Cache current interpolated values as starting point
            if (_currentConfig != null)
            {
                _currentBgColor = _currentConfig.backgroundColor;
                _currentOutputColor = _currentConfig.outputColor;
                _currentInputColor = _currentConfig.inputColor;
                _currentCursorColor = _currentConfig.cursorColor;
                _currentBorderColor = _currentConfig.borderColor;
                _currentScanlineAlpha = _currentConfig.scanlineAlpha;
                _currentGlitchChance = _currentConfig.glitchChance;
            }

            _targetConfig = newConfig;
            _transitionProgress = 0f;
            _isTransitioning = true;

            Debug.Log($"[TerminalThemeManager] Transitioning to theme: {newConfig.name}");
        }

        /// <summary>
        /// Apply theme immediately without transition.
        /// </summary>
        public void ApplyThemeImmediate(TerminalVisualConfig config)
        {
            if (config == null) return;

            _currentConfig = config;
            _targetConfig = config;
            _isTransitioning = false;
            _transitionProgress = 1f;

            // Apply to CLI
            // Note: CrystalCLI will need a public method to accept runtime config changes
            
            // Apply to scanline effect
            if (_scanlineEffect != null)
            {
                _scanlineEffect.ApplyConfig(config);
            }

            // Apply to frame
            if (_frame != null)
            {
                _frame.ApplyConfig(config);
            }

            OnThemeChanged?.Invoke(config);
        }

        private void ApplyInterpolatedTheme(float t)
        {
            if (_currentConfig == null || _targetConfig == null) return;

            // Interpolate colors
            Color bgColor = Color.Lerp(_currentBgColor, _targetConfig.backgroundColor, t);
            Color outputColor = Color.Lerp(_currentOutputColor, _targetConfig.outputColor, t);
            Color cursorColor = Color.Lerp(_currentCursorColor, _targetConfig.cursorColor, t);
            Color borderColor = Color.Lerp(_currentBorderColor, _targetConfig.borderColor, t);
            
            float scanlineAlpha = Mathf.Lerp(_currentScanlineAlpha, _targetConfig.scanlineAlpha, t);

            // Apply interpolated values
            if (_scanlineEffect != null)
            {
                _scanlineEffect.SetAlpha(scanlineAlpha);
            }

            if (_frame != null)
            {
                _frame.SetBorderColor(borderColor);
            }

            // Note: Full color application to text elements would require
            // exposing more methods on CrystalCLI for runtime color changes
        }

        /// <summary>
        /// Reset to default theme.
        /// </summary>
        public void ResetToDefault()
        {
            TransitionToTheme(_defaultConfig);
        }

        /// <summary>
        /// Get current active theme.
        /// </summary>
        public TerminalVisualConfig GetCurrentTheme()
        {
            return _isTransitioning ? _targetConfig : _currentConfig;
        }

        private void OnDestroy()
        {
            if (ArcanaSystem.Instance != null)
            {
                ArcanaSystem.Instance.OnArcanaInvoked -= HandleArcanaInvoked;
                ArcanaSystem.Instance.OnArcanaExpired -= HandleArcanaExpired;
            }

            if (Instance == this)
            {
                Instance = null;
            }
        }
    }

    /// <summary>
    /// Maps an Arcana ID to a specific visual theme.
    /// </summary>
    [Serializable]
    public class ArcanaThemeMapping
    {
        [Tooltip("Arcana ID from arcana.json")]
        public int arcanaId;
        
        [Tooltip("Theme to apply when this Arcana is invoked")]
        public TerminalVisualConfig config;
    }
}

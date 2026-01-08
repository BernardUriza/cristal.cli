using UnityEngine;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Debug UI panel for visual QA.
    /// Shows theme state, allows runtime adjustments.
    /// Toggle with F12 or configurable key.
    /// </summary>
    public class ThemeDebugPanel : MonoBehaviour
    {
        [Header("Toggle")]
        [SerializeField] private KeyCode _toggleKey = KeyCode.F12;
        [SerializeField] private bool _startVisible = false;

        [Header("Panel Settings")]
        [SerializeField] private Rect _panelRect = new Rect(10, 10, 350, 500);
        [SerializeField] private bool _draggable = true;

        // State
        private bool _isVisible;
        private Vector2 _scrollPosition;
        private string _themeNameInput = "";
        private float _glitchSlider = 0f;
        private float _scanlineSlider = 0.3f;
        private int _selectedStateIndex = 0;
        private int _selectedArcanaIndex = 0;

        // Cached refs
        private TerminalThemeManager _themeManager;
        private ScanlineEffect _scanlineEffect;
        private ThemeAtmosphereBridge _atmosphereBridge;

        // State names
        private readonly string[] _stateNames = new[]
        {
            "Waiting", "Processing", "Remembering", "Corrupted", "Echo", "UNBOUND"
        };

        private readonly CristalState[] _stateValues = new[]
        {
            CristalState.Waiting,
            CristalState.Processing,
            CristalState.Remembering,
            CristalState.Corrupted,
            CristalState.Echo,
            CristalState.UNBOUND
        };

        // Arcana names (subset for testing)
        private readonly string[] _arcanaNames = new[]
        {
            "None", "TheFool", "TheMagician", "TheHighPriestess", "TheEmpress",
            "TheEmperor", "TheHierophant", "TheLovers", "TheChariot"
        };

        private readonly ArcanaType[] _arcanaValues = new[]
        {
            ArcanaType.None,
            ArcanaType.TheFool,
            ArcanaType.TheMagician,
            ArcanaType.TheHighPriestess,
            ArcanaType.TheEmpress,
            ArcanaType.TheEmperor,
            ArcanaType.TheHierophant,
            ArcanaType.TheLovers,
            ArcanaType.TheChariot
        };

        private GUIStyle _headerStyle;
        private GUIStyle _valueStyle;
        private GUIStyle _buttonStyle;
        private bool _stylesInitialized;

        #region Unity Lifecycle

        private void Start()
        {
            _isVisible = _startVisible;
            _themeManager = TerminalThemeManager.Instance;
            _scanlineEffect = FindFirstObjectByType<ScanlineEffect>();
            _atmosphereBridge = ThemeAtmosphereBridge.Instance;
        }

        private void Update()
        {
            if (Input.GetKeyDown(_toggleKey))
            {
                _isVisible = !_isVisible;
            }
        }

        private void OnGUI()
        {
            if (!_isVisible) return;

            InitializeStyles();

            _panelRect = GUI.Window(12345, _panelRect, DrawPanel, "Theme Debug Panel");
        }

        #endregion

        #region GUI

        private void InitializeStyles()
        {
            if (_stylesInitialized) return;

            _headerStyle = new GUIStyle(GUI.skin.label)
            {
                fontStyle = FontStyle.Bold,
                fontSize = 14,
                normal = { textColor = new Color(0.9f, 0.7f, 1f) }
            };

            _valueStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 11,
                normal = { textColor = new Color(0.7f, 1f, 0.7f) }
            };

            _buttonStyle = new GUIStyle(GUI.skin.button)
            {
                fontSize = 11
            };

            _stylesInitialized = true;
        }

        private void DrawPanel(int windowId)
        {
            _scrollPosition = GUILayout.BeginScrollView(_scrollPosition);

            // Current State Section
            DrawSection("Current State", () =>
            {
                var sm = TerminalStateMachine.Instance;
                if (sm != null)
                {
                    GUILayout.Label($"State: {sm.CurrentState}", _valueStyle);
                    GUILayout.Label($"Previous: {sm.PreviousState}", _valueStyle);
                }
                else
                {
                    GUILayout.Label("StateMachine not found", _valueStyle);
                }

                // State selector
                GUILayout.Space(5);
                GUILayout.Label("Force State:", _valueStyle);
                _selectedStateIndex = GUILayout.SelectionGrid(_selectedStateIndex, _stateNames, 3, _buttonStyle);

                if (GUILayout.Button("Apply State", _buttonStyle))
                {
                    ForceState(_stateValues[_selectedStateIndex]);
                }
            });

            // Theme Section
            DrawSection("Theme Manager", () =>
            {
                if (_themeManager != null)
                {
                    GUILayout.Label($"Transitioning: {_themeManager.IsTransitioning}", _valueStyle);
                    GUILayout.Label($"Last Theme: {_themeManager.LastAppliedThemeName}", _valueStyle);

                    // Theme name input
                    GUILayout.Space(5);
                    GUILayout.Label("Apply Theme:", _valueStyle);
                    GUILayout.BeginHorizontal();
                    _themeNameInput = GUILayout.TextField(_themeNameInput, GUILayout.Width(150));
                    if (GUILayout.Button("Apply", _buttonStyle, GUILayout.Width(60)))
                    {
                        if (!string.IsNullOrEmpty(_themeNameInput))
                        {
                            _themeManager.ApplyThemeByName(_themeNameInput);
                        }
                    }
                    GUILayout.EndHorizontal();

                    // Available themes
                    GUILayout.Space(5);
                    GUILayout.Label("Quick Themes:", _valueStyle);
                    GUILayout.BeginHorizontal();
                    if (GUILayout.Button("default", _buttonStyle)) _themeManager.ApplyThemeByName("default");
                    if (GUILayout.Button("corrupted", _buttonStyle)) _themeManager.ApplyThemeByName("corrupted");
                    if (GUILayout.Button("unbound", _buttonStyle)) _themeManager.ApplyThemeByName("unbound");
                    GUILayout.EndHorizontal();
                }
                else
                {
                    GUILayout.Label("ThemeManager not found", _valueStyle);
                }
            });

            // Arcana Section
            DrawSection("Arcana", () =>
            {
                var registry = ArcanaRegistry.Instance;
                if (registry != null)
                {
                    var active = registry.GetActiveArcana();
                    GUILayout.Label($"Active: {(active != null ? active.Type.ToString() : "None")}", _valueStyle);

                    GUILayout.Space(5);
                    GUILayout.Label("Invoke Arcana:", _valueStyle);
                    _selectedArcanaIndex = GUILayout.SelectionGrid(_selectedArcanaIndex, _arcanaNames, 3, _buttonStyle);

                    if (GUILayout.Button("Invoke", _buttonStyle))
                    {
                        InvokeArcana(_arcanaValues[_selectedArcanaIndex]);
                    }
                }
                else
                {
                    GUILayout.Label("ArcanaRegistry not found", _valueStyle);
                }
            });

            // Scanline Effect Section
            DrawSection("Visual Effects", () =>
            {
                if (_scanlineEffect != null)
                {
                    GUILayout.Label($"Mode: {_scanlineEffect.CurrentMode}", _valueStyle);
                    GUILayout.Label($"Intensity: {_scanlineEffect.CurrentIntensity:F2}", _valueStyle);

                    // Scanline slider
                    GUILayout.Space(5);
                    GUILayout.Label("Scanline Alpha:", _valueStyle);
                    float newScanline = GUILayout.HorizontalSlider(_scanlineSlider, 0f, 1f);
                    if (!Mathf.Approximately(newScanline, _scanlineSlider))
                    {
                        _scanlineSlider = newScanline;
                        _scanlineEffect.SetIntensity(_scanlineSlider);
                    }
                    GUILayout.Label($"{_scanlineSlider:F2}", _valueStyle);

                    // Glitch slider
                    GUILayout.Space(5);
                    GUILayout.Label("Glitch Intensity:", _valueStyle);
                    float newGlitch = GUILayout.HorizontalSlider(_glitchSlider, 0f, 1f);
                    if (!Mathf.Approximately(newGlitch, _glitchSlider))
                    {
                        _glitchSlider = newGlitch;
                        _themeManager?.SetGlitchIntensity(_glitchSlider);
                    }
                    GUILayout.Label($"{_glitchSlider:F2}", _valueStyle);

                    // Effect buttons
                    GUILayout.Space(5);
                    GUILayout.BeginHorizontal();
                    if (GUILayout.Button("Glitch Pulse", _buttonStyle))
                    {
                        _scanlineEffect.TriggerGlitch(0.5f);
                    }
                    if (GUILayout.Button("Mode: Simple", _buttonStyle))
                    {
                        _scanlineEffect.SetMode(ScanlineEffect.EffectMode.Simple);
                    }
                    if (GUILayout.Button("Mode: Advanced", _buttonStyle))
                    {
                        _scanlineEffect.SetMode(ScanlineEffect.EffectMode.Advanced);
                    }
                    GUILayout.EndHorizontal();
                }
                else
                {
                    GUILayout.Label("ScanlineEffect not found", _valueStyle);
                }
            });

            // Atmosphere Bridge Section
            DrawSection("Atmosphere Bridge", () =>
            {
                if (_atmosphereBridge != null)
                {
                    GUILayout.Label(_atmosphereBridge.GetDebugInfo(), _valueStyle);

                    GUILayout.Space(5);
                    if (GUILayout.Button("Force Sync Now", _buttonStyle))
                    {
                        _atmosphereBridge.ForceSyncNow();
                    }

                    GUILayout.BeginHorizontal();
                    if (GUILayout.Button("Pulse Red", _buttonStyle))
                    {
                        _atmosphereBridge.TriggerPulse(Color.red, 1f);
                    }
                    if (GUILayout.Button("Pulse Cyan", _buttonStyle))
                    {
                        _atmosphereBridge.TriggerPulse(Color.cyan, 1f);
                    }
                    if (GUILayout.Button("Pulse Magenta", _buttonStyle))
                    {
                        _atmosphereBridge.TriggerPulse(Color.magenta, 1f);
                    }
                    GUILayout.EndHorizontal();
                }
                else
                {
                    GUILayout.Label("ThemeAtmosphereBridge not found", _valueStyle);
                }
            });

            // Render Settings
            DrawSection("Render Settings", () =>
            {
                GUILayout.Label($"Fog: {RenderSettings.fog}", _valueStyle);
                GUILayout.Label($"Fog Color: {ColorToHex(RenderSettings.fogColor)}", _valueStyle);
                GUILayout.Label($"Fog Density: {RenderSettings.fogDensity:F4}", _valueStyle);
                GUILayout.Label($"Ambient: {ColorToHex(RenderSettings.ambientLight)}", _valueStyle);
            });

            GUILayout.EndScrollView();

            // Make window draggable
            if (_draggable)
            {
                GUI.DragWindow(new Rect(0, 0, _panelRect.width, 20));
            }
        }

        private void DrawSection(string title, System.Action content)
        {
            GUILayout.Space(10);
            GUILayout.Label(title, _headerStyle);
            GUILayout.Box("", GUILayout.ExpandWidth(true), GUILayout.Height(1));
            content?.Invoke();
        }

        private string ColorToHex(Color c)
        {
            return $"#{ColorUtility.ToHtmlStringRGB(c)}";
        }

        #endregion

        #region Actions

        private void ForceState(CristalState state)
        {
            var sm = TerminalStateMachine.Instance;
            if (sm != null)
            {
                sm.TransitionTo(state);
                Debug.Log($"[ThemeDebugPanel] Forced state: {state}");
            }
        }

        private void InvokeArcana(ArcanaType type)
        {
            var registry = ArcanaRegistry.Instance;
            if (registry != null && type != ArcanaType.None)
            {
                var arcana = registry.GetArcana(type);
                if (arcana != null)
                {
                    arcana.Invoke();
                    Debug.Log($"[ThemeDebugPanel] Invoked arcana: {type}");
                }
            }
        }

        #endregion
    }
}

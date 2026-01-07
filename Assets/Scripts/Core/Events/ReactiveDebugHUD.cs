using System.Collections.Generic;
using System.Linq;
using System.Text;
using UnityEngine;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Core.Events
{
    /// <summary>
    /// Debug HUD overlay for monitoring ReactiveSystemBus events.
    /// Shows real-time event flow, statistics, and system state.
    /// 
    /// Toggle with F10 key (configurable).
    /// </summary>
    public class ReactiveDebugHUD : MonoBehaviour
    {
        [Header("Display Settings")]
        [SerializeField] private KeyCode _toggleKey = KeyCode.F10;
        [SerializeField] private bool _showOnStart = false;
        [SerializeField] private int _maxVisibleEvents = 15;
        [SerializeField] private float _eventDisplayDuration = 3f;

        [Header("Appearance")]
        [SerializeField] private Color _backgroundColor = new Color(0, 0, 0, 0.85f);
        [SerializeField] private Color _headerColor = new Color(0.6f, 1f, 0.6f);
        [SerializeField] private Color _eventColor = new Color(0.8f, 0.8f, 0.8f);
        [SerializeField] private Color _highlightColor = new Color(1f, 0.8f, 0.2f);
        [SerializeField] private Color _errorColor = new Color(1f, 0.3f, 0.3f);

        [Header("Layout")]
        [SerializeField] private float _panelWidth = 400f;
        [SerializeField] private float _panelHeight = 500f;
        [SerializeField] private float _margin = 10f;

        // Display state
        private bool _isVisible;
        private Vector2 _scrollPosition;
        private List<EventDisplayEntry> _recentEvents = new();
        private GUIStyle _boxStyle;
        private GUIStyle _labelStyle;
        private GUIStyle _headerStyle;
        private GUIStyle _eventStyle;
        private bool _stylesInitialized;

        // Statistics cache
        private Dictionary<SymbolicSignalType, int> _cachedCounts;
        private float _lastStatsUpdate;
        private const float STATS_UPDATE_INTERVAL = 0.5f;

        private struct EventDisplayEntry
        {
            public SymbolicEvent Event;
            public float DisplayUntil;
            public bool IsNew;
        }

        #region Unity Lifecycle

        private void Awake()
        {
            _isVisible = _showOnStart;
        }

        private void OnEnable()
        {
            // Subscribe to all events for display
            ReactiveSystemBus.SubscribeAll(OnAnyEvent);
        }

        private void OnDisable()
        {
            ReactiveSystemBus.UnsubscribeAll(OnAnyEvent);
        }

        private void Update()
        {
            // Toggle visibility
            if (Input.GetKeyDown(_toggleKey))
            {
                _isVisible = !_isVisible;
            }

            // Clean up expired events
            float currentTime = Time.time;
            _recentEvents.RemoveAll(e => e.DisplayUntil < currentTime);

            // Mark events as not new after a short delay
            for (int i = 0; i < _recentEvents.Count; i++)
            {
                var entry = _recentEvents[i];
                if (entry.IsNew && currentTime - entry.Event.Timestamp > 0.1f)
                {
                    entry.IsNew = false;
                    _recentEvents[i] = entry;
                }
            }

            // Update stats cache
            if (currentTime - _lastStatsUpdate > STATS_UPDATE_INTERVAL)
            {
                _cachedCounts = new Dictionary<SymbolicSignalType, int>(ReactiveSystemBus.GetAllEventCounts());
                _lastStatsUpdate = currentTime;
            }
        }

        private void OnGUI()
        {
            if (!_isVisible) return;

            InitializeStyles();

            // Main panel
            Rect panelRect = new Rect(
                Screen.width - _panelWidth - _margin,
                _margin,
                _panelWidth,
                _panelHeight
            );

            GUI.Box(panelRect, "", _boxStyle);

            GUILayout.BeginArea(new Rect(panelRect.x + 10, panelRect.y + 10, panelRect.width - 20, panelRect.height - 20));

            DrawHeader();
            DrawStatistics();
            DrawEventLog();

            GUILayout.EndArea();
        }

        #endregion

        #region Event Handling

        private void OnAnyEvent(in SymbolicEvent evt)
        {
            // Add to display list
            _recentEvents.Insert(0, new EventDisplayEntry
            {
                Event = evt,
                DisplayUntil = Time.time + _eventDisplayDuration,
                IsNew = true
            });

            // Trim to max size
            while (_recentEvents.Count > _maxVisibleEvents * 2)
            {
                _recentEvents.RemoveAt(_recentEvents.Count - 1);
            }
        }

        #endregion

        #region Drawing

        private void InitializeStyles()
        {
            if (_stylesInitialized) return;

            _boxStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = MakeTex(2, 2, _backgroundColor) }
            };

            _labelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                normal = { textColor = _eventColor },
                wordWrap = false
            };

            _headerStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                normal = { textColor = _headerColor }
            };

            _eventStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 11,
                normal = { textColor = _eventColor },
                wordWrap = true,
                richText = true
            };

            _stylesInitialized = true;
        }

        private void DrawHeader()
        {
            GUILayout.Label("◈ REACTIVE SYSTEM BUS", _headerStyle);
            GUILayout.Label($"Press {_toggleKey} to toggle", _labelStyle);
            GUILayout.Space(5);

            // Current state
            var stateMachine = ServiceLocator.TryGet<StateMachine.TerminalStateMachine>();
            string currentState = stateMachine?.CurrentStateId.ToString() ?? "Unknown";
            GUILayout.Label($"State: <color=#{ColorToHex(_highlightColor)}>{currentState}</color>", _eventStyle);

            GUILayout.Space(10);
        }

        private void DrawStatistics()
        {
            GUILayout.Label("─── Statistics ───", _headerStyle);

            int totalEvents = ReactiveSystemBus.TotalEventsPublished;
            int totalSubscribers = ReactiveSystemBus.GetTotalSubscriberCount();

            GUILayout.Label($"Total Events: {totalEvents}", _labelStyle);
            GUILayout.Label($"Active Subscribers: {totalSubscribers}", _labelStyle);

            // Top 5 event types
            if (_cachedCounts != null && _cachedCounts.Count > 0)
            {
                GUILayout.Space(5);
                GUILayout.Label("Top Event Types:", _labelStyle);

                var topEvents = _cachedCounts
                    .OrderByDescending(kvp => kvp.Value)
                    .Take(5);

                foreach (var kvp in topEvents)
                {
                    GUILayout.Label($"  {kvp.Key}: {kvp.Value}", _labelStyle);
                }
            }

            GUILayout.Space(10);
        }

        private void DrawEventLog()
        {
            GUILayout.Label("─── Recent Events ───", _headerStyle);

            _scrollPosition = GUILayout.BeginScrollView(_scrollPosition, GUILayout.Height(250));

            int displayed = 0;
            foreach (var entry in _recentEvents)
            {
                if (displayed >= _maxVisibleEvents) break;

                DrawEventEntry(entry);
                displayed++;
            }

            if (_recentEvents.Count == 0)
            {
                GUILayout.Label("No events yet...", _labelStyle);
            }

            GUILayout.EndScrollView();
        }

        private void DrawEventEntry(EventDisplayEntry entry)
        {
            var evt = entry.Event;

            // Color based on signal type
            string signalColor = GetSignalColor(evt.Signal);
            string intensityBar = GetIntensityBar(evt.Intensity);

            StringBuilder sb = new StringBuilder();

            if (entry.IsNew)
            {
                sb.Append("<color=#FFD700>► </color>");
            }
            else
            {
                sb.Append("  ");
            }

            sb.Append($"<color=#{signalColor}>{evt.Signal}</color>");
            sb.Append($" [{evt.SourceState}]");
            sb.Append($" {intensityBar}");

            if (!string.IsNullOrEmpty(evt.Source) && evt.Source != "Unknown")
            {
                sb.Append($" <color=#888888>({evt.Source})</color>");
            }

            GUILayout.Label(sb.ToString(), _eventStyle);
        }

        private string GetSignalColor(SymbolicSignalType signal)
        {
            return signal switch
            {
                SymbolicSignalType.StateTransition => "99FF99",
                SymbolicSignalType.UnboundTriggered => "FF00FF",
                SymbolicSignalType.UnboundEnded => "CC66FF",
                SymbolicSignalType.GlitchTriggered => "FF6600",
                SymbolicSignalType.CorruptionSpike => "FF3333",
                SymbolicSignalType.ErrorOccurred => "FF0000",
                SymbolicSignalType.ArcanaUnlocked => "FFD700",
                SymbolicSignalType.ArcanaInvoked => "FFAA00",
                SymbolicSignalType.MemoryRecovered => "66CCFF",
                SymbolicSignalType.RitualComplete => "FF66FF",
                _ => "CCCCCC"
            };
        }

        private string GetIntensityBar(int intensity)
        {
            int filled = intensity / 10;
            int empty = 10 - filled;

            return $"<color=#666666>[</color>" +
                   $"<color=#99FF99>{new string('█', filled)}</color>" +
                   $"<color=#333333>{new string('░', empty)}</color>" +
                   $"<color=#666666>]</color>";
        }

        private string ColorToHex(Color color)
        {
            return ColorUtility.ToHtmlStringRGB(color);
        }

        private Texture2D MakeTex(int width, int height, Color color)
        {
            Color[] pixels = new Color[width * height];
            for (int i = 0; i < pixels.Length; i++)
            {
                pixels[i] = color;
            }

            Texture2D tex = new Texture2D(width, height);
            tex.SetPixels(pixels);
            tex.Apply();
            return tex;
        }

        #endregion
    }
}

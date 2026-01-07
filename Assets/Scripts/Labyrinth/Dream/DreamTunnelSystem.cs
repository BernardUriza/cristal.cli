using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Arcana;
using Cristal.CLI.Memory;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Labyrinth.Dream
{
    /// <summary>
    /// Core system for managing dream tunnels - alternate reality spaces
    /// accessible through specific Arcana or emotional thresholds.
    /// </summary>
    public class DreamTunnelSystem : MonoBehaviour
    {
        public static DreamTunnelSystem Instance { get; private set; }

        [Header("Dream Configuration")]
        [SerializeField] private int[] _dreamTriggerArcana = { 18, 2, 12 }; // Moon, High Priestess, Hanged Man
        [SerializeField] private float _emotionalThreshold = 0.7f;
        [SerializeField] private float _dreamDurationMin = 60f;
        [SerializeField] private float _dreamDurationMax = 180f;

        [Header("Tunnel Settings")]
        [SerializeField] private int _maxActiveTunnels = 3;
        [SerializeField] private Vector3 _tunnelSpawnOffset = new Vector3(0, -50f, 0);

        [Header("Entry/Exit")]
        [SerializeField] private float _entryFadeDuration = 2f;
        [SerializeField] private float _exitFadeDuration = 1.5f;
        [SerializeField] private AnimationCurve _fadeInCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
        [SerializeField] private AnimationCurve _fadeOutCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        [Header("Audio")]
        [SerializeField] private AudioClip _dreamEntrySound;
        [SerializeField] private AudioClip _dreamExitSound;
        [SerializeField] private AudioClip _dreamAmbientLoop;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<DreamTunnel> OnDreamEntered;
        public event Action<DreamTunnel> OnDreamExited;
        public event Action<DreamTunnel> OnDreamCreated;
        public event Action<DreamTunnel> OnDreamDestroyed;
        public event Action<DreamNarrativeFragment> OnNarrativeFragment;

        // State
        private List<DreamTunnel> _activeTunnels = new List<DreamTunnel>();
        private DreamTunnel _currentDream;
        private bool _isInDream;
        private float _dreamStartTime;
        private Vector3 _realWorldPosition;
        private Quaternion _realWorldRotation;
        private Transform _playerTransform;
        private AudioSource _dreamAudioSource;

        // Properties
        public bool IsInDream => _isInDream;
        public DreamTunnel CurrentDream => _currentDream;
        public IReadOnlyList<DreamTunnel> ActiveTunnels => _activeTunnels;

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            InitializeAudio();
        }

        private void Start()
        {
            // Find player
            var player = GameObject.FindGameObjectWithTag("Player");
            if (player != null)
            {
                _playerTransform = player.transform;
            }

            // Subscribe to events
            var arcanaSystem = ArcanaSystem.Instance;
            if (arcanaSystem != null)
            {
                arcanaSystem.OnArcanaInvoked += HandleArcanaInvoked;
                arcanaSystem.OnArcanaExpired += HandleArcanaExpired;
            }

            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
            }
        }

        private void Update()
        {
            if (_isInDream)
            {
                UpdateDreamState();
            }

            // Check emotional threshold
            CheckEmotionalTrigger();
        }

        private void OnDestroy()
        {
            var arcanaSystem = ArcanaSystem.Instance;
            if (arcanaSystem != null)
            {
                arcanaSystem.OnArcanaInvoked -= HandleArcanaInvoked;
                arcanaSystem.OnArcanaExpired -= HandleArcanaExpired;
            }

            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                ritualSystem.OnUnboundTriggered -= HandleUnboundTriggered;
            }

            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Initialization

        private void InitializeAudio()
        {
            _dreamAudioSource = gameObject.AddComponent<AudioSource>();
            _dreamAudioSource.playOnAwake = false;
            _dreamAudioSource.loop = true;
            _dreamAudioSource.spatialBlend = 0f;
            _dreamAudioSource.volume = 0f;
        }

        #endregion

        #region Dream Triggers

        private void HandleArcanaInvoked(ArcanaDefinition arcana)
        {
            // Check if this arcana triggers dream access
            if (System.Array.IndexOf(_dreamTriggerArcana, arcana.id) >= 0)
            {
                if (_debugMode)
                {
                    Debug.Log($"[DreamTunnelSystem] Dream-triggering arcana invoked: {arcana.name}");
                }

                // Create a dream tunnel based on the arcana
                CreateDreamFromArcana(arcana);
            }
        }

        private void HandleArcanaExpired(ArcanaDefinition arcana)
        {
            // If we're in a dream triggered by this arcana, start fade out
            if (_isInDream && _currentDream?.SourceArcanaId == arcana.id)
            {
                StartCoroutine(WakeFromDream(DreamExitReason.ArcanaExpired));
            }
        }

        private void HandleUnboundTriggered()
        {
            // UNBOUND creates the ultimate dream tunnel
            CreateUnboundDream();
        }

        private void CheckEmotionalTrigger()
        {
            if (_isInDream) return;

            var memory = CristalMemory.Instance;
            if (memory?.Data == null) return;

            float emotionalLevel = Mathf.Abs(memory.GetEmotionalAverage());
            if (emotionalLevel >= _emotionalThreshold)
            {
                // Random chance based on emotional intensity
                if (UnityEngine.Random.value < 0.001f) // Very rare
                {
                    CreateEmotionalDream(memory.Data);
                }
            }
        }

        #endregion

        #region Dream Creation

        /// <summary>
        /// Create a dream tunnel based on an invoked arcana.
        /// </summary>
        public void CreateDreamFromArcana(ArcanaDefinition arcana)
        {
            if (_activeTunnels.Count >= _maxActiveTunnels)
            {
                if (_debugMode)
                {
                    Debug.Log("[DreamTunnelSystem] Max tunnels reached, destroying oldest");
                }
                DestroyOldestTunnel();
            }

            var config = GenerateDreamConfig(DreamTriggerType.Arcana, arcana.id);
            config.themeName = $"Dream of {arcana.name}";
            config.primaryColor = arcana.effects.GetColor();
            config.symbolism = arcana.description;

            var tunnel = DreamRoomBuilder.CreateDreamTunnel(config, GetTunnelSpawnPosition());
            RegisterTunnel(tunnel);

            if (_debugMode)
            {
                Debug.Log($"[DreamTunnelSystem] Created arcana dream: {config.themeName}");
            }
        }

        /// <summary>
        /// Create a dream from emotional state.
        /// </summary>
        private void CreateEmotionalDream(CristalMemoryData memory)
        {
            var config = GenerateDreamConfig(DreamTriggerType.Emotional, -1);
            config.themeName = $"Dream of {memory.stateFlags.dominantEmotion}";
            config.emotionalWeight = memory.GetEmotionalWeight();

            // Color based on emotion
            config.primaryColor = GetEmotionColor(memory.stateFlags.dominantEmotion);

            var tunnel = DreamRoomBuilder.CreateDreamTunnel(config, GetTunnelSpawnPosition());
            RegisterTunnel(tunnel);

            if (_debugMode)
            {
                Debug.Log($"[DreamTunnelSystem] Created emotional dream: {config.themeName}");
            }
        }

        /// <summary>
        /// Create the ultimate UNBOUND dream.
        /// </summary>
        private void CreateUnboundDream()
        {
            var config = GenerateDreamConfig(DreamTriggerType.Unbound, 0);
            config.themeName = "THE UNBINDING";
            config.primaryColor = new Color(0.8f, 0.1f, 1f);
            config.secondaryColor = Color.black;
            config.isUnbound = true;
            config.duration = 300f; // 5 minutes
            config.fogDensity = 0.01f;
            config.distortionIntensity = 0.3f;

            var tunnel = DreamRoomBuilder.CreateDreamTunnel(config, GetTunnelSpawnPosition());
            RegisterTunnel(tunnel);

            // Auto-enter unbound dream
            StartCoroutine(EnterDream(tunnel));
        }

        private DreamConfig GenerateDreamConfig(DreamTriggerType triggerType, int sourceId)
        {
            return new DreamConfig
            {
                triggerType = triggerType,
                sourceId = sourceId,
                duration = UnityEngine.Random.Range(_dreamDurationMin, _dreamDurationMax),
                roomCount = UnityEngine.Random.Range(3, 7),
                fogDensity = UnityEngine.Random.Range(0.02f, 0.06f),
                distortionIntensity = UnityEngine.Random.Range(0.05f, 0.15f),
                timeScale = UnityEngine.Random.Range(0.7f, 1.3f),
                narrativeFragments = GenerateNarrativeFragments()
            };
        }

        private List<string> GenerateNarrativeFragments()
        {
            // Base fragments - AI will enhance these
            return new List<string>
            {
                "you were here before",
                "the mirror remembers",
                "time bends around truth",
                "do not wake",
                "the door was always open",
                "who are you when no one watches"
            };
        }

        private Vector3 GetTunnelSpawnPosition()
        {
            return _tunnelSpawnOffset + new Vector3(
                _activeTunnels.Count * 100f, 0, 0
            );
        }

        private void RegisterTunnel(DreamTunnel tunnel)
        {
            if (tunnel == null) return;

            _activeTunnels.Add(tunnel);
            tunnel.OnPlayerEntered += HandlePlayerEnteredTunnel;
            tunnel.OnPlayerExited += HandlePlayerExitedTunnel;
            tunnel.OnNarrativeTriggered += HandleNarrativeTriggered;

            OnDreamCreated?.Invoke(tunnel);
        }

        private void DestroyOldestTunnel()
        {
            if (_activeTunnels.Count == 0) return;

            var oldest = _activeTunnels[0];
            if (_currentDream == oldest)
            {
                StartCoroutine(WakeFromDream(DreamExitReason.Forced));
            }

            UnregisterTunnel(oldest);
            Destroy(oldest.gameObject);
        }

        private void UnregisterTunnel(DreamTunnel tunnel)
        {
            if (tunnel == null) return;

            tunnel.OnPlayerEntered -= HandlePlayerEnteredTunnel;
            tunnel.OnPlayerExited -= HandlePlayerExitedTunnel;
            tunnel.OnNarrativeTriggered -= HandleNarrativeTriggered;

            _activeTunnels.Remove(tunnel);
            OnDreamDestroyed?.Invoke(tunnel);
        }

        #endregion

        #region Dream Entry/Exit

        /// <summary>
        /// Enter a dream tunnel.
        /// </summary>
        public IEnumerator EnterDream(DreamTunnel tunnel)
        {
            if (_isInDream || tunnel == null) yield break;

            if (_debugMode)
            {
                Debug.Log($"[DreamTunnelSystem] Entering dream: {tunnel.Config.themeName}");
            }

            _isInDream = true;
            _currentDream = tunnel;
            _dreamStartTime = Time.time;

            // Store real world position
            if (_playerTransform != null)
            {
                _realWorldPosition = _playerTransform.position;
                _realWorldRotation = _playerTransform.rotation;
            }

            // Play entry sound
            if (_dreamEntrySound != null)
            {
                AudioSource.PlayClipAtPoint(_dreamEntrySound, _playerTransform?.position ?? Vector3.zero);
            }

            // Fade to dream
            yield return StartCoroutine(FadeEffect(true));

            // Teleport player to dream
            if (_playerTransform != null)
            {
                _playerTransform.position = tunnel.SpawnPoint.position;
                _playerTransform.rotation = tunnel.SpawnPoint.rotation;
            }

            // Start dream ambient
            if (_dreamAmbientLoop != null)
            {
                _dreamAudioSource.clip = _dreamAmbientLoop;
                _dreamAudioSource.Play();
                StartCoroutine(FadeAudio(_dreamAudioSource, 0f, 0.5f, 2f));
            }

            // Apply dream atmosphere
            tunnel.Activate();

            // Fade from dream
            yield return StartCoroutine(FadeEffect(false));

            OnDreamEntered?.Invoke(tunnel);

            // Start narrative sequence
            StartCoroutine(tunnel.PlayNarrativeSequence());
        }

        /// <summary>
        /// Wake from the current dream.
        /// </summary>
        public IEnumerator WakeFromDream(DreamExitReason reason)
        {
            if (!_isInDream || _currentDream == null) yield break;

            if (_debugMode)
            {
                Debug.Log($"[DreamTunnelSystem] Waking from dream: {reason}");
            }

            // Fade out dream audio
            if (_dreamAudioSource.isPlaying)
            {
                StartCoroutine(FadeAudio(_dreamAudioSource, _dreamAudioSource.volume, 0f, 1f));
            }

            // Play exit sound
            if (_dreamExitSound != null)
            {
                AudioSource.PlayClipAtPoint(_dreamExitSound, _playerTransform?.position ?? Vector3.zero);
            }

            // Fade to wake
            yield return StartCoroutine(FadeEffect(true));

            // Deactivate dream
            _currentDream.Deactivate();

            // Return player to real world
            if (_playerTransform != null)
            {
                _playerTransform.position = _realWorldPosition;
                _playerTransform.rotation = _realWorldRotation;
            }

            // Restore atmosphere
            LabyrinthAtmosphere.Instance?.SetFogEnabled(true);

            // Fade from wake
            yield return StartCoroutine(FadeEffect(false));

            var exitedDream = _currentDream;
            _currentDream = null;
            _isInDream = false;

            OnDreamExited?.Invoke(exitedDream);

            // If dream was one-time, destroy it
            if (reason != DreamExitReason.PlayerExited)
            {
                UnregisterTunnel(exitedDream);
                Destroy(exitedDream.gameObject, 1f);
            }
        }

        /// <summary>
        /// Force immediate wake (no animation).
        /// </summary>
        public void ForceWake()
        {
            if (!_isInDream) return;

            _dreamAudioSource.Stop();

            if (_playerTransform != null)
            {
                _playerTransform.position = _realWorldPosition;
                _playerTransform.rotation = _realWorldRotation;
            }

            _currentDream?.Deactivate();
            _currentDream = null;
            _isInDream = false;
        }

        #endregion

        #region Dream State Update

        private void UpdateDreamState()
        {
            if (_currentDream == null) return;

            float dreamTime = Time.time - _dreamStartTime;

            // Check if dream duration exceeded
            if (dreamTime >= _currentDream.Config.duration)
            {
                StartCoroutine(WakeFromDream(DreamExitReason.TimeExpired));
                return;
            }

            // Update dream effects based on time
            float progress = dreamTime / _currentDream.Config.duration;
            _currentDream.UpdateDreamProgress(progress);
        }

        #endregion

        #region Event Handlers

        private void HandlePlayerEnteredTunnel(DreamTunnel tunnel)
        {
            if (!_isInDream)
            {
                StartCoroutine(EnterDream(tunnel));
            }
        }

        private void HandlePlayerExitedTunnel(DreamTunnel tunnel)
        {
            if (_isInDream && _currentDream == tunnel)
            {
                StartCoroutine(WakeFromDream(DreamExitReason.PlayerExited));
            }
        }

        private void HandleNarrativeTriggered(DreamNarrativeFragment fragment)
        {
            OnNarrativeFragment?.Invoke(fragment);
        }

        #endregion

        #region Effects

        private IEnumerator FadeEffect(bool fadeIn)
        {
            float duration = fadeIn ? _entryFadeDuration : _exitFadeDuration;
            var curve = fadeIn ? _fadeInCurve : _fadeOutCurve;

            // This would interface with a screen fade system
            // For now, we just wait
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = curve.Evaluate(elapsed / duration);
                // Apply fade to screen overlay
                yield return null;
            }
        }

        private IEnumerator FadeAudio(AudioSource source, float from, float to, float duration)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                source.volume = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            source.volume = to;

            if (to <= 0f)
            {
                source.Stop();
            }
        }

        #endregion

        #region Utility

        private Color GetEmotionColor(string emotion)
        {
            return emotion?.ToLower() switch
            {
                "joy" => new Color(1f, 0.9f, 0.3f),
                "sadness" => new Color(0.2f, 0.3f, 0.6f),
                "fear" => new Color(0.1f, 0.1f, 0.2f),
                "anger" => new Color(0.8f, 0.1f, 0.1f),
                "love" => new Color(0.9f, 0.3f, 0.5f),
                "curiosity" => new Color(0.3f, 0.8f, 0.9f),
                "confusion" => new Color(0.5f, 0.5f, 0.5f),
                _ => new Color(0.5f, 0.3f, 0.7f) // Default purple
            };
        }

        #endregion
    }

    #region Data Types

    public enum DreamTriggerType
    {
        Arcana,
        Emotional,
        Unbound,
        Manual
    }

    public enum DreamExitReason
    {
        TimeExpired,
        ArcanaExpired,
        PlayerExited,
        NarrativeComplete,
        Forced
    }

    [Serializable]
    public class DreamConfig
    {
        public string themeName;
        public DreamTriggerType triggerType;
        public int sourceId;
        public float duration = 120f;
        public int roomCount = 4;

        public Color primaryColor = Color.magenta;
        public Color secondaryColor = Color.black;
        public float fogDensity = 0.03f;
        public float distortionIntensity = 0.1f;
        public float timeScale = 1f;
        public float emotionalWeight = 0f;
        public string symbolism;
        public bool isUnbound = false;

        public List<string> narrativeFragments = new List<string>();
    }

    [Serializable]
    public class DreamNarrativeFragment
    {
        public string text;
        public NarrativeDisplayType displayType;
        public float displayDuration = 3f;
        public Vector3 worldPosition;
        public Color textColor = Color.white;
        public bool isAIGenerated;
    }

    public enum NarrativeDisplayType
    {
        WallText,
        FloatingText,
        Whisper,
        TerminalOutput,
        ScreenFlash
    }

    #endregion
}

using System;
using System.Collections;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Core.Events;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Ritual;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Manages ambient audio throughout the labyrinth.
    /// Responds to terminal state changes and ritual events via ReactiveSystemBus.
    /// Supports layered audio with crossfades.
    /// </summary>
    public class LabyrinthAmbientAudio : MonoBehaviour, IReactiveSystem
    {
        // Legacy singleton - use ServiceLocator.Get<LabyrinthAmbientAudio>() instead
        [Obsolete("Use ServiceLocator.Get<LabyrinthAmbientAudio>() instead")]
        public static LabyrinthAmbientAudio Instance { get; private set; }

        // Reactive system signals we care about
        public SymbolicSignalType[] SubscribedSignals => new[]
        {
            SymbolicSignalType.StateTransition,
            SymbolicSignalType.RitualComplete,
            SymbolicSignalType.UnboundTriggered,
            SymbolicSignalType.UnboundEnded,
            SymbolicSignalType.RoomEntered,
            SymbolicSignalType.GateOpened,
            SymbolicSignalType.GateClosed
        };

        [Header("Audio Sources")]
        [SerializeField] private AudioSource _baseAmbientSource;
        [SerializeField] private AudioSource _stateLayerSource;
        [SerializeField] private AudioSource _eventLayerSource;
        [SerializeField] private AudioSource _musicSource;


        [Header("Base Ambient Clips")]
        [SerializeField] private AudioClip _labyrinthHum;
        [SerializeField] private AudioClip _distantEchoes;
        [SerializeField] private AudioClip _electricalBuzz;

        [Header("State-Reactive Clips")]
        [SerializeField] private AudioClip _waitingAmbience;
        [SerializeField] private AudioClip _rememberingAmbience;
        [SerializeField] private AudioClip _corruptedAmbience;
        [SerializeField] private AudioClip _echoAmbience;
        [SerializeField] private AudioClip _unboundAmbience;

        [Header("Event Stingers")]
        [SerializeField] private AudioClip _gateOpenStinger;
        [SerializeField] private AudioClip _gateCloseStinger;
        [SerializeField] private AudioClip _roomEnterStinger;
        [SerializeField] private AudioClip _ritualStartStinger;
        [SerializeField] private AudioClip _unboundTriggerStinger;

        [Header("Music")]
        [SerializeField] private AudioClip _explorationMusic;
        [SerializeField] private AudioClip _tensionMusic;
        [SerializeField] private AudioClip _unboundMusic;

        [Header("Volume Settings")]
        [SerializeField, Range(0f, 1f)] private float _masterVolume = 1f;
        [SerializeField, Range(0f, 1f)] private float _baseAmbientVolume = 0.3f;
        [SerializeField, Range(0f, 1f)] private float _stateLayerVolume = 0.4f;
        [SerializeField, Range(0f, 1f)] private float _eventVolume = 0.6f;
        [SerializeField, Range(0f, 1f)] private float _musicVolume = 0.25f;

        [Header("Crossfade")]
        [SerializeField] private float _crossfadeDuration = 2f;
        [SerializeField] private AnimationCurve _fadeCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        [Header("Spatial")]
        [SerializeField] private bool _spatializeEvents = true;
        [SerializeField] private float _eventSpatialBlend = 0.7f;

        // Internal state
        private CristalState _currentState;
        private Coroutine _stateTransitionCoroutine;
        private Coroutine _musicTransitionCoroutine;
        private bool _isUnboundActive;

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

            InitializeAudioSources();
        }

        private void OnEnable()
        {
            // Subscribe to ReactiveSystemBus
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Subscribe(signal, OnSymbolicEvent);
            }
        }

        private void OnDisable()
        {
            // Unsubscribe from ReactiveSystemBus
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Unsubscribe(signal, OnSymbolicEvent);
            }
        }

        private void Start()
        {
            // Legacy subscriptions (kept for backward compatibility)
            #pragma warning disable CS0618
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition += HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            #pragma warning restore CS0618
            if (ritualSystem != null)
            {
                ritualSystem.OnRitualComplete += HandleRitualComplete;
                ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
                ritualSystem.OnUnboundEnded += HandleUnboundEnded;
            }

            // Start base ambient
            StartBaseAmbient();
        }

        private void OnDestroy()
        {
            #pragma warning disable CS0618
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition -= HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            #pragma warning restore CS0618
            if (ritualSystem != null)
            {
                ritualSystem.OnRitualComplete -= HandleRitualComplete;
                ritualSystem.OnUnboundTriggered -= HandleUnboundTriggered;
                ritualSystem.OnUnboundEnded -= HandleUnboundEnded;
            }

            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Reactive Event Handling

        /// <summary>
        /// Handle symbolic events from ReactiveSystemBus.
        /// </summary>
        public void OnSymbolicEvent(in SymbolicEvent evt)
        {
            switch (evt.Signal)
            {
                case SymbolicSignalType.StateTransition:
                    if (evt.Payload is StateTransitionPayload statePayload)
                    {
                        HandleStateTransition(statePayload.From, statePayload.To);
                    }
                    break;

                case SymbolicSignalType.RitualComplete:
                    HandleRitualComplete();
                    break;

                case SymbolicSignalType.UnboundTriggered:
                    HandleUnboundTriggered();
                    break;

                case SymbolicSignalType.UnboundEnded:
                    HandleUnboundEnded();
                    break;

                case SymbolicSignalType.RoomEntered:
                    PlayRoomEnter();
                    break;

                case SymbolicSignalType.GateOpened:
                    PlayEventStinger(_gateOpenStinger);
                    break;

                case SymbolicSignalType.GateClosed:
                    PlayEventStinger(_gateCloseStinger);
                    break;
            }
        }

        #endregion

        #region Initialization

        private void InitializeAudioSources()
        {
            // Create audio sources if not assigned
            if (_baseAmbientSource == null)
            {
                _baseAmbientSource = CreateAudioSource("BaseAmbient", true, 0f);
            }

            if (_stateLayerSource == null)
            {
                _stateLayerSource = CreateAudioSource("StateLayer", true, 0f);
            }

            if (_eventLayerSource == null)
            {
                _eventLayerSource = CreateAudioSource("EventLayer", false, _eventSpatialBlend);
            }

            if (_musicSource == null)
            {
                _musicSource = CreateAudioSource("Music", true, 0f);
            }

            ApplyVolumeSettings();
        }

        private AudioSource CreateAudioSource(string name, bool loop, float spatialBlend)
        {
            var go = new GameObject($"AudioSource_{name}");
            go.transform.SetParent(transform);
            go.transform.localPosition = Vector3.zero;

            var source = go.AddComponent<AudioSource>();
            source.loop = loop;
            source.playOnAwake = false;
            source.spatialBlend = spatialBlend;
            source.rolloffMode = AudioRolloffMode.Linear;
            source.minDistance = 1f;
            source.maxDistance = 50f;

            return source;
        }

        private void ApplyVolumeSettings()
        {
            if (_baseAmbientSource != null)
                _baseAmbientSource.volume = _baseAmbientVolume * _masterVolume;

            if (_stateLayerSource != null)
                _stateLayerSource.volume = _stateLayerVolume * _masterVolume;

            if (_eventLayerSource != null)
                _eventLayerSource.volume = _eventVolume * _masterVolume;

            if (_musicSource != null)
                _musicSource.volume = _musicVolume * _masterVolume;
        }

        #endregion

        #region Base Ambient

        private void StartBaseAmbient()
        {
            if (_baseAmbientSource == null || _labyrinthHum == null) return;

            _baseAmbientSource.clip = _labyrinthHum;
            _baseAmbientSource.Play();

            // Set initial state layer
            SetStateAmbience(CristalState.Waiting);

            Debug.Log("[LabyrinthAmbientAudio] Base ambient started");
        }

        #endregion

        #region State Transitions

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            if (_currentState == to) return;

            _currentState = to;
            SetStateAmbience(to);

            Debug.Log($"[LabyrinthAmbientAudio] State transition: {from} -> {to}");
        }

        private void SetStateAmbience(CristalState state)
        {
            AudioClip targetClip = GetStateClip(state);

            if (_stateTransitionCoroutine != null)
            {
                StopCoroutine(_stateTransitionCoroutine);
            }

            _stateTransitionCoroutine = StartCoroutine(CrossfadeStateLayer(targetClip));
        }

        private AudioClip GetStateClip(CristalState state)
        {
            return state switch
            {
                CristalState.Waiting => _waitingAmbience,
                CristalState.Remembering => _rememberingAmbience,
                CristalState.Corrupted => _corruptedAmbience,
                CristalState.Echo => _echoAmbience,
                CristalState.Unbound => _unboundAmbience,
                _ => _waitingAmbience
            };
        }

        private IEnumerator CrossfadeStateLayer(AudioClip newClip)
        {
            if (_stateLayerSource == null) yield break;

            float startVolume = _stateLayerSource.volume;
            float targetVolume = _stateLayerVolume * _masterVolume;

            // Fade out current
            if (_stateLayerSource.isPlaying)
            {
                float elapsed = 0f;
                while (elapsed < _crossfadeDuration * 0.5f)
                {
                    elapsed += Time.deltaTime;
                    float t = _fadeCurve.Evaluate(elapsed / (_crossfadeDuration * 0.5f));
                    _stateLayerSource.volume = Mathf.Lerp(startVolume, 0f, t);
                    yield return null;
                }
            }

            // Switch clip
            _stateLayerSource.Stop();
            _stateLayerSource.clip = newClip;

            if (newClip != null)
            {
                _stateLayerSource.Play();

                // Fade in new
                float elapsed = 0f;
                while (elapsed < _crossfadeDuration * 0.5f)
                {
                    elapsed += Time.deltaTime;
                    float t = _fadeCurve.Evaluate(elapsed / (_crossfadeDuration * 0.5f));
                    _stateLayerSource.volume = Mathf.Lerp(0f, targetVolume, t);
                    yield return null;
                }

                _stateLayerSource.volume = targetVolume;
            }
        }

        #endregion

        #region Ritual Events

        private void HandleRitualComplete()
        {
            PlayEventStinger(_ritualStartStinger);
        }

        private void HandleUnboundTriggered()
        {
            _isUnboundActive = true;
            PlayEventStinger(_unboundTriggerStinger);
            TransitionMusic(_unboundMusic);

            Debug.Log("[LabyrinthAmbientAudio] UNBOUND triggered - switching to unbound music");
        }

        private void HandleUnboundEnded()
        {
            _isUnboundActive = false;
            TransitionMusic(_explorationMusic);

            Debug.Log("[LabyrinthAmbientAudio] UNBOUND ended - returning to exploration music");
        }

        #endregion

        #region Event Stingers

        /// <summary>
        /// Play a one-shot event sound.
        /// </summary>
        public void PlayEventStinger(AudioClip clip)
        {
            if (_eventLayerSource == null || clip == null) return;

            _eventLayerSource.PlayOneShot(clip, _eventVolume * _masterVolume);
        }

        /// <summary>
        /// Play a positional event sound.
        /// </summary>
        public void PlayEventStingerAt(AudioClip clip, Vector3 position)
        {
            if (clip == null) return;

            if (_spatializeEvents)
            {
                AudioSource.PlayClipAtPoint(clip, position, _eventVolume * _masterVolume);
            }
            else
            {
                PlayEventStinger(clip);
            }
        }

        /// <summary>
        /// Play gate open sound.
        /// </summary>
        public void PlayGateOpen(Vector3 position)
        {
            PlayEventStingerAt(_gateOpenStinger, position);
        }

        /// <summary>
        /// Play gate close sound.
        /// </summary>
        public void PlayGateClose(Vector3 position)
        {
            PlayEventStingerAt(_gateCloseStinger, position);
        }

        /// <summary>
        /// Play room enter sound.
        /// </summary>
        public void PlayRoomEnter()
        {
            PlayEventStinger(_roomEnterStinger);
        }

        #endregion

        #region Music

        private void TransitionMusic(AudioClip newMusic)
        {
            if (_musicTransitionCoroutine != null)
            {
                StopCoroutine(_musicTransitionCoroutine);
            }

            _musicTransitionCoroutine = StartCoroutine(CrossfadeMusic(newMusic));
        }

        private IEnumerator CrossfadeMusic(AudioClip newClip)
        {
            if (_musicSource == null) yield break;

            float startVolume = _musicSource.volume;
            float targetVolume = _musicVolume * _masterVolume;

            // Fade out current
            if (_musicSource.isPlaying)
            {
                float elapsed = 0f;
                while (elapsed < _crossfadeDuration)
                {
                    elapsed += Time.deltaTime;
                    float t = _fadeCurve.Evaluate(elapsed / _crossfadeDuration);
                    _musicSource.volume = Mathf.Lerp(startVolume, 0f, t);
                    yield return null;
                }
            }

            // Switch and fade in
            _musicSource.Stop();
            _musicSource.clip = newClip;

            if (newClip != null)
            {
                _musicSource.Play();

                float elapsed = 0f;
                while (elapsed < _crossfadeDuration)
                {
                    elapsed += Time.deltaTime;
                    float t = _fadeCurve.Evaluate(elapsed / _crossfadeDuration);
                    _musicSource.volume = Mathf.Lerp(0f, targetVolume, t);
                    yield return null;
                }

                _musicSource.volume = targetVolume;
            }
        }

        /// <summary>
        /// Start exploration music.
        /// </summary>
        public void StartExplorationMusic()
        {
            TransitionMusic(_explorationMusic);
        }

        /// <summary>
        /// Start tension music.
        /// </summary>
        public void StartTensionMusic()
        {
            TransitionMusic(_tensionMusic);
        }

        /// <summary>
        /// Stop all music with fade.
        /// </summary>
        public void StopMusic()
        {
            TransitionMusic(null);
        }

        #endregion

        #region Volume Control

        /// <summary>
        /// Set master volume (0-1).
        /// </summary>
        public void SetMasterVolume(float volume)
        {
            _masterVolume = Mathf.Clamp01(volume);
            ApplyVolumeSettings();
        }

        /// <summary>
        /// Set ambient volume (0-1).
        /// </summary>
        public void SetAmbientVolume(float volume)
        {
            _baseAmbientVolume = Mathf.Clamp01(volume);
            ApplyVolumeSettings();
        }

        /// <summary>
        /// Set music volume (0-1).
        /// </summary>
        public void SetMusicVolume(float volume)
        {
            _musicVolume = Mathf.Clamp01(volume);
            ApplyVolumeSettings();
        }

        /// <summary>
        /// Mute/unmute all audio.
        /// </summary>
        public void SetMuted(bool muted)
        {
            if (_baseAmbientSource != null) _baseAmbientSource.mute = muted;
            if (_stateLayerSource != null) _stateLayerSource.mute = muted;
            if (_eventLayerSource != null) _eventLayerSource.mute = muted;
            if (_musicSource != null) _musicSource.mute = muted;
        }

        #endregion
    }
}

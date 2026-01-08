using System.Collections;
using UnityEngine;
using UnityEngine.Rendering;
using Cristal.CLI.Core;
using Cristal.CLI.Core.Events;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Ritual;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Controls atmospheric effects in the labyrinth - fog, lighting, post-processing.
    /// Responds to terminal state changes and ritual events via ReactiveSystemBus.
    /// </summary>
    public class LabyrinthAtmosphere : ReactiveMonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<LabyrinthAtmosphere>() instead
        [System.Obsolete("Use ServiceLocator.Get<LabyrinthAtmosphere>() instead")]
        public static LabyrinthAtmosphere Instance { get; private set; }

        [Header("Fog Settings")]
        [SerializeField] private bool _enableFog = true;
        [SerializeField] private FogMode _fogMode = FogMode.ExponentialSquared;
        [SerializeField] private float _baseFogDensity = 0.02f;
        [SerializeField] private Color _baseFogColor = new Color(0.05f, 0.03f, 0.08f);

        [Header("State Fog Colors")]
        [SerializeField] private Color _waitingFogColor = new Color(0.05f, 0.05f, 0.1f);
        [SerializeField] private Color _rememberingFogColor = new Color(0.02f, 0.08f, 0.12f);
        [SerializeField] private Color _corruptedFogColor = new Color(0.15f, 0.02f, 0.05f);
        [SerializeField] private Color _echoFogColor = new Color(0.1f, 0.1f, 0.15f);
        [SerializeField] private Color _unboundFogColor = new Color(0.2f, 0.05f, 0.25f);

        [Header("State Fog Densities")]
        [SerializeField] private float _waitingFogDensity = 0.02f;
        [SerializeField] private float _rememberingFogDensity = 0.015f;
        [SerializeField] private float _corruptedFogDensity = 0.04f;
        [SerializeField] private float _echoFogDensity = 0.025f;
        [SerializeField] private float _unboundFogDensity = 0.008f;

        [Header("Ambient Lighting")]
        [SerializeField] private Light _directionalLight;
        [SerializeField] private float _baseIntensity = 0.3f;
        [SerializeField] private Color _baseAmbientColor = new Color(0.1f, 0.08f, 0.15f);

        [Header("State Lighting")]
        [SerializeField] private Color _waitingLightColor = new Color(0.15f, 0.12f, 0.2f);
        [SerializeField] private Color _rememberingLightColor = new Color(0.1f, 0.2f, 0.3f);
        [SerializeField] private Color _corruptedLightColor = new Color(0.3f, 0.05f, 0.1f);
        [SerializeField] private Color _echoLightColor = new Color(0.2f, 0.2f, 0.25f);
        [SerializeField] private Color _unboundLightColor = new Color(0.4f, 0.1f, 0.5f);

        [Header("Post-Processing Volume (Optional)")]
        [SerializeField] private Volume _postProcessVolume;

        [Header("Particle Effects")]
        [SerializeField] private ParticleSystem _dustParticles;
        [SerializeField] private ParticleSystem _glitchParticles;
        [SerializeField] private ParticleSystem _unboundParticles;

        [Header("Transition")]
        [SerializeField] private float _transitionDuration = 2f;
        [SerializeField] private AnimationCurve _transitionCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        [Header("UNBOUND Effects")]
        [SerializeField] private float _unboundPulseSpeed = 2f;
        [SerializeField] private float _unboundPulseIntensity = 0.3f;
        [SerializeField] private bool _unboundScreenShake = true;
        [SerializeField] private float _unboundShakeIntensity = 0.05f;

        // Reactive system signals we care about
        public override SymbolicSignalType[] SubscribedSignals => new[]
        {
            SymbolicSignalType.StateTransition,
            SymbolicSignalType.UnboundTriggered,
            SymbolicSignalType.UnboundEnded,
            SymbolicSignalType.FogPulse,
            SymbolicSignalType.CorruptionSpike,
            SymbolicSignalType.GlitchTriggered
        };

        // Internal state
        private CristalState _currentState;
        private Coroutine _transitionCoroutine;
        private bool _isUnboundActive;
        private float _unboundPhase;

        // Cached original values
        private Color _originalFogColor;
        private float _originalFogDensity;
        private Color _originalAmbientColor;
        private float _originalLightIntensity;

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

            CacheOriginalValues();
        }

        private void Start()
        {
            // Legacy subscriptions (kept for backward compatibility, will be removed)
            #pragma warning disable CS0618
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition += HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            #pragma warning restore CS0618
            if (ritualSystem != null)
            {
                ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
                ritualSystem.OnUnboundEnded += HandleUnboundEnded;
            }

            // Initialize fog
            ApplyFogSettings();

            // Start dust particles
            if (_dustParticles != null)
            {
                _dustParticles.Play();
            }
        }

        private void Update()
        {
            if (_isUnboundActive)
            {
                UpdateUnboundEffects();
            }
        }

        private void OnDestroy()
        {
            RestoreOriginalValues();

            #pragma warning disable CS0618
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition -= HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            #pragma warning restore CS0618
            if (ritualSystem != null)
            {
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
        /// This is the new decoupled way to receive events.
        /// </summary>
        public override void OnSymbolicEvent(in SymbolicEvent evt)
        {
            switch (evt.Signal)
            {
                case SymbolicSignalType.StateTransition:
                    if (evt.Payload is StateTransitionPayload statePayload)
                    {
                        HandleStateTransition(statePayload.From, statePayload.To);
                    }
                    break;

                case SymbolicSignalType.UnboundTriggered:
                    HandleUnboundTriggered();
                    break;

                case SymbolicSignalType.UnboundEnded:
                    HandleUnboundEnded();
                    break;

                case SymbolicSignalType.FogPulse:
                    TriggerFogPulse(evt.Intensity / 100f);
                    break;

                case SymbolicSignalType.CorruptionSpike:
                    TriggerCorruptionEffect(evt.Intensity / 100f);
                    break;

                case SymbolicSignalType.GlitchTriggered:
                    TriggerGlitchParticles(evt.Intensity / 100f);
                    break;
            }
        }

        /// <summary>Trigger a fog pulse effect.</summary>
        private void TriggerFogPulse(float intensity)
        {
            if (!_enableFog) return;

            StartCoroutine(FogPulseCoroutine(intensity));
        }

        private IEnumerator FogPulseCoroutine(float intensity)
        {
            float originalDensity = RenderSettings.fogDensity;
            float pulseDensity = originalDensity * (1f + intensity);

            float duration = 0.5f;
            float elapsed = 0f;

            // Pulse up
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                RenderSettings.fogDensity = Mathf.Lerp(originalDensity, pulseDensity, t);
                yield return null;
            }

            // Pulse down
            elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                RenderSettings.fogDensity = Mathf.Lerp(pulseDensity, originalDensity, t);
                yield return null;
            }

            RenderSettings.fogDensity = originalDensity;
        }

        /// <summary>Trigger corruption visual effect.</summary>
        private void TriggerCorruptionEffect(float intensity)
        {
            // Tint fog red temporarily
            StartCoroutine(CorruptionFlashCoroutine(intensity));
        }

        private IEnumerator CorruptionFlashCoroutine(float intensity)
        {
            Color originalColor = RenderSettings.fogColor;
            Color corruptColor = Color.Lerp(originalColor, _corruptedFogColor, intensity);

            float duration = 0.3f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = 1f - (elapsed / duration);
                RenderSettings.fogColor = Color.Lerp(originalColor, corruptColor, t);
                yield return null;
            }

            RenderSettings.fogColor = originalColor;
        }

        /// <summary>Trigger glitch particles.</summary>
        private void TriggerGlitchParticles(float intensity)
        {
            if (_glitchParticles == null) return;

            var emission = _glitchParticles.emission;
            var originalRate = emission.rateOverTime.constant;

            // Burst based on intensity
            int burstCount = Mathf.RoundToInt(intensity * 50);
            _glitchParticles.Emit(burstCount);
        }

        #endregion

        #region Initialization

        private void CacheOriginalValues()
        {
            _originalFogColor = RenderSettings.fogColor;
            _originalFogDensity = RenderSettings.fogDensity;
            _originalAmbientColor = RenderSettings.ambientLight;

            if (_directionalLight != null)
            {
                _originalLightIntensity = _directionalLight.intensity;
            }
        }

        private void RestoreOriginalValues()
        {
            RenderSettings.fogColor = _originalFogColor;
            RenderSettings.fogDensity = _originalFogDensity;
            RenderSettings.ambientLight = _originalAmbientColor;

            if (_directionalLight != null)
            {
                _directionalLight.intensity = _originalLightIntensity;
            }
        }

        private void ApplyFogSettings()
        {
            RenderSettings.fog = _enableFog;
            RenderSettings.fogMode = _fogMode;
            RenderSettings.fogDensity = _baseFogDensity;
            RenderSettings.fogColor = _baseFogColor;
            RenderSettings.ambientLight = _baseAmbientColor;
        }

        #endregion

        #region State Transitions

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            if (_currentState == to) return;

            _currentState = to;

            if (_transitionCoroutine != null)
            {
                StopCoroutine(_transitionCoroutine);
            }

            _transitionCoroutine = StartCoroutine(TransitionToState(to));

            Debug.Log($"[LabyrinthAtmosphere] Transitioning atmosphere: {from} -> {to}");
        }

        private IEnumerator TransitionToState(CristalState state)
        {
            Color startFogColor = RenderSettings.fogColor;
            float startFogDensity = RenderSettings.fogDensity;
            Color startAmbient = RenderSettings.ambientLight;
            Color startLightColor = _directionalLight != null ? _directionalLight.color : Color.white;

            Color targetFogColor = GetStateFogColor(state);
            float targetFogDensity = GetStateFogDensity(state);
            Color targetAmbient = GetStateLightColor(state) * 0.5f;
            Color targetLightColor = GetStateLightColor(state);

            float elapsed = 0f;
            while (elapsed < _transitionDuration)
            {
                elapsed += Time.deltaTime;
                float t = _transitionCurve.Evaluate(elapsed / _transitionDuration);

                RenderSettings.fogColor = Color.Lerp(startFogColor, targetFogColor, t);
                RenderSettings.fogDensity = Mathf.Lerp(startFogDensity, targetFogDensity, t);
                RenderSettings.ambientLight = Color.Lerp(startAmbient, targetAmbient, t);

                if (_directionalLight != null)
                {
                    _directionalLight.color = Color.Lerp(startLightColor, targetLightColor, t);
                }

                yield return null;
            }

            // Ensure final values
            RenderSettings.fogColor = targetFogColor;
            RenderSettings.fogDensity = targetFogDensity;
            RenderSettings.ambientLight = targetAmbient;

            if (_directionalLight != null)
            {
                _directionalLight.color = targetLightColor;
            }

            // Update particles based on state
            UpdateParticlesForState(state);
        }

        private Color GetStateFogColor(CristalState state)
        {
            return state switch
            {
                CristalState.Waiting => _waitingFogColor,
                CristalState.Remembering => _rememberingFogColor,
                CristalState.Corrupted => _corruptedFogColor,
                CristalState.Echo => _echoFogColor,
                CristalState.UNBOUND => _unboundFogColor,
                _ => _baseFogColor
            };
        }

        private float GetStateFogDensity(CristalState state)
        {
            return state switch
            {
                CristalState.Waiting => _waitingFogDensity,
                CristalState.Remembering => _rememberingFogDensity,
                CristalState.Corrupted => _corruptedFogDensity,
                CristalState.Echo => _echoFogDensity,
                CristalState.UNBOUND => _unboundFogDensity,
                _ => _baseFogDensity
            };
        }

        private Color GetStateLightColor(CristalState state)
        {
            return state switch
            {
                CristalState.Waiting => _waitingLightColor,
                CristalState.Remembering => _rememberingLightColor,
                CristalState.Corrupted => _corruptedLightColor,
                CristalState.Echo => _echoLightColor,
                CristalState.UNBOUND => _unboundLightColor,
                _ => _waitingLightColor
            };
        }

        private void UpdateParticlesForState(CristalState state)
        {
            // Dust always active but varying intensity
            if (_dustParticles != null)
            {
                var emission = _dustParticles.emission;
                emission.rateOverTime = state == CristalState.Corrupted ? 50f : 20f;
            }

            // Glitch particles for corrupted state
            if (_glitchParticles != null)
            {
                if (state == CristalState.Corrupted)
                {
                    _glitchParticles.Play();
                }
                else
                {
                    _glitchParticles.Stop();
                }
            }
        }

        #endregion

        #region UNBOUND Effects

        private void HandleUnboundTriggered()
        {
            _isUnboundActive = true;
            _unboundPhase = 0f;

            if (_unboundParticles != null)
            {
                _unboundParticles.Play();
            }

            Debug.Log("[LabyrinthAtmosphere] UNBOUND effects activated");
        }

        private void HandleUnboundEnded()
        {
            _isUnboundActive = false;

            if (_unboundParticles != null)
            {
                _unboundParticles.Stop();
            }

            // Restore stable lighting
            if (_directionalLight != null)
            {
                _directionalLight.intensity = _baseIntensity;
            }

            Debug.Log("[LabyrinthAtmosphere] UNBOUND effects deactivated");
        }

        private void UpdateUnboundEffects()
        {
            _unboundPhase += Time.deltaTime * _unboundPulseSpeed;

            // Pulsing light intensity
            if (_directionalLight != null)
            {
                float pulse = Mathf.Sin(_unboundPhase) * _unboundPulseIntensity;
                _directionalLight.intensity = _baseIntensity + pulse;
            }

            // Pulsing fog density
            float fogPulse = Mathf.Sin(_unboundPhase * 0.7f) * 0.005f;
            RenderSettings.fogDensity = _unboundFogDensity + fogPulse;

            // Screen shake (camera should be obtained elsewhere)
            if (_unboundScreenShake)
            {
                // This would typically call into a CameraShake component
                // For now, we just track that shake should happen
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Trigger a brief flash effect.
        /// </summary>
        public void TriggerFlash(Color color, float duration = 0.2f)
        {
            StartCoroutine(FlashEffect(color, duration));
        }

        private IEnumerator FlashEffect(Color color, float duration)
        {
            Color originalAmbient = RenderSettings.ambientLight;
            RenderSettings.ambientLight = color;

            yield return new WaitForSeconds(duration);

            RenderSettings.ambientLight = originalAmbient;
        }

        /// <summary>
        /// Set fog enabled/disabled.
        /// </summary>
        public void SetFogEnabled(bool enabled)
        {
            _enableFog = enabled;
            RenderSettings.fog = enabled;
        }

        /// <summary>
        /// Override fog density temporarily.
        /// </summary>
        public void SetFogDensity(float density)
        {
            RenderSettings.fogDensity = density;
        }

        /// <summary>
        /// Override ambient light color temporarily.
        /// </summary>
        public void SetAmbientColor(Color color)
        {
            RenderSettings.ambientLight = color;
        }

        /// <summary>
        /// Trigger corruption glitch effect.
        /// </summary>
        public void TriggerGlitch(float duration = 0.5f)
        {
            if (_glitchParticles != null)
            {
                _glitchParticles.Play();
                StartCoroutine(StopGlitchAfter(duration));
            }
        }

        private IEnumerator StopGlitchAfter(float duration)
        {
            yield return new WaitForSeconds(duration);
            if (_glitchParticles != null && _currentState != CristalState.Corrupted)
            {
                _glitchParticles.Stop();
            }
        }

        #endregion
    }
}

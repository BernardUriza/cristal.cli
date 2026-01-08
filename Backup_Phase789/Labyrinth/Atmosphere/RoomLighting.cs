using UnityEngine;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Controls room-specific lighting that responds to terminal state.
    /// Attach to each room for localized atmospheric effects.
    /// </summary>
    public class RoomLighting : MonoBehaviour
    {
        [Header("Lights")]
        [SerializeField] private Light[] _roomLights;
        [SerializeField] private Light _accentLight;

        [Header("Base Settings")]
        [SerializeField] private float _baseIntensity = 1f;
        [SerializeField] private Color _baseColor = Color.white;

        [Header("State Colors")]
        [SerializeField] private Color _waitingColor = new Color(0.3f, 0.3f, 0.5f);
        [SerializeField] private Color _rememberingColor = new Color(0.2f, 0.5f, 0.7f);
        [SerializeField] private Color _corruptedColor = new Color(0.8f, 0.1f, 0.2f);
        [SerializeField] private Color _echoColor = new Color(0.5f, 0.5f, 0.6f);
        [SerializeField] private Color _unboundColor = new Color(0.7f, 0.2f, 0.9f);

        [Header("State Intensities")]
        [SerializeField] private float _waitingIntensity = 0.5f;
        [SerializeField] private float _rememberingIntensity = 0.8f;
        [SerializeField] private float _corruptedIntensity = 1.2f;
        [SerializeField] private float _echoIntensity = 0.6f;
        [SerializeField] private float _unboundIntensity = 1.5f;

        [Header("Flicker Effect")]
        [SerializeField] private bool _enableFlicker = true;
        [SerializeField] private float _flickerSpeed = 10f;
        [SerializeField] private float _flickerIntensity = 0.1f;
        [SerializeField] private bool _flickerOnlyCorrupted = true;

        [Header("Transition")]
        [SerializeField] private float _transitionSpeed = 2f;

        // Internal state
        private CristalState _currentState;
        private Color _targetColor;
        private float _targetIntensity;
        private float _flickerOffset;
        private bool _isActive;

        #region Unity Lifecycle

        private void Start()
        {
            _flickerOffset = Random.value * 100f;

            // Find lights if not assigned
            if (_roomLights == null || _roomLights.Length == 0)
            {
                _roomLights = GetComponentsInChildren<Light>();
            }

            // Subscribe to state changes
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition += HandleStateTransition;
            }

            // Set initial state
            SetStateImmediate(CristalState.Waiting);
        }

        private void Update()
        {
            if (!_isActive) return;

            UpdateLightTransition();
            UpdateFlicker();
        }

        private void OnDestroy()
        {
            if (TerminalStateMachine.Instance != null)
            {
                TerminalStateMachine.Instance.OnStateTransition -= HandleStateTransition;
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                _isActive = true;
                
                // Notify ambient audio
                LabyrinthAmbientAudio.Instance?.PlayRoomEnter();
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                _isActive = false;
            }
        }

        #endregion

        #region State Handling

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            _currentState = to;
            _targetColor = GetStateColor(to);
            _targetIntensity = GetStateIntensity(to);
        }

        private void SetStateImmediate(CristalState state)
        {
            _currentState = state;
            _targetColor = GetStateColor(state);
            _targetIntensity = GetStateIntensity(state);

            foreach (var light in _roomLights)
            {
                if (light != null)
                {
                    light.color = _targetColor;
                    light.intensity = _targetIntensity;
                }
            }
        }

        private Color GetStateColor(CristalState state)
        {
            return state switch
            {
                CristalState.Waiting => _waitingColor,
                CristalState.Remembering => _rememberingColor,
                CristalState.Corrupted => _corruptedColor,
                CristalState.Echo => _echoColor,
                CristalState.UNBOUND => _unboundColor,
                _ => _baseColor
            };
        }

        private float GetStateIntensity(CristalState state)
        {
            return state switch
            {
                CristalState.Waiting => _waitingIntensity,
                CristalState.Remembering => _rememberingIntensity,
                CristalState.Corrupted => _corruptedIntensity,
                CristalState.Echo => _echoIntensity,
                CristalState.UNBOUND => _unboundIntensity,
                _ => _baseIntensity
            };
        }

        #endregion

        #region Light Updates

        private void UpdateLightTransition()
        {
            float t = Time.deltaTime * _transitionSpeed;

            foreach (var light in _roomLights)
            {
                if (light == null) continue;

                light.color = Color.Lerp(light.color, _targetColor, t);
                light.intensity = Mathf.Lerp(light.intensity, _targetIntensity, t);
            }
        }

        private void UpdateFlicker()
        {
            if (!_enableFlicker) return;
            if (_flickerOnlyCorrupted && _currentState != CristalState.Corrupted) return;

            float flicker = Mathf.PerlinNoise(Time.time * _flickerSpeed + _flickerOffset, 0f);
            flicker = (flicker - 0.5f) * 2f * _flickerIntensity;

            foreach (var light in _roomLights)
            {
                if (light != null)
                {
                    light.intensity = _targetIntensity + flicker;
                }
            }
        }

        #endregion

        #region Accent Light

        /// <summary>
        /// Flash the accent light briefly.
        /// </summary>
        public void FlashAccent(Color color, float duration = 0.3f)
        {
            if (_accentLight == null) return;

            StartCoroutine(FlashAccentCoroutine(color, duration));
        }

        private System.Collections.IEnumerator FlashAccentCoroutine(Color color, float duration)
        {
            Color originalColor = _accentLight.color;
            float originalIntensity = _accentLight.intensity;

            _accentLight.color = color;
            _accentLight.intensity = 3f;

            yield return new WaitForSeconds(duration);

            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                _accentLight.color = Color.Lerp(color, originalColor, t);
                _accentLight.intensity = Mathf.Lerp(3f, originalIntensity, t);
                yield return null;
            }

            _accentLight.color = originalColor;
            _accentLight.intensity = originalIntensity;
        }

        /// <summary>
        /// Set accent light to indicate gate state.
        /// </summary>
        public void SetGateIndicator(bool isOpen)
        {
            if (_accentLight == null) return;

            _accentLight.color = isOpen ? Color.green : Color.red;
            _accentLight.intensity = isOpen ? 1f : 0.5f;
        }

        #endregion

        #region Configuration

        /// <summary>
        /// Configure room lighting at runtime.
        /// </summary>
        public void Configure(Color baseColor, float intensity)
        {
            _baseColor = baseColor;
            _baseIntensity = intensity;
            _targetColor = baseColor;
            _targetIntensity = intensity;
        }

        /// <summary>
        /// Add a light to the room lighting system.
        /// </summary>
        public void AddLight(Light light)
        {
            if (light == null) return;

            var list = new System.Collections.Generic.List<Light>(_roomLights ?? System.Array.Empty<Light>());
            list.Add(light);
            _roomLights = list.ToArray();
        }

        #endregion
    }
}

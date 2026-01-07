using System;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// A gate/door that responds to terminal state changes.
    /// Opens when the specified terminal state is achieved.
    /// Supports multi-direction placement and UNBOUND ritual events.
    /// </summary>
    public class SymbolicGate : MonoBehaviour
    {
        [Header("Gate Configuration")]
        [SerializeField] private CristalState _unlockState = CristalState.Remembering;
        [SerializeField] private bool _requiresStateVisit = true;
        [SerializeField] private bool _permanent = false;
        [SerializeField] private bool _openOnRitualComplete = false;

        [Header("Direction & Placement")]
        [SerializeField] private WallSide _direction = WallSide.North;
        [SerializeField] private bool _autoComputeOpenPosition = true;
        [SerializeField] private float _openDistance = 3f;

        [Header("UNBOUND Support")]
        [SerializeField] private bool _openOnUnboundTriggered = true;
        [SerializeField] private bool _closeOnUnboundEnded = false;

        [Header("Animation")]
        [SerializeField] private Transform _gateTransform;
        [SerializeField] private Vector3 _openPosition;
        [SerializeField] private Vector3 _closedPosition;
        [SerializeField] private float _openDuration = 1.5f;
        [SerializeField] private AnimationCurve _openCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
        
        [Header("Scale & Fade Animation")]
        [SerializeField] private bool _animateScaleFade = false;
        [SerializeField] private Vector3 _closedScale = Vector3.one;
        [SerializeField] private Vector3 _openScale = new Vector3(0.1f, 0.1f, 0.1f);
        [SerializeField] private float _closedAlpha = 1f;
        [SerializeField] private float _openAlpha = 0f;

        [Header("Alternative: Animator")]
        [SerializeField] private Animator _animator;
        [SerializeField] private string _openTrigger = "Open";
        [SerializeField] private string _closeTrigger = "Close";

        [Header("Visual")]
        [SerializeField] private MeshRenderer _gateRenderer;
        [SerializeField] private Material _sealedMaterial;
        [SerializeField] private Material _openMaterial;
        [SerializeField] private Light _gateLight;
        [SerializeField] private ParticleSystem _unlockParticles;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip _openClip;
        [SerializeField] private AudioClip _closeClip;
        [SerializeField] private AudioClip _sealedClip;

        [Header("Collision")]
        [SerializeField] private Collider _gateCollider;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<SymbolicGate> OnGateOpened;
        public event Action<SymbolicGate> OnGateClosed;

        private bool _isOpen;
        private bool _isAnimating;
        private float _animationTimer;
        private Vector3 _animationStart;
        private Vector3 _animationEnd;
        private Vector3 _scaleStart;
        private Vector3 _scaleEnd;
        private float _alphaStart;
        private float _alphaEnd;
        private MaterialPropertyBlock _propBlock;
        private static readonly int AlphaProperty = Shader.PropertyToID("_BaseColor");

        // Public properties for runtime configuration
        public bool IsOpen => _isOpen;
        public CristalState UnlockState => _unlockState;
        public WallSide Direction => _direction;
        public bool OpenOnUnboundTriggered => _openOnUnboundTriggered;

        private void Start()
        {
            // Initialize in closed position
            if (_gateTransform != null)
            {
                _gateTransform.localPosition = _closedPosition;
                if (_animateScaleFade)
                {
                    _gateTransform.localScale = _closedScale;
                }
            }

            // Auto-compute open position based on direction
            if (_autoComputeOpenPosition && _gateTransform != null)
            {
                _openPosition = _closedPosition + GetDirectionVector() * _openDistance;
            }

            // Initialize property block for alpha
            _propBlock = new MaterialPropertyBlock();

            UpdateVisualState();

            // Subscribe to ritual completion if needed
            if (_openOnRitualComplete)
            {
                var ritualSystem = RitualSystem.Instance;
                if (ritualSystem != null)
                {
                    ritualSystem.OnRitualComplete += HandleRitualComplete;
                }
            }

            // Subscribe to UNBOUND events
            if (_openOnUnboundTriggered)
            {
                var ritualSystem = RitualSystem.Instance;
                if (ritualSystem != null)
                {
                    ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
                    if (_closeOnUnboundEnded)
                    {
                        ritualSystem.OnUnboundEnded += HandleUnboundEnded;
                    }
                }
            }
        }

        private void OnDestroy()
        {
            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                if (_openOnRitualComplete)
                {
                    ritualSystem.OnRitualComplete -= HandleRitualComplete;
                }
                if (_openOnUnboundTriggered)
                {
                    ritualSystem.OnUnboundTriggered -= HandleUnboundTriggered;
                    ritualSystem.OnUnboundEnded -= HandleUnboundEnded;
                }
            }
        }

        private void Update()
        {
            if (_isAnimating)
            {
                UpdateAnimation();
            }
        }

        #region Direction Helpers

        private Vector3 GetDirectionVector()
        {
            return _direction switch
            {
                WallSide.North => Vector3.forward,
                WallSide.South => Vector3.back,
                WallSide.East => Vector3.right,
                WallSide.West => Vector3.left,
                _ => Vector3.up
            };
        }

        #endregion

        #region UNBOUND Handlers

        private void HandleUnboundTriggered()
        {
            if (_debugMode)
            {
                Debug.Log("[SymbolicGate] UNBOUND triggered - opening gate");
            }
            Open();
        }

        private void HandleUnboundEnded()
        {
            if (_closeOnUnboundEnded && !_permanent)
            {
                if (_debugMode)
                {
                    Debug.Log("[SymbolicGate] UNBOUND ended - closing gate");
                }
                Close();
            }
        }

        #endregion

        #region Runtime Configuration

        /// <summary>
        /// Configure this gate at runtime (used by BuildLabyrinthFromMap).
        /// </summary>
        public void Configure(WallSide direction, CristalState unlockState, bool openOnUnbound)
        {
            _direction = direction;
            _unlockState = unlockState;
            _openOnUnboundTriggered = openOnUnbound;

            if (_autoComputeOpenPosition && _gateTransform != null)
            {
                _openPosition = _closedPosition + GetDirectionVector() * _openDistance;
            }
        }

        #endregion

        #region State Response

        /// <summary>
        /// Called by LabyrinthManager when terminal state changes.
        /// </summary>
        public void OnTerminalStateChanged(CristalState from, CristalState to)
        {
            if (_debugMode)
            {
                Debug.Log($"[SymbolicGate] State changed: {from} -> {to}, unlock state: {_unlockState}");
            }

            if (to == _unlockState && !_isOpen)
            {
                Open();
            }
            else if (!_permanent && from == _unlockState && to != _unlockState)
            {
                Close();
            }
        }

        private void HandleRitualComplete()
        {
            if (_debugMode)
            {
                Debug.Log("[SymbolicGate] Ritual complete - opening gate");
            }

            Open();
        }

        #endregion

        #region Gate Control

        /// <summary>
        /// Open the gate.
        /// </summary>
        public void Open()
        {
            if (_isOpen || _isAnimating) return;

            if (_debugMode)
            {
                Debug.Log($"[SymbolicGate] Opening ({_unlockState})");
            }

            _isOpen = true;

            // Use animator if available
            if (_animator != null)
            {
                _animator.SetTrigger(_openTrigger);
            }
            else
            {
                StartAnimation(_closedPosition, _openPosition, _closedScale, _openScale, _closedAlpha, _openAlpha);
            }

            // Disable collision
            if (_gateCollider != null)
            {
                _gateCollider.enabled = false;
            }

            // Play sound
            PlaySound(_openClip);

            // Play particles
            if (_unlockParticles != null)
            {
                _unlockParticles.Play();
            }

            UpdateVisualState();
            OnGateOpened?.Invoke(this);
        }

        /// <summary>
        /// Close the gate.
        /// </summary>
        public void Close()
        {
            if (!_isOpen || _isAnimating || _permanent) return;

            if (_debugMode)
            {
                Debug.Log($"[SymbolicGate] Closing ({_unlockState})");
            }

            _isOpen = false;

            // Use animator if available
            if (_animator != null)
            {
                _animator.SetTrigger(_closeTrigger);
            }
            else
            {
                StartAnimation(_openPosition, _closedPosition, _openScale, _closedScale, _openAlpha, _closedAlpha);
            }

            // Enable collision
            if (_gateCollider != null)
            {
                _gateCollider.enabled = true;
            }

            // Play sound
            PlaySound(_closeClip);

            UpdateVisualState();
            OnGateClosed?.Invoke(this);
        }

        /// <summary>
        /// Try to interact with a sealed gate.
        /// </summary>
        public void TryOpen()
        {
            if (_isOpen) return;

            if (_debugMode)
            {
                Debug.Log($"[SymbolicGate] Gate is sealed - requires state: {_unlockState}");
            }

            // Play sealed sound
            PlaySound(_sealedClip);

            // Could show a hint about what state is needed
        }

        #endregion

        #region Animation

        private void StartAnimation(Vector3 fromPos, Vector3 toPos, 
            Vector3 fromScale, Vector3 toScale, 
            float fromAlpha, float toAlpha)
        {
            _isAnimating = true;
            _animationTimer = 0f;
            _animationStart = fromPos;
            _animationEnd = toPos;
            _scaleStart = fromScale;
            _scaleEnd = toScale;
            _alphaStart = fromAlpha;
            _alphaEnd = toAlpha;
        }

        private void UpdateAnimation()
        {
            _animationTimer += Time.deltaTime;
            float t = Mathf.Clamp01(_animationTimer / _openDuration);
            float curvedT = _openCurve.Evaluate(t);

            if (_gateTransform != null)
            {
                _gateTransform.localPosition = Vector3.Lerp(_animationStart, _animationEnd, curvedT);

                if (_animateScaleFade)
                {
                    _gateTransform.localScale = Vector3.Lerp(_scaleStart, _scaleEnd, curvedT);

                    // Update alpha via MaterialPropertyBlock
                    if (_gateRenderer != null && _propBlock != null)
                    {
                        float alpha = Mathf.Lerp(_alphaStart, _alphaEnd, curvedT);
                        Color baseColor = _gateRenderer.sharedMaterial != null 
                            ? _gateRenderer.sharedMaterial.color 
                            : Color.white;
                        baseColor.a = alpha;
                        _propBlock.SetColor(AlphaProperty, baseColor);
                        _gateRenderer.SetPropertyBlock(_propBlock);
                    }
                }
            }

            if (t >= 1f)
            {
                _isAnimating = false;
            }
        }

        #endregion

        #region Visual State

        private void UpdateVisualState()
        {
            // Update material
            if (_gateRenderer != null)
            {
                _gateRenderer.material = _isOpen ? _openMaterial : _sealedMaterial;
            }

            // Update light
            if (_gateLight != null)
            {
                _gateLight.color = _isOpen ? Color.green : Color.red;
            }
        }

        #endregion

        #region Utility

        private void PlaySound(AudioClip clip)
        {
            if (_audioSource != null && clip != null)
            {
                _audioSource.PlayOneShot(clip);
            }
        }

        #endregion

        private void OnDrawGizmosSelected()
        {
            if (_gateTransform == null) return;

            // Draw closed position
            Gizmos.color = Color.red;
            Gizmos.DrawWireCube(transform.TransformPoint(_closedPosition), Vector3.one * 0.5f);

            // Draw open position
            Gizmos.color = Color.green;
            Gizmos.DrawWireCube(transform.TransformPoint(_openPosition), Vector3.one * 0.5f);

            // Draw line between
            Gizmos.color = Color.yellow;
            Gizmos.DrawLine(
                transform.TransformPoint(_closedPosition),
                transform.TransformPoint(_openPosition)
            );
        }
    }
}

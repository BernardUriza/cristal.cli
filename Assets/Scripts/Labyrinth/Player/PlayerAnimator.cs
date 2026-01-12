using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Handles animation logic for the player character.
    /// Syncs animator parameters with PlayerController state.
    /// Compatible with Mixamo Y Bot animations.
    /// </summary>
    public class PlayerAnimator : MonoBehaviour
    {
        [Header("Animation Parameters")]
        [SerializeField] private string _speedParameter = "Speed";
        [SerializeField] private string _motionSpeedParameter = "MotionSpeed";
        [SerializeField] private string _isGroundedParameter = "IsGrounded";
        [SerializeField] private string _isCrouchingParameter = "IsCrouching";
        [SerializeField] private string _jumpTrigger = "Jump";
        [SerializeField] private string _landTrigger = "Land";
        [SerializeField] private string _freeFallParameter = "FreeFall";

        [Header("Speed Thresholds")]
        [SerializeField] private float _idleThreshold = 0.1f;
        [SerializeField] private float _walkThreshold = 3f;
        [SerializeField] private float _runThreshold = 5f;

        [Header("Settings")]
        [SerializeField] private float _animationSmoothTime = 0.1f;
        [SerializeField] private float _freeFallThreshold = 0.5f;
        [SerializeField] private bool _debugMode = false;

        [Header("References")]
        [SerializeField] private Animator _animator;
        [SerializeField] private PlayerController _controller;
        [SerializeField] private PlayerInputHandler _inputHandler;

        // Animation state
        private float _currentSpeed;
        private float _speedVelocity;
        private float _currentMotionSpeed;
        private float _motionSpeedVelocity;
        private bool _wasGrounded = true;
        private float _airTime;

        // Animator parameter hashes
        private int _speedHash;
        private int _motionSpeedHash;
        private int _isGroundedHash;
        private int _isCrouchingHash;
        private int _jumpHash;
        private int _landHash;
        private int _freeFallHash;

        private bool _hasAnimator;

        #region Unity Lifecycle

        private void Awake()
        {
            CacheComponents();
            CacheAnimatorHashes();
        }

        private void CacheComponents()
        {
            if (_animator == null)
                _animator = GetComponentInChildren<Animator>();

            if (_controller == null)
                _controller = GetComponent<PlayerController>();

            if (_inputHandler == null)
                _inputHandler = GetComponent<PlayerInputHandler>();

            _hasAnimator = _animator != null;

            if (!_hasAnimator)
            {
                Debug.LogWarning("[PlayerAnimator] No Animator found. Animations disabled.");
            }
        }

        private void CacheAnimatorHashes()
        {
            _speedHash = Animator.StringToHash(_speedParameter);
            _motionSpeedHash = Animator.StringToHash(_motionSpeedParameter);
            _isGroundedHash = Animator.StringToHash(_isGroundedParameter);
            _isCrouchingHash = Animator.StringToHash(_isCrouchingParameter);
            _jumpHash = Animator.StringToHash(_jumpTrigger);
            _landHash = Animator.StringToHash(_landTrigger);
            _freeFallHash = Animator.StringToHash(_freeFallParameter);
        }

        private void Update()
        {
            if (!_hasAnimator || _controller == null)
                return;

            UpdateLocomotion();
            UpdateAirState();
            UpdateCrouch();
        }

        #endregion

        #region Animation Updates

        private void UpdateLocomotion()
        {
            // Calculate target speed (normalized 0-1 for blend tree)
            float rawSpeed = _controller.CurrentSpeed;
            float normalizedSpeed = CalculateNormalizedSpeed(rawSpeed);

            // Smooth speed transitions
            _currentSpeed = Mathf.SmoothDamp(
                _currentSpeed,
                normalizedSpeed,
                ref _speedVelocity,
                _animationSmoothTime
            );

            // Motion speed affects animation playback rate
            float targetMotionSpeed = rawSpeed > _idleThreshold ? 1f : 0f;
            _currentMotionSpeed = Mathf.SmoothDamp(
                _currentMotionSpeed,
                targetMotionSpeed,
                ref _motionSpeedVelocity,
                _animationSmoothTime
            );

            // Apply to animator
            _animator.SetFloat(_speedHash, _currentSpeed);

            if (HasParameter(_motionSpeedHash))
            {
                _animator.SetFloat(_motionSpeedHash, _currentMotionSpeed);
            }

            if (_debugMode)
            {
                Debug.Log($"[PlayerAnimator] Speed: {_currentSpeed:F2} (raw: {rawSpeed:F2})");
            }
        }

        private float CalculateNormalizedSpeed(float rawSpeed)
        {
            // Map raw speed to normalized value for blend tree
            // 0 = idle, 0.5 = walk, 1 = run/sprint
            if (rawSpeed < _idleThreshold)
                return 0f;

            if (rawSpeed < _walkThreshold)
            {
                // Interpolate between idle and walk
                float t = Mathf.InverseLerp(_idleThreshold, _walkThreshold, rawSpeed);
                return Mathf.Lerp(0f, 0.5f, t);
            }

            if (rawSpeed < _runThreshold)
            {
                // Interpolate between walk and run
                float t = Mathf.InverseLerp(_walkThreshold, _runThreshold, rawSpeed);
                return Mathf.Lerp(0.5f, 1f, t);
            }

            return 1f;
        }

        private void UpdateAirState()
        {
            bool isGrounded = _controller.IsGrounded;
            _animator.SetBool(_isGroundedHash, isGrounded);

            if (isGrounded)
            {
                // Just landed
                if (!_wasGrounded && _airTime > _freeFallThreshold)
                {
                    TriggerLand();
                }
                _airTime = 0f;

                if (HasParameter(_freeFallHash))
                {
                    _animator.SetBool(_freeFallHash, false);
                }
            }
            else
            {
                // In air
                _airTime += Time.deltaTime;

                // Trigger free fall animation after threshold
                if (_airTime > _freeFallThreshold && HasParameter(_freeFallHash))
                {
                    _animator.SetBool(_freeFallHash, true);
                }
            }

            _wasGrounded = isGrounded;
        }

        private void UpdateCrouch()
        {
            if (_inputHandler != null && HasParameter(_isCrouchingHash))
            {
                _animator.SetBool(_isCrouchingHash, _inputHandler.CrouchHeld);
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Trigger jump animation.
        /// </summary>
        public void TriggerJump()
        {
            if (_hasAnimator)
            {
                _animator.SetTrigger(_jumpHash);
                _airTime = 0f;

                if (_debugMode)
                {
                    Debug.Log("[PlayerAnimator] Jump triggered");
                }
            }
        }

        /// <summary>
        /// Trigger land animation.
        /// </summary>
        public void TriggerLand()
        {
            if (_hasAnimator && HasParameter(_landHash))
            {
                _animator.SetTrigger(_landHash);

                if (_debugMode)
                {
                    Debug.Log("[PlayerAnimator] Land triggered");
                }
            }
        }

        /// <summary>
        /// Play a specific animation state.
        /// </summary>
        public void PlayState(string stateName, int layer = 0)
        {
            if (_hasAnimator)
            {
                _animator.Play(stateName, layer);
            }
        }

        /// <summary>
        /// Cross fade to a specific animation state.
        /// </summary>
        public void CrossFadeTo(string stateName, float duration = 0.25f, int layer = 0)
        {
            if (_hasAnimator)
            {
                _animator.CrossFade(stateName, duration, layer);
            }
        }

        /// <summary>
        /// Set the Animator component (for runtime avatar swap).
        /// </summary>
        public void SetAnimator(Animator animator)
        {
            _animator = animator;
            _hasAnimator = animator != null;
            CacheAnimatorHashes();
        }

        /// <summary>
        /// Get the current Animator component.
        /// </summary>
        public Animator GetAnimator()
        {
            return _animator;
        }

        /// <summary>
        /// Check if avatar has an animator configured.
        /// </summary>
        public bool HasAnimator => _hasAnimator;

        #endregion

        #region Utility

        private bool HasParameter(int hash)
        {
            if (!_hasAnimator) return false;

            foreach (var param in _animator.parameters)
            {
                if (param.nameHash == hash)
                    return true;
            }
            return false;
        }

        /// <summary>
        /// Force refresh component references.
        /// </summary>
        public void RefreshReferences()
        {
            CacheComponents();
        }

        #endregion

        #region Editor

        private void OnValidate()
        {
            // Validate thresholds
            _idleThreshold = Mathf.Max(0f, _idleThreshold);
            _walkThreshold = Mathf.Max(_idleThreshold, _walkThreshold);
            _runThreshold = Mathf.Max(_walkThreshold, _runThreshold);
        }

        #endregion
    }
}

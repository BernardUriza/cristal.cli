using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Handles animation logic for the player character.
    /// Syncs animator parameters with PlayerController state.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    [RequireComponent(typeof(PlayerController))]
    public class PlayerAnimator : MonoBehaviour
    {
        [Header("Animation Parameters")]
        [SerializeField] private string _speedParameter = "Speed";
        [SerializeField] private string _isGroundedParameter = "IsGrounded";
        [SerializeField] private string _jumpTrigger = "Jump";

        [Header("Settings")]
        [SerializeField] private float _animationSmoothTime = 0.1f;
        [SerializeField] private bool _debugMode = false;

        private Animator _animator;
        private PlayerController _controller;
        private float _currentSpeed;
        private float _speedVelocity;

        // Animator parameter hashes (more efficient than strings)
        private int _speedHash;
        private int _isGroundedHash;
        private int _jumpHash;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            _controller = GetComponent<PlayerController>();

            // Cache animator parameter hashes
            _speedHash = Animator.StringToHash(_speedParameter);
            _isGroundedHash = Animator.StringToHash(_isGroundedParameter);
            _jumpHash = Animator.StringToHash(_jumpTrigger);
        }

        private void Update()
        {
            if (_animator == null || _controller == null)
            {
                return;
            }

            UpdateAnimationParameters();
        }

        private void UpdateAnimationParameters()
        {
            // Smooth speed transition
            float targetSpeed = _controller.CurrentSpeed;
            _currentSpeed = Mathf.SmoothDamp(_currentSpeed, targetSpeed, ref _speedVelocity, _animationSmoothTime);

            // Set animator parameters
            _animator.SetFloat(_speedHash, _currentSpeed);
            _animator.SetBool(_isGroundedHash, _controller.IsGrounded);

            if (_debugMode)
            {
                Debug.Log($"[PlayerAnimator] Speed: {_currentSpeed:F2}, Grounded: {_controller.IsGrounded}");
            }
        }

        /// <summary>
        /// Trigger jump animation (call from PlayerController when jumping).
        /// </summary>
        public void TriggerJump()
        {
            if (_animator != null)
            {
                _animator.SetTrigger(_jumpHash);

                if (_debugMode)
                {
                    Debug.Log("[PlayerAnimator] Jump triggered");
                }
            }
        }

        /// <summary>
        /// Get the underlying Animator component.
        /// </summary>
        public Animator GetAnimator()
        {
            return _animator;
        }
    }
}

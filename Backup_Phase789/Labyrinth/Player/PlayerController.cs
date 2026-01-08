using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Third-person player controller using CharacterController.
    /// Handles movement, gravity, and basic locomotion.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    [RequireComponent(typeof(PlayerInputHandler))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement")]
        [SerializeField] private float _walkSpeed = 4f;
        [SerializeField] private float _sprintSpeed = 7f;
        [SerializeField] private float _crouchSpeed = 2f;
        [SerializeField] private float _rotationSpeed = 10f;

        [Header("Gravity & Jump")]
        [SerializeField] private float _gravity = -15f;
        [SerializeField] private float _jumpHeight = 1.2f;
        [SerializeField] private float _groundCheckDistance = 0.2f;
        [SerializeField] private LayerMask _groundMask = -1;

        [Header("Camera Reference")]
        [SerializeField] private Transform _cameraTransform;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Components
        private CharacterController _controller;
        private PlayerInputHandler _inputHandler;
        private PlayerAnimator _playerAnimator;

        // State
        private Vector3 _velocity;
        private bool _isGrounded;
        private bool _canMove = true;

        public bool IsGrounded => _isGrounded;
        public bool CanMove => _canMove;
        public float CurrentSpeed => _controller.velocity.magnitude;

        private void Awake()
        {
            _controller = GetComponent<CharacterController>();
            _inputHandler = GetComponent<PlayerInputHandler>();
            _playerAnimator = GetComponent<PlayerAnimator>();
        }

        private void Start()
        {
            // Try to find camera if not assigned
            if (_cameraTransform == null)
            {
                var cam = Camera.main;
                if (cam != null)
                {
                    _cameraTransform = cam.transform;
                }
            }

            // Lock cursor for exploration
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        private void Update()
        {
            if (!_canMove)
            {
                // Still apply gravity when movement is disabled
                ApplyGravity();
                return;
            }

            CheckGrounded();
            HandleMovement();
            ApplyGravity();
            HandleJump();
        }

        #region Movement

        private void CheckGrounded()
        {
            // Check if we're on the ground using a sphere cast
            Vector3 spherePosition = transform.position + Vector3.up * _groundCheckDistance;
            _isGrounded = Physics.CheckSphere(spherePosition, _groundCheckDistance, _groundMask, QueryTriggerInteraction.Ignore);

            // Reset vertical velocity when grounded
            if (_isGrounded && _velocity.y < 0)
            {
                _velocity.y = -2f; // Small negative value to keep grounded
            }
        }

        private void HandleMovement()
        {
            Vector2 input = _inputHandler.MoveInput;

            if (input.sqrMagnitude < 0.01f)
            {
                return;
            }

            // Get camera-relative movement direction
            Vector3 forward = _cameraTransform != null ? _cameraTransform.forward : transform.forward;
            Vector3 right = _cameraTransform != null ? _cameraTransform.right : transform.right;

            // Flatten to horizontal plane
            forward.y = 0;
            right.y = 0;
            forward.Normalize();
            right.Normalize();

            // Calculate move direction
            Vector3 moveDirection = forward * input.y + right * input.x;
            moveDirection.Normalize();

            // Determine speed based on input modifiers
            float targetSpeed = _walkSpeed;
            if (_inputHandler.SprintHeld && !_inputHandler.CrouchHeld)
            {
                targetSpeed = _sprintSpeed;
            }
            else if (_inputHandler.CrouchHeld)
            {
                targetSpeed = _crouchSpeed;
            }

            // Move the character
            _controller.Move(moveDirection * targetSpeed * Time.deltaTime);

            // Rotate towards movement direction
            if (moveDirection.sqrMagnitude > 0.01f)
            {
                Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, _rotationSpeed * Time.deltaTime);
            }

            if (_debugMode)
            {
                Debug.DrawRay(transform.position, moveDirection * 2f, Color.blue);
            }
        }

        private void ApplyGravity()
        {
            _velocity.y += _gravity * Time.deltaTime;
            _controller.Move(_velocity * Time.deltaTime);
        }

        private void HandleJump()
        {
            if (_inputHandler.JumpPressed && _isGrounded)
            {
                // Calculate jump velocity: v = sqrt(-2 * gravity * height)
                _velocity.y = Mathf.Sqrt(_jumpHeight * -2f * _gravity);
                _inputHandler.ConsumeJump();

                // Trigger animation if animator exists
                if (_playerAnimator != null)
                {
                    _playerAnimator.TriggerJump();
                }

                if (_debugMode)
                {
                    Debug.Log("[PlayerController] Jump!");
                }
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Disable player movement (for console interaction).
        /// </summary>
        public void DisableMovement()
        {
            _canMove = false;
            _inputHandler.SetInputEnabled(false);

            if (_debugMode)
            {
                Debug.Log("[PlayerController] Movement disabled");
            }
        }

        /// <summary>
        /// Enable player movement (returning from console).
        /// </summary>
        public void EnableMovement()
        {
            _canMove = true;
            _inputHandler.SetInputEnabled(true);

            if (_debugMode)
            {
                Debug.Log("[PlayerController] Movement enabled");
            }
        }

        /// <summary>
        /// Teleport player to a specific position.
        /// </summary>
        public void TeleportTo(Vector3 position)
        {
            _controller.enabled = false;
            transform.position = position;
            _controller.enabled = true;
            _velocity = Vector3.zero;
        }

        /// <summary>
        /// Teleport player to a specific position and rotation.
        /// </summary>
        public void TeleportTo(Vector3 position, Quaternion rotation)
        {
            _controller.enabled = false;
            transform.position = position;
            transform.rotation = rotation;
            _controller.enabled = true;
            _velocity = Vector3.zero;
        }

        /// <summary>
        /// Set the camera transform reference.
        /// </summary>
        public void SetCameraTransform(Transform cameraTransform)
        {
            _cameraTransform = cameraTransform;
        }

        #endregion

        private void OnDrawGizmosSelected()
        {
            // Draw ground check sphere
            Gizmos.color = _isGrounded ? Color.green : Color.red;
            Vector3 spherePosition = transform.position + Vector3.up * _groundCheckDistance;
            Gizmos.DrawWireSphere(spherePosition, _groundCheckDistance);
        }
    }
}

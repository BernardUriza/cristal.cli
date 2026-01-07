using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Third-person camera that follows the player.
    /// Supports focusing on consoles for terminal interaction.
    /// </summary>
    public class PlayerCamera : MonoBehaviour
    {
        [Header("Follow Settings")]
        [SerializeField] private Transform _target;
        [SerializeField] private Vector3 _offset = new Vector3(0f, 2.5f, -4f);
        [SerializeField] private float _followSmoothSpeed = 8f;

        [Header("Look Settings")]
        [SerializeField] private float _lookSensitivity = 2f;
        [SerializeField] private float _minPitch = -30f;
        [SerializeField] private float _maxPitch = 60f;
        [SerializeField] private float _orbitDistance = 4f;

        [Header("Console Focus")]
        [SerializeField] private float _consoleFocusDuration = 0.5f;
        [SerializeField] private Vector3 _consoleFocusOffset = new Vector3(0f, 0.5f, 1.5f);

        [Header("Collision")]
        [SerializeField] private float _collisionRadius = 0.3f;
        [SerializeField] private LayerMask _collisionMask = -1;
        [SerializeField] private float _minDistance = 1f;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Camera state
        private float _yaw;
        private float _pitch;
        private Vector3 _currentOffset;
        private bool _isFollowing = true;

        // Console focus state
        private bool _isFocusingOnConsole;
        private Transform _focusTarget;
        private Vector3 _focusStartPosition;
        private Quaternion _focusStartRotation;
        private Vector3 _focusEndPosition;
        private Quaternion _focusEndRotation;
        private float _focusTimer;

        // Input reference
        private PlayerInputHandler _inputHandler;

        private void Awake()
        {
            _currentOffset = _offset;
        }

        private void Start()
        {
            // Find input handler from player
            if (_target != null)
            {
                _inputHandler = _target.GetComponent<PlayerInputHandler>();
            }

            // Initialize rotation based on current camera orientation
            Vector3 euler = transform.eulerAngles;
            _yaw = euler.y;
            _pitch = euler.x;

            if (_pitch > 180f) _pitch -= 360f;
        }

        private void LateUpdate()
        {
            if (_isFocusingOnConsole)
            {
                UpdateConsoleFocus();
                return;
            }

            if (!_isFollowing || _target == null)
            {
                return;
            }

            HandleCameraRotation();
            HandleCameraPosition();
        }

        #region Following Mode

        private void HandleCameraRotation()
        {
            if (_inputHandler == null) return;

            Vector2 lookInput = _inputHandler.LookInput;

            // Apply look input
            _yaw += lookInput.x * _lookSensitivity;
            _pitch -= lookInput.y * _lookSensitivity;

            // Clamp pitch
            _pitch = Mathf.Clamp(_pitch, _minPitch, _maxPitch);
        }

        private void HandleCameraPosition()
        {
            // Calculate camera rotation
            Quaternion rotation = Quaternion.Euler(_pitch, _yaw, 0f);

            // Calculate desired position
            Vector3 targetPosition = _target.position + Vector3.up * _offset.y;
            Vector3 desiredPosition = targetPosition + rotation * new Vector3(0f, 0f, -_orbitDistance);

            // Check for collision
            Vector3 actualPosition = CheckCameraCollision(targetPosition, desiredPosition);

            // Smooth follow
            transform.position = Vector3.Lerp(transform.position, actualPosition, _followSmoothSpeed * Time.deltaTime);

            // Look at target
            Vector3 lookTarget = _target.position + Vector3.up * (_offset.y * 0.5f);
            transform.LookAt(lookTarget);

            if (_debugMode)
            {
                Debug.DrawLine(targetPosition, desiredPosition, Color.yellow);
                Debug.DrawLine(targetPosition, actualPosition, Color.green);
            }
        }

        private Vector3 CheckCameraCollision(Vector3 from, Vector3 to)
        {
            Vector3 direction = to - from;
            float distance = direction.magnitude;

            if (Physics.SphereCast(from, _collisionRadius, direction.normalized, out RaycastHit hit, distance, _collisionMask, QueryTriggerInteraction.Ignore))
            {
                // Camera hit something - move it closer
                float newDistance = Mathf.Max(hit.distance - _collisionRadius, _minDistance);
                return from + direction.normalized * newDistance;
            }

            return to;
        }

        #endregion

        #region Console Focus

        /// <summary>
        /// Smoothly focus the camera on a console for terminal interaction.
        /// </summary>
        public void FocusOnConsole(Transform consoleTransform)
        {
            if (consoleTransform == null) return;

            _isFollowing = false;
            _isFocusingOnConsole = true;
            _focusTarget = consoleTransform;
            _focusTimer = 0f;

            // Store start position/rotation
            _focusStartPosition = transform.position;
            _focusStartRotation = transform.rotation;

            // Calculate end position - in front of console, looking at it
            Vector3 consoleForward = consoleTransform.forward;
            _focusEndPosition = consoleTransform.position + consoleForward * _consoleFocusOffset.z + Vector3.up * _consoleFocusOffset.y;
            _focusEndRotation = Quaternion.LookRotation(-consoleForward);

            if (_debugMode)
            {
                Debug.Log($"[PlayerCamera] Focusing on console at {consoleTransform.position}");
            }
        }

        /// <summary>
        /// Return camera to following the player.
        /// </summary>
        public void ReturnToFollow()
        {
            if (!_isFocusingOnConsole && _isFollowing) return;

            _isFocusingOnConsole = true;
            _focusTimer = 0f;

            // Store current state as start
            _focusStartPosition = transform.position;
            _focusStartRotation = transform.rotation;

            // Calculate return position based on current yaw/pitch
            if (_target != null)
            {
                Quaternion rotation = Quaternion.Euler(_pitch, _yaw, 0f);
                Vector3 targetPosition = _target.position + Vector3.up * _offset.y;
                _focusEndPosition = targetPosition + rotation * new Vector3(0f, 0f, -_orbitDistance);
                _focusEndRotation = Quaternion.LookRotation(_target.position + Vector3.up - _focusEndPosition);
            }
            else
            {
                _focusEndPosition = _focusStartPosition;
                _focusEndRotation = _focusStartRotation;
            }

            // After transition completes, resume following
            _focusTarget = null;

            if (_debugMode)
            {
                Debug.Log("[PlayerCamera] Returning to follow mode");
            }
        }

        private void UpdateConsoleFocus()
        {
            _focusTimer += Time.deltaTime;
            float t = Mathf.Clamp01(_focusTimer / _consoleFocusDuration);

            // Use smooth step for easing
            t = t * t * (3f - 2f * t);

            // Interpolate position and rotation
            transform.position = Vector3.Lerp(_focusStartPosition, _focusEndPosition, t);
            transform.rotation = Quaternion.Slerp(_focusStartRotation, _focusEndRotation, t);

            // Check if transition is complete
            if (t >= 1f)
            {
                _isFocusingOnConsole = false;

                // If we were returning to follow, enable following
                if (_focusTarget == null)
                {
                    _isFollowing = true;
                }
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Set the target to follow.
        /// </summary>
        public void SetTarget(Transform target)
        {
            _target = target;
            if (target != null)
            {
                _inputHandler = target.GetComponent<PlayerInputHandler>();
            }
        }

        /// <summary>
        /// Set the look sensitivity.
        /// </summary>
        public void SetLookSensitivity(float sensitivity)
        {
            _lookSensitivity = sensitivity;
        }

        /// <summary>
        /// Get the current forward direction (for movement).
        /// </summary>
        public Vector3 GetForwardDirection()
        {
            Vector3 forward = transform.forward;
            forward.y = 0;
            return forward.normalized;
        }

        /// <summary>
        /// Get the current right direction (for movement).
        /// </summary>
        public Vector3 GetRightDirection()
        {
            Vector3 right = transform.right;
            right.y = 0;
            return right.normalized;
        }

        #endregion

        private void OnDrawGizmosSelected()
        {
            if (_target == null) return;

            // Draw orbit circle
            Gizmos.color = Color.cyan;
            Vector3 center = _target.position + Vector3.up * _offset.y;

            int segments = 32;
            for (int i = 0; i < segments; i++)
            {
                float angle1 = (i / (float)segments) * 360f * Mathf.Deg2Rad;
                float angle2 = ((i + 1) / (float)segments) * 360f * Mathf.Deg2Rad;

                Vector3 p1 = center + new Vector3(Mathf.Sin(angle1) * _orbitDistance, 0, Mathf.Cos(angle1) * _orbitDistance);
                Vector3 p2 = center + new Vector3(Mathf.Sin(angle2) * _orbitDistance, 0, Mathf.Cos(angle2) * _orbitDistance);

                Gizmos.DrawLine(p1, p2);
            }

            // Draw current offset
            Gizmos.color = Color.yellow;
            Gizmos.DrawLine(_target.position, _target.position + _offset);
        }
    }
}

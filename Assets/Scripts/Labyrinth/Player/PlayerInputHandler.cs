using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Handles Input System events and provides clean input values to other player components.
    /// Uses InputActionAsset directly for maximum compatibility.
    /// </summary>
    public class PlayerInputHandler : MonoBehaviour
    {
        [Header("Input Asset")]
        [SerializeField] private InputActionAsset _inputActions;

        [Header("Settings")]
        [SerializeField] private float _lookSensitivity = 1f;

        // Input values
        public Vector2 MoveInput { get; private set; }
        public Vector2 LookInput { get; private set; }
        public bool SprintHeld { get; private set; }
        public bool CrouchHeld { get; private set; }
        public bool JumpPressed { get; private set; }

        // Events
        public event Action OnInteractPressed;
        public event Action OnInteractReleased;
        public event Action OnJumpPressed;

        // Action references
        private InputAction _moveAction;
        private InputAction _lookAction;
        private InputAction _sprintAction;
        private InputAction _crouchAction;
        private InputAction _jumpAction;
        private InputAction _interactAction;

        private bool _inputEnabled = true;

        private void Awake()
        {
            // Try to load from Resources if not assigned
            if (_inputActions == null)
            {
                _inputActions = Resources.Load<InputActionAsset>("InputSystem_Actions");
            }

            if (_inputActions == null)
            {
                Debug.LogWarning("[PlayerInputHandler] No InputActionAsset assigned or found!");
                return;
            }

            // Get action references from Player action map
            var playerMap = _inputActions.FindActionMap("Player");
            if (playerMap != null)
            {
                _moveAction = playerMap.FindAction("Move");
                _lookAction = playerMap.FindAction("Look");
                _sprintAction = playerMap.FindAction("Sprint");
                _crouchAction = playerMap.FindAction("Crouch");
                _jumpAction = playerMap.FindAction("Jump");
                _interactAction = playerMap.FindAction("Interact");
            }
        }

        private void OnEnable()
        {
            EnableActions();
            SubscribeToActions();
        }

        private void OnDisable()
        {
            UnsubscribeFromActions();
            DisableActions();
        }

        private void EnableActions()
        {
            _moveAction?.Enable();
            _lookAction?.Enable();
            _sprintAction?.Enable();
            _crouchAction?.Enable();
            _jumpAction?.Enable();
            _interactAction?.Enable();
        }

        private void DisableActions()
        {
            _moveAction?.Disable();
            _lookAction?.Disable();
            _sprintAction?.Disable();
            _crouchAction?.Disable();
            _jumpAction?.Disable();
            _interactAction?.Disable();
        }

        private void SubscribeToActions()
        {
            if (_moveAction != null)
            {
                _moveAction.performed += OnMovePerformed;
                _moveAction.canceled += OnMoveCanceled;
            }

            if (_lookAction != null)
            {
                _lookAction.performed += OnLookPerformed;
                _lookAction.canceled += OnLookCanceled;
            }

            if (_sprintAction != null)
            {
                _sprintAction.performed += OnSprintPerformed;
                _sprintAction.canceled += OnSprintCanceled;
            }

            if (_crouchAction != null)
            {
                _crouchAction.performed += OnCrouchPerformed;
                _crouchAction.canceled += OnCrouchCanceled;
            }

            if (_jumpAction != null)
            {
                _jumpAction.performed += OnJumpPerformed;
            }

            if (_interactAction != null)
            {
                _interactAction.performed += OnInteractPerformed;
                _interactAction.canceled += OnInteractCanceled;
            }
        }

        private void UnsubscribeFromActions()
        {
            if (_moveAction != null)
            {
                _moveAction.performed -= OnMovePerformed;
                _moveAction.canceled -= OnMoveCanceled;
            }

            if (_lookAction != null)
            {
                _lookAction.performed -= OnLookPerformed;
                _lookAction.canceled -= OnLookCanceled;
            }

            if (_sprintAction != null)
            {
                _sprintAction.performed -= OnSprintPerformed;
                _sprintAction.canceled -= OnSprintCanceled;
            }

            if (_crouchAction != null)
            {
                _crouchAction.performed -= OnCrouchPerformed;
                _crouchAction.canceled -= OnCrouchCanceled;
            }

            if (_jumpAction != null)
            {
                _jumpAction.performed -= OnJumpPerformed;
            }

            if (_interactAction != null)
            {
                _interactAction.performed -= OnInteractPerformed;
                _interactAction.canceled -= OnInteractCanceled;
            }
        }

        #region Input Callbacks

        private void OnMovePerformed(InputAction.CallbackContext ctx)
        {
            if (_inputEnabled)
                MoveInput = ctx.ReadValue<Vector2>();
        }

        private void OnMoveCanceled(InputAction.CallbackContext ctx)
        {
            MoveInput = Vector2.zero;
        }

        private void OnLookPerformed(InputAction.CallbackContext ctx)
        {
            if (_inputEnabled)
                LookInput = ctx.ReadValue<Vector2>() * _lookSensitivity;
        }

        private void OnLookCanceled(InputAction.CallbackContext ctx)
        {
            LookInput = Vector2.zero;
        }

        private void OnSprintPerformed(InputAction.CallbackContext ctx)
        {
            SprintHeld = _inputEnabled;
        }

        private void OnSprintCanceled(InputAction.CallbackContext ctx)
        {
            SprintHeld = false;
        }

        private void OnCrouchPerformed(InputAction.CallbackContext ctx)
        {
            CrouchHeld = _inputEnabled;
        }

        private void OnCrouchCanceled(InputAction.CallbackContext ctx)
        {
            CrouchHeld = false;
        }

        private void OnJumpPerformed(InputAction.CallbackContext ctx)
        {
            if (_inputEnabled)
            {
                JumpPressed = true;
                OnJumpPressed?.Invoke();
            }
        }

        private void OnInteractPerformed(InputAction.CallbackContext ctx)
        {
            if (_inputEnabled)
                OnInteractPressed?.Invoke();
        }

        private void OnInteractCanceled(InputAction.CallbackContext ctx)
        {
            OnInteractReleased?.Invoke();
        }

        #endregion

        #region Public Methods

        /// <summary>
        /// Enable or disable all input processing.
        /// </summary>
        public void SetInputEnabled(bool enabled)
        {
            _inputEnabled = enabled;

            if (!enabled)
            {
                // Clear all inputs when disabled
                MoveInput = Vector2.zero;
                LookInput = Vector2.zero;
                SprintHeld = false;
                CrouchHeld = false;
                JumpPressed = false;
            }
        }

        /// <summary>
        /// Consume the jump input (call after processing jump).
        /// </summary>
        public void ConsumeJump()
        {
            JumpPressed = false;
        }

        /// <summary>
        /// Set look sensitivity multiplier.
        /// </summary>
        public void SetLookSensitivity(float sensitivity)
        {
            _lookSensitivity = sensitivity;
        }

        /// <summary>
        /// Assign the input action asset at runtime.
        /// </summary>
        public void SetInputActionAsset(InputActionAsset asset)
        {
            // Unsubscribe from old
            UnsubscribeFromActions();
            DisableActions();

            _inputActions = asset;

            // Get new action references
            if (_inputActions != null)
            {
                var playerMap = _inputActions.FindActionMap("Player");
                if (playerMap != null)
                {
                    _moveAction = playerMap.FindAction("Move");
                    _lookAction = playerMap.FindAction("Look");
                    _sprintAction = playerMap.FindAction("Sprint");
                    _crouchAction = playerMap.FindAction("Crouch");
                    _jumpAction = playerMap.FindAction("Jump");
                    _interactAction = playerMap.FindAction("Interact");
                }

                EnableActions();
                SubscribeToActions();
            }
        }

        #endregion
    }
}

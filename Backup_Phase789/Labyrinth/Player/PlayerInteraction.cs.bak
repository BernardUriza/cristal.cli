using UnityEngine;
using TMPro;
using Cristal.CLI.Labyrinth.UI;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Handles player interaction with IInteractable objects via raycasting.
    /// Shows interaction prompt and triggers interaction on E key press.
    /// </summary>
    [RequireComponent(typeof(PlayerInputHandler))]
    public class PlayerInteraction : MonoBehaviour
    {
        [Header("Raycast Settings")]
        [SerializeField] private float _interactRange = 3f;
        [SerializeField] private LayerMask _interactableMask = -1;
        [SerializeField] private Transform _raycastOrigin;

        [Header("Floating Prompt")]
        [SerializeField] private FloatingInteractPrompt _floatingPrompt;
        [SerializeField] private bool _useFloatingPrompt = true;

        [Header("Prompt Controller (Contextual)")]
        [SerializeField] private FloatingPromptController _promptController;

        [Header("UI (Legacy)")]
        [SerializeField] private GameObject _promptPanel;
        [SerializeField] private TextMeshProUGUI _promptText;
        [SerializeField] private string _defaultPromptFormat = "Press E to {0}";

        [Header("Camera Reference")]
        [SerializeField] private Camera _playerCamera;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        private PlayerInputHandler _inputHandler;
        private IInteractable _currentTarget;
        private Transform _currentTargetTransform;
        private bool _isEnabled = true;

        public IInteractable CurrentTarget => _currentTarget;

        private void Awake()
        {
            _inputHandler = GetComponent<PlayerInputHandler>();
        }

        private void Start()
        {
            // Find camera if not assigned
            if (_playerCamera == null)
            {
                _playerCamera = Camera.main;
            }

            // Subscribe to interact input
            _inputHandler.OnInteractPressed += HandleInteractPressed;

            // Hide prompt initially
            if (_promptPanel != null)
            {
                _promptPanel.SetActive(false);
            }
        }

        private void OnDestroy()
        {
            if (_inputHandler != null)
            {
                _inputHandler.OnInteractPressed -= HandleInteractPressed;
            }
        }

        private void Update()
        {
            if (!_isEnabled)
            {
                ClearTarget();
                return;
            }

            CheckForInteractables();
        }

        #region Raycast Detection

        private void CheckForInteractables()
        {
            Transform origin = _raycastOrigin != null ? _raycastOrigin : (_playerCamera != null ? _playerCamera.transform : transform);

            Ray ray = new Ray(origin.position, origin.forward);

            if (_debugMode)
            {
                Debug.DrawRay(ray.origin, ray.direction * _interactRange, Color.cyan);
            }

            if (Physics.Raycast(ray, out RaycastHit hit, _interactRange, _interactableMask, QueryTriggerInteraction.Collide))
            {
                // Check if hit object has IInteractable
                IInteractable interactable = hit.collider.GetComponent<IInteractable>();
                Transform targetTransform = hit.collider.transform;

                if (interactable == null)
                {
                    // Check parent
                    interactable = hit.collider.GetComponentInParent<IInteractable>();
                    if (interactable != null)
                    {
                        targetTransform = (interactable as MonoBehaviour)?.transform ?? hit.collider.transform;
                    }
                }

                if (interactable != null)
                {
                    SetTarget(interactable, targetTransform);
                    return;
                }
            }

            ClearTarget();
        }

        private void SetTarget(IInteractable interactable, Transform targetTransform)
        {
            if (_currentTarget == interactable)
            {
                return;
            }

            // Unfocus previous target
            if (_currentTarget != null)
            {
                _currentTarget.OnUnfocus();
            }

            _currentTarget = interactable;
            _currentTargetTransform = targetTransform;
            _currentTarget.OnFocus();

            if (_promptController != null)
            {
                _promptController.SetTarget(_currentTarget, targetTransform);
            }
            else
            {
                // Show prompt (legacy/floating)
                ShowPrompt(_currentTarget.InteractPrompt, targetTransform);
            }

            if (_debugMode)
            {
                Debug.Log($"[PlayerInteraction] Target set: {_currentTarget.InteractPrompt}");
            }
        }

        private void ClearTarget()
        {
            if (_currentTarget == null)
            {
                return;
            }

            _currentTarget.OnUnfocus();
            _currentTarget = null;
            _currentTargetTransform = null;

            if (_promptController != null)
            {
                _promptController.ClearTarget();
            }
            else
            {
                HidePrompt();
            }

            if (_debugMode)
            {
                Debug.Log("[PlayerInteraction] Target cleared");
            }
        }

        #endregion

        #region Interaction

        private void HandleInteractPressed()
        {
            if (!_isEnabled || _currentTarget == null)
            {
                return;
            }

            if (!_currentTarget.CanInteract)
            {
                if (_debugMode)
                {
                    Debug.Log("[PlayerInteraction] Target cannot be interacted with right now");
                }
                return;
            }

            if (_debugMode)
            {
                Debug.Log($"[PlayerInteraction] Interacting with: {_currentTarget.InteractPrompt}");
            }

            _currentTarget.OnInteract(this);
        }

        #endregion

        #region UI

        private void ShowPrompt(string prompt, Transform target)
        {
            // Floating prompt (preferred)
            if (_useFloatingPrompt && _floatingPrompt != null)
            {
                _floatingPrompt.Show(target, prompt);
            }

            // Legacy panel prompt (fallback)
            if (_promptPanel != null)
            {
                _promptPanel.SetActive(true);
            }

            if (_promptText != null)
            {
                _promptText.text = string.Format(_defaultPromptFormat, prompt);
            }
        }

        private void HidePrompt()
        {
            // Hide floating prompt
            if (_floatingPrompt != null)
            {
                _floatingPrompt.Hide();
            }

            // Hide legacy panel
            if (_promptPanel != null)
            {
                _promptPanel.SetActive(false);
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Enable or disable interaction detection.
        /// </summary>
        public void SetEnabled(bool enabled)
        {
            _isEnabled = enabled;

            if (!enabled)
            {
                ClearTarget();
            }
        }

        /// <summary>
        /// Set the camera used for raycasting.
        /// </summary>
        public void SetCamera(Camera camera)
        {
            _playerCamera = camera;
        }

        /// <summary>
        /// Set the interaction range.
        /// </summary>
        public void SetInteractRange(float range)
        {
            _interactRange = range;
        }

        #endregion

        private void OnDrawGizmosSelected()
        {
            if (_playerCamera == null && _raycastOrigin == null) return;

            Transform origin = _raycastOrigin != null ? _raycastOrigin : (_playerCamera != null ? _playerCamera.transform : transform);

            Gizmos.color = Color.cyan;
            Gizmos.DrawRay(origin.position, origin.forward * _interactRange);
        }
    }
}

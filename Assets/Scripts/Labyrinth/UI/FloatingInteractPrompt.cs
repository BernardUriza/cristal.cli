using UnityEngine;
using TMPro;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Floating interaction prompt that appears above interactable objects.
    /// 
    /// Architecture:
    /// - Configuration is externalized to InteractPromptConfig ScriptableObject
    /// - Animation logic is delegated to IPromptAnimator for extensibility
    /// - State management uses immutable PromptState struct
    /// - Transitions are handled declaratively via PromptTransition
    /// 
    /// Usage:
    /// 1. Create InteractPromptConfig asset via Create > CRISTAL > Interact Prompt Config
    /// 2. Assign config to this component
    /// 3. Call Show(target) / Hide() from PlayerInteraction
    /// </summary>
    [DisallowMultipleComponent]
    public class FloatingInteractPrompt : MonoBehaviour
    {
        #region Serialized Fields

        [Header("Configuration")]
        [SerializeField] private InteractPromptConfig _config;

        [Header("UI References")]
        [SerializeField] private Canvas _canvas;
        [SerializeField] private CanvasGroup _canvasGroup;
        [SerializeField] private TextMeshProUGUI _keyText;
        [SerializeField] private TextMeshProUGUI _actionText;
        [SerializeField] private RectTransform _container;

        #endregion

        #region Private State

        private PromptState _currentState = PromptState.Hidden;
        private PromptTransition _transition = PromptTransition.Complete;
        private IPromptAnimator _animator;
        private Camera _mainCamera;
        private Vector3 _baseScale;
        private bool _isInitialized;

        #endregion

        #region Public Properties

        /// <summary>
        /// Current visibility state of the prompt.
        /// </summary>
        public bool IsVisible => _currentState.IsVisible;

        /// <summary>
        /// Current target transform the prompt is following.
        /// </summary>
        public Transform CurrentTarget => _currentState.Target;

        /// <summary>
        /// Allow runtime config changes for testing or dynamic themes.
        /// </summary>
        public InteractPromptConfig Config
        {
            get => _config;
            set
            {
                _config = value;
                ApplyConfigColors();
            }
        }

        #endregion

        #region Unity Lifecycle

        private void Awake()
        {
            Initialize();
        }

        private void OnEnable()
        {
            if (!_isInitialized)
            {
                Initialize();
            }
        }

        private void Update()
        {
            if (!_isInitialized) return;

            UpdateTransition();
            UpdatePosition();
            UpdateAnimation();
            UpdateVisibility();
        }

        private void LateUpdate()
        {
            if (!_isInitialized) return;
            UpdateBillboard();
        }

        #if UNITY_EDITOR
        private void OnValidate()
        {
            // Apply config changes in editor
            if (_config != null && _keyText != null)
            {
                ApplyConfigColors();
            }
        }
        #endif

        #endregion

        #region Initialization

        private void Initialize()
        {
            if (_isInitialized) return;

            // Validate required references
            if (!ValidateReferences())
            {
                Debug.LogError($"[FloatingInteractPrompt] Missing required references on {gameObject.name}", this);
                enabled = false;
                return;
            }

            // Cache references
            _mainCamera = Camera.main;
            _baseScale = _container.localScale;
            _animator = new DefaultPromptAnimator();

            // Initialize to hidden state
            _currentState = PromptState.Hidden;
            _canvasGroup.alpha = 0f;
            gameObject.SetActive(false);

            // Apply initial colors from config
            ApplyConfigColors();

            _isInitialized = true;
        }

        private bool ValidateReferences()
        {
            bool valid = true;

            if (_config == null)
            {
                Debug.LogWarning($"[FloatingInteractPrompt] No InteractPromptConfig assigned. Using defaults.", this);
            }

            if (_canvasGroup == null)
            {
                Debug.LogError("[FloatingInteractPrompt] CanvasGroup is required", this);
                valid = false;
            }

            if (_container == null)
            {
                Debug.LogError("[FloatingInteractPrompt] Container RectTransform is required", this);
                valid = false;
            }

            if (_keyText == null)
            {
                Debug.LogWarning("[FloatingInteractPrompt] KeyText not assigned", this);
            }

            return valid;
        }

        private void ApplyConfigColors()
        {
            if (_config == null) return;

            if (_keyText != null)
            {
                _keyText.color = _config.textColor;
            }

            if (_actionText != null)
            {
                _actionText.color = _config.textColor * 0.8f;
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Show the prompt above the specified target.
        /// </summary>
        /// <param name="target">Transform to follow</param>
        /// <param name="actionText">Optional action description (e.g., "Interact", "Open")</param>
        /// <param name="keyText">Key to display (default: "E")</param>
        public void Show(Transform target, string actionText = null, string keyText = "E")
        {
            if (target == null)
            {
                Debug.LogWarning("[FloatingInteractPrompt] Show called with null target");
                return;
            }

            // Update state
            _currentState = new PromptState(
                target: target,
                keyText: keyText,
                actionText: actionText ?? "",
                isVisible: true,
                showTime: Time.time
            );

            // Start fade in transition
            float fadeDuration = _config != null ? _config.fadeDuration : 0.2f;
            _transition = PromptTransition.FadeIn(fadeDuration);

            // Update UI text
            UpdateTextElements();

            // Activate
            gameObject.SetActive(true);

            // Immediately position to avoid pop-in
            UpdatePositionImmediate();
        }

        /// <summary>
        /// Hide the prompt with fade out animation.
        /// </summary>
        public void Hide()
        {
            if (!_currentState.IsVisible) return;

            _currentState = _currentState.WithVisibility(false, Time.time);

            float fadeDuration = _config != null ? _config.fadeDuration : 0.2f;
            _transition = PromptTransition.FadeOut(fadeDuration);
        }

        /// <summary>
        /// Immediately hide without animation (for cleanup).
        /// </summary>
        public void HideImmediate()
        {
            _currentState = PromptState.Hidden;
            _transition = PromptTransition.Complete;
            _canvasGroup.alpha = 0f;
            gameObject.SetActive(false);
        }

        /// <summary>
        /// Switch to a different animator for custom effects.
        /// </summary>
        public void SetAnimator(IPromptAnimator animator)
        {
            _animator = animator ?? new DefaultPromptAnimator();
        }

        /// <summary>
        /// Update camera reference (call after camera changes).
        /// </summary>
        public void RefreshCamera()
        {
            _mainCamera = Camera.main;
        }

        /// <summary>
        /// Set the key text (default is "E").
        /// </summary>
        public void SetKeyText(string key)
        {
            if (_keyText != null)
            {
                _keyText.text = key;
            }
        }

        /// <summary>
        /// Update the main camera reference (legacy API, use RefreshCamera).
        /// </summary>
        public void SetCamera(Camera camera)
        {
            _mainCamera = camera;
        }

        #endregion

        #region Update Methods

        private void UpdateTransition()
        {
            if (_transition.IsComplete) return;

            _transition.Update(Time.deltaTime);

            // Apply fade curve if available
            float alpha = _transition.Alpha;
            if (_config != null && _config.fadeCurve != null && _config.fadeCurve.length > 0)
            {
                alpha = _config.fadeCurve.Evaluate(_transition.Alpha);
            }

            _canvasGroup.alpha = alpha;
        }

        private void UpdatePosition()
        {
            if (!_currentState.HasTarget) return;

            float time = Time.time;
            Vector3 basePosition = _currentState.Target.position;

            // Apply vertical offset from config
            float verticalOffset = _config != null ? _config.verticalOffset : 2f;
            basePosition.y += verticalOffset;

            // Apply animation offset (bob)
            if (_animator != null && _config != null)
            {
                basePosition += _animator.CalculatePositionOffset(time, _config);
            }

            transform.position = basePosition;
        }

        private void UpdatePositionImmediate()
        {
            if (!_currentState.HasTarget) return;

            Vector3 basePosition = _currentState.Target.position;
            float verticalOffset = _config != null ? _config.verticalOffset : 2f;
            basePosition.y += verticalOffset;
            transform.position = basePosition;
        }

        private void UpdateAnimation()
        {
            if (!_currentState.IsVisible || _animator == null || _container == null) return;

            float time = Time.time;

            // Calculate distance for distance-based scaling
            float distance = 0f;
            if (_mainCamera != null)
            {
                distance = Vector3.Distance(_mainCamera.transform.position, transform.position);
            }

            // Apply scale with pulse effect
            float scaleMultiplier = _animator.CalculateScaleMultiplier(time, distance, _config);
            _container.localScale = _baseScale * scaleMultiplier;

            // Apply glow effect to text
            if (_keyText != null && _config != null)
            {
                float glowIntensity = _animator.CalculateGlowIntensity(time, _config);
                _keyText.color = Color.Lerp(_config.textColor, _config.glowColor, glowIntensity);
            }
        }

        private void UpdateBillboard()
        {
            if (_mainCamera == null) return;

            bool shouldBillboard = _config != null ? _config.billboardToCamera : true;
            if (!shouldBillboard) return;

            // Face camera
            transform.rotation = Quaternion.LookRotation(
                transform.position - _mainCamera.transform.position
            );
        }

        private void UpdateVisibility()
        {
            // Deactivate when fully faded out
            if (!_currentState.IsVisible && _transition.IsComplete && _canvasGroup.alpha <= 0f)
            {
                gameObject.SetActive(false);
            }
        }

        private void UpdateTextElements()
        {
            if (_keyText != null)
            {
                _keyText.text = _currentState.KeyText;
            }

            if (_actionText != null)
            {
                bool hasAction = !string.IsNullOrEmpty(_currentState.ActionText);
                _actionText.text = _currentState.ActionText;
                _actionText.gameObject.SetActive(hasAction);
            }
        }

        #endregion

        #region Editor Support

        #if UNITY_EDITOR
        /// <summary>
        /// Create a default config asset for quick setup.
        /// </summary>
        [ContextMenu("Create Default Config")]
        private void CreateDefaultConfig()
        {
            if (_config != null)
            {
                Debug.Log("Config already assigned");
                return;
            }

            string path = UnityEditor.EditorUtility.SaveFilePanelInProject(
                "Save Interact Prompt Config",
                "InteractPromptConfig",
                "asset",
                "Choose location for the config asset"
            );

            if (string.IsNullOrEmpty(path)) return;

            var config = ScriptableObject.CreateInstance<InteractPromptConfig>();
            UnityEditor.AssetDatabase.CreateAsset(config, path);
            UnityEditor.AssetDatabase.SaveAssets();

            _config = config;
            Debug.Log($"Created config at: {path}");
        }
        #endif

        #endregion
    }
}

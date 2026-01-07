using UnityEngine;
using TMPro;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Floating interaction prompt that appears above interactable objects.
    /// Shows "E" key indicator with animation and glow effects.
    /// </summary>
    public class FloatingInteractPrompt : MonoBehaviour
    {
        [Header("UI Elements")]
        [SerializeField] private Canvas _canvas;
        [SerializeField] private CanvasGroup _canvasGroup;
        [SerializeField] private TextMeshProUGUI _keyText;
        [SerializeField] private TextMeshProUGUI _actionText;
        [SerializeField] private RectTransform _container;

        [Header("Positioning")]
        [SerializeField] private Vector3 _offset = new Vector3(0, 2f, 0);
        [SerializeField] private bool _billboardToCamera = true;

        [Header("Animation")]
        [SerializeField] private float _fadeSpeed = 5f;
        [SerializeField] private float _bobSpeed = 2f;
        [SerializeField] private float _bobAmount = 0.1f;
        [SerializeField] private float _pulseSpeed = 3f;
        [SerializeField] private float _pulseAmount = 0.1f;

        [Header("Colors")]
        [SerializeField] private Color _keyColor = new Color(0.6f, 1f, 0.6f);
        [SerializeField] private Color _keyGlowColor = new Color(0.4f, 1f, 0.4f);
        [SerializeField] private Color _actionColor = new Color(0.8f, 0.8f, 0.8f);

        private Transform _target;
        private Camera _mainCamera;
        private float _targetAlpha;
        private float _currentAlpha;
        private float _bobOffset;
        private Vector3 _baseScale;
        private bool _isVisible;

        private void Awake()
        {
            _mainCamera = Camera.main;
            _baseScale = _container != null ? _container.localScale : Vector3.one;

            // Initialize hidden
            _currentAlpha = 0f;
            _targetAlpha = 0f;

            if (_canvasGroup != null)
            {
                _canvasGroup.alpha = 0f;
            }

            if (_keyText != null)
            {
                _keyText.color = _keyColor;
                _keyText.text = "E";
            }

            gameObject.SetActive(false);
        }

        private void Update()
        {
            UpdatePosition();
            UpdateAnimation();
            UpdateFade();
        }

        private void LateUpdate()
        {
            if (_billboardToCamera && _mainCamera != null)
            {
                transform.LookAt(transform.position + _mainCamera.transform.forward);
            }
        }

        private void UpdatePosition()
        {
            if (_target == null) return;

            // Calculate bobbing
            _bobOffset = Mathf.Sin(Time.time * _bobSpeed) * _bobAmount;

            // Position above target with bob
            Vector3 targetPos = _target.position + _offset;
            targetPos.y += _bobOffset;

            transform.position = targetPos;
        }

        private void UpdateAnimation()
        {
            if (!_isVisible || _container == null) return;

            // Pulse effect
            float pulse = 1f + Mathf.Sin(Time.time * _pulseSpeed) * _pulseAmount;
            _container.localScale = _baseScale * pulse;

            // Glow color lerp
            if (_keyText != null)
            {
                float t = (Mathf.Sin(Time.time * _pulseSpeed) + 1f) * 0.5f;
                _keyText.color = Color.Lerp(_keyColor, _keyGlowColor, t);
            }
        }

        private void UpdateFade()
        {
            if (Mathf.Approximately(_currentAlpha, _targetAlpha)) return;

            _currentAlpha = Mathf.MoveTowards(_currentAlpha, _targetAlpha, Time.deltaTime * _fadeSpeed);

            if (_canvasGroup != null)
            {
                _canvasGroup.alpha = _currentAlpha;
            }

            // Hide completely when faded out
            if (_currentAlpha <= 0f && !_isVisible)
            {
                gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// Show the prompt at the specified target position.
        /// </summary>
        public void Show(Transform target, string actionText = null)
        {
            _target = target;
            _isVisible = true;
            _targetAlpha = 1f;

            if (_actionText != null)
            {
                _actionText.text = actionText ?? "";
                _actionText.gameObject.SetActive(!string.IsNullOrEmpty(actionText));
            }

            gameObject.SetActive(true);
        }

        /// <summary>
        /// Hide the prompt with fade out.
        /// </summary>
        public void Hide()
        {
            _isVisible = false;
            _targetAlpha = 0f;
            _target = null;
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
        /// Update the main camera reference.
        /// </summary>
        public void SetCamera(Camera camera)
        {
            _mainCamera = camera;
        }
    }
}

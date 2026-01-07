using System.Collections;
using UnityEngine;
using TMPro;

namespace Cristal.CLI
{
    /// <summary>
    /// Blinking cursor effect for terminal aesthetic.
    /// Provides visual feedback that the system is alive and waiting.
    /// </summary>
    public class CursorBlink : MonoBehaviour
    {
        [Header("Cursor Settings")]
        [SerializeField] private TextMeshProUGUI _cursorText;
        [SerializeField] private string _cursorChar = "█";
        [SerializeField] private string _cursorCharAlt = "▌";

        [Header("Blink Timing")]
        [SerializeField] private float _blinkRate = 0.5f;
        [SerializeField] private float _glitchInterval = 5f;
        [SerializeField] private float _glitchDuration = 0.15f;

        [Header("Colors")]
        [SerializeField] private Color _normalColor = Color.white;
        [SerializeField] private Color _glitchColor = new Color(1f, 0.3f, 0.3f);

        [Header("Behavior")]
        [SerializeField] private bool _startBlinking = true;
        [SerializeField] private bool _enableGlitch = true;

        private bool _isBlinking = false;
        private bool _isVisible = true;
        private Coroutine _blinkCoroutine;
        private Coroutine _glitchCoroutine;

        private void Start()
        {
            if (_cursorText == null)
            {
                _cursorText = GetComponent<TextMeshProUGUI>();
            }

            if (_cursorText != null)
            {
                _cursorText.text = _cursorChar;
                _cursorText.color = _normalColor;
            }

            if (_startBlinking)
            {
                SetBlinking(true);
            }
        }

        /// <summary>
        /// Enable or disable cursor blinking.
        /// </summary>
        public void SetBlinking(bool enabled)
        {
            if (enabled && !_isBlinking)
            {
                _isBlinking = true;
                _blinkCoroutine = StartCoroutine(BlinkCoroutine());

                if (_enableGlitch)
                {
                    _glitchCoroutine = StartCoroutine(GlitchCoroutine());
                }
            }
            else if (!enabled && _isBlinking)
            {
                _isBlinking = false;

                if (_blinkCoroutine != null)
                {
                    StopCoroutine(_blinkCoroutine);
                    _blinkCoroutine = null;
                }

                if (_glitchCoroutine != null)
                {
                    StopCoroutine(_glitchCoroutine);
                    _glitchCoroutine = null;
                }

                // Hide cursor when not blinking
                SetCursorVisible(false);
            }
        }

        private IEnumerator BlinkCoroutine()
        {
            while (_isBlinking)
            {
                _isVisible = !_isVisible;
                SetCursorVisible(_isVisible);
                yield return new WaitForSeconds(_blinkRate);
            }
        }

        private IEnumerator GlitchCoroutine()
        {
            while (_isBlinking)
            {
                // Wait for random interval
                yield return new WaitForSeconds(_glitchInterval + Random.Range(-1f, 2f));

                if (!_isBlinking) break;

                // Glitch effect
                yield return StartCoroutine(PerformGlitch());
            }
        }

        private IEnumerator PerformGlitch()
        {
            if (_cursorText == null) yield break;

            // Store original state
            Color originalColor = _cursorText.color;
            string originalChar = _cursorText.text;

            // Rapid glitch sequence
            string[] glitchChars = { "█", "▓", "▒", "░", "Δ", "◊", "●", "■", "▀", "▄" };

            int glitchFrames = Random.Range(3, 8);
            float frameTime = _glitchDuration / glitchFrames;

            for (int i = 0; i < glitchFrames; i++)
            {
                _cursorText.text = glitchChars[Random.Range(0, glitchChars.Length)];
                _cursorText.color = Color.Lerp(_normalColor, _glitchColor, Random.value);
                yield return new WaitForSeconds(frameTime);
            }

            // Restore
            _cursorText.text = _isVisible ? _cursorChar : "";
            _cursorText.color = _normalColor;
        }

        private void SetCursorVisible(bool visible)
        {
            if (_cursorText != null)
            {
                _cursorText.text = visible ? _cursorChar : "";
            }
        }

        /// <summary>
        /// Set cursor character.
        /// </summary>
        public void SetCursorChar(string character)
        {
            _cursorChar = character;
            if (_isVisible && _cursorText != null)
            {
                _cursorText.text = _cursorChar;
            }
        }

        /// <summary>
        /// Set cursor color.
        /// </summary>
        public void SetColor(Color color)
        {
            _normalColor = color;
            if (_cursorText != null)
            {
                _cursorText.color = color;
            }
        }

        public void SetBlinkRate(float blinkRate)
        {
            _blinkRate = Mathf.Max(0.01f, blinkRate);
        }

        /// <summary>
        /// Trigger a manual glitch effect.
        /// </summary>
        public void TriggerGlitch()
        {
            if (_isBlinking)
            {
                StartCoroutine(PerformGlitch());
            }
        }

        private void OnDisable()
        {
            SetBlinking(false);
        }

        private void OnEnable()
        {
            if (_startBlinking)
            {
                SetBlinking(true);
            }
        }
    }
}

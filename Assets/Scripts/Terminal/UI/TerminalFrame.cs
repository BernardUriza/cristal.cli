using UnityEngine;
using UnityEngine.UI;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Terminal border/frame visual component.
    /// Creates stylized frame around the terminal canvas.
    /// </summary>
    public class TerminalFrame : MonoBehaviour
    {
        [Header("Visual Config (Optional)")]
        [SerializeField] private TerminalVisualConfig _visualConfig;

        [Header("Frame Settings")]
        [SerializeField] private float _borderWidth = 2f;
        [SerializeField] private Color _borderColor = new Color(0.2f, 0.4f, 0.2f, 1f);
        [SerializeField] private float _cornerRadius = 0f;
        [SerializeField] private bool _showCornerAccents = true;
        [SerializeField] private float _accentSize = 20f;

        [Header("Glow")]
        [SerializeField] private bool _enableGlow = true;
        [SerializeField] private float _glowIntensity = 0.5f;
        [SerializeField] private float _glowSize = 10f;

        [Header("References")]
        [SerializeField] private Image _topBorder;
        [SerializeField] private Image _bottomBorder;
        [SerializeField] private Image _leftBorder;
        [SerializeField] private Image _rightBorder;
        [SerializeField] private Image[] _cornerAccents;

        private void Start()
        {
            if (_visualConfig != null)
            {
                ApplyConfig(_visualConfig);
            }
            ApplyStyle();
        }

        public void ApplyConfig(TerminalVisualConfig config)
        {
            if (config == null) return;

            if (!config.showBorder)
            {
                SetBordersEnabled(false);
                return;
            }

            SetBordersEnabled(true);
            _borderWidth = config.borderWidth;
            _borderColor = config.borderColor;
        }

        /// <summary>
        /// Apply current style settings.
        /// </summary>
        public void ApplyStyle()
        {
            ApplyBorderStyle(_topBorder);
            ApplyBorderStyle(_bottomBorder);
            ApplyBorderStyle(_leftBorder);
            ApplyBorderStyle(_rightBorder);

            if (_showCornerAccents && _cornerAccents != null)
            {
                foreach (var accent in _cornerAccents)
                {
                    if (accent != null)
                    {
                        accent.color = _borderColor;
                        accent.enabled = true;
                    }
                }
            }
        }

        private void SetBordersEnabled(bool enabled)
        {
            if (_topBorder != null) _topBorder.enabled = enabled;
            if (_bottomBorder != null) _bottomBorder.enabled = enabled;
            if (_leftBorder != null) _leftBorder.enabled = enabled;
            if (_rightBorder != null) _rightBorder.enabled = enabled;

            if (_cornerAccents != null)
            {
                foreach (var accent in _cornerAccents)
                {
                    if (accent != null) accent.enabled = enabled && _showCornerAccents;
                }
            }
        }

        private void ApplyBorderStyle(Image border)
        {
            if (border == null) return;

            border.color = _borderColor;
            
            var rt = border.rectTransform;
            if (border == _topBorder || border == _bottomBorder)
            {
                rt.sizeDelta = new Vector2(rt.sizeDelta.x, _borderWidth);
            }
            else
            {
                rt.sizeDelta = new Vector2(_borderWidth, rt.sizeDelta.y);
            }
        }

        /// <summary>
        /// Set border color.
        /// </summary>
        public void SetBorderColor(Color color)
        {
            _borderColor = color;
            ApplyStyle();
        }

        /// <summary>
        /// Set border width.
        /// </summary>
        public void SetBorderWidth(float width)
        {
            _borderWidth = width;
            ApplyStyle();
        }

        /// <summary>
        /// Pulse effect for emphasis.
        /// </summary>
        public void Pulse(float duration = 0.5f)
        {
            StartCoroutine(PulseCoroutine(duration));
        }

        private System.Collections.IEnumerator PulseCoroutine(float duration)
        {
            Color originalColor = _borderColor;
            Color pulseColor = new Color(
                Mathf.Min(1f, _borderColor.r * 2f),
                Mathf.Min(1f, _borderColor.g * 2f),
                Mathf.Min(1f, _borderColor.b * 2f),
                1f
            );

            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Sin((elapsed / duration) * Mathf.PI);
                Color lerped = Color.Lerp(originalColor, pulseColor, t);
                SetBorderColor(lerped);
                yield return null;
            }

            SetBorderColor(originalColor);
        }
    }
}

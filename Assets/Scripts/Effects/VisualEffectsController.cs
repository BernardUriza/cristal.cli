using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using Cristal.CLI.Core;
using Cristal.CLI.Memory;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.Effects
{
    /// <summary>
    /// Coordinates all visual effects for CRISTAL.
    /// Manages glitch, corruption, self-correcting text, and fragmented vision effects.
    /// </summary>
    public class VisualEffectsController : MonoBehaviour
    {
        // Legacy singleton - use ServiceLocator.Get<VisualEffectsController>() instead
        [Obsolete("Use ServiceLocator.Get<VisualEffectsController>() instead")]
        public static VisualEffectsController Instance { get; private set; }

        [Header("References")]
        [SerializeField] private TextMeshProUGUI _outputText;
        [SerializeField] private TextMeshProUGUI _cursorText;
        [SerializeField] private CanvasGroup _canvasGroup;

        [Header("Glitch Settings")]
        [SerializeField] private float _baseGlitchChance = 0.02f;
        [SerializeField] private string[] _glitchChars = { "█", "▓", "▒", "░", "Δ", "◊", "●", "○", "▀", "▄", "■", "□" };

        [Header("Screen Effects")]
        [SerializeField] private float _screenShakeIntensity = 5f;
        [SerializeField] private float _screenShakeDuration = 0.3f;

        [Header("Self-Correcting Text")]
        [SerializeField] private float _correctionDelay = 0.1f;
        [SerializeField] private int _maxCorrections = 3;

        // Events
        public event Action OnGlitchTriggered;
        public event Action OnCorruptionTriggered;
        public event Action OnFragmentedVisionStart;
        public event Action OnFragmentedVisionEnd;

        private RectTransform _canvasRect;
        private Vector3 _originalPosition;
        private bool _isShaking = false;
        private bool _fragmentedVisionActive = false;
        private Coroutine _currentEffect;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                ServiceLocator.RegisterMono(this);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            if (_canvasGroup != null)
            {
                _canvasRect = _canvasGroup.GetComponent<RectTransform>();
                _originalPosition = _canvasRect.anchoredPosition;
            }
        }

        #region Glitch Effects

        /// <summary>
        /// Apply glitch effect to text with given multiplier.
        /// </summary>
        public string ApplyGlitch(string text, float multiplier = 1f)
        {
            if (string.IsNullOrEmpty(text)) return text;

            float chance = _baseGlitchChance * multiplier;
            char[] chars = text.ToCharArray();

            for (int i = 0; i < chars.Length; i++)
            {
                if (UnityEngine.Random.value < chance && !char.IsWhiteSpace(chars[i]))
                {
                    chars[i] = GetRandomGlitchChar();
                }
            }

            if (multiplier > 1f)
            {
                OnGlitchTriggered?.Invoke();
            }

            return new string(chars);
        }

        /// <summary>
        /// Get a random glitch character.
        /// </summary>
        public char GetRandomGlitchChar()
        {
            return _glitchChars[UnityEngine.Random.Range(0, _glitchChars.Length)][0];
        }

        /// <summary>
        /// Apply Zalgo-style corruption to text.
        /// </summary>
        public string ApplyZalgo(string text, int intensity = 1)
        {
            if (string.IsNullOrEmpty(text)) return text;

            // Combining diacritical marks
            string[] above = { "\u0300", "\u0301", "\u0302", "\u0303", "\u0304", "\u0305", "\u0306", "\u0307", "\u0308", "\u030A", "\u030B", "\u030C", "\u030D", "\u030E", "\u030F" };
            string[] below = { "\u0316", "\u0317", "\u0318", "\u0319", "\u031A", "\u031B", "\u031C", "\u031D", "\u031E", "\u031F", "\u0320", "\u0321", "\u0322", "\u0323" };

            var result = new System.Text.StringBuilder();

            foreach (char c in text)
            {
                result.Append(c);

                if (!char.IsWhiteSpace(c) && UnityEngine.Random.value < 0.5f * intensity)
                {
                    // Add random combining marks
                    int aboveCount = UnityEngine.Random.Range(0, intensity + 1);
                    int belowCount = UnityEngine.Random.Range(0, intensity + 1);

                    for (int i = 0; i < aboveCount; i++)
                    {
                        result.Append(above[UnityEngine.Random.Range(0, above.Length)]);
                    }
                    for (int i = 0; i < belowCount; i++)
                    {
                        result.Append(below[UnityEngine.Random.Range(0, below.Length)]);
                    }
                }
            }

            return result.ToString();
        }

        #endregion

        #region Screen Effects

        /// <summary>
        /// Trigger screen shake effect.
        /// </summary>
        public void TriggerScreenShake(float intensity = -1f, float duration = -1f)
        {
            if (_isShaking) return;

            float useIntensity = intensity > 0 ? intensity : _screenShakeIntensity;
            float useDuration = duration > 0 ? duration : _screenShakeDuration;

            StartCoroutine(ScreenShakeCoroutine(useIntensity, useDuration));
        }

        private IEnumerator ScreenShakeCoroutine(float intensity, float duration)
        {
            if (_canvasRect == null) yield break;

            _isShaking = true;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                float x = UnityEngine.Random.Range(-1f, 1f) * intensity;
                float y = UnityEngine.Random.Range(-1f, 1f) * intensity;

                _canvasRect.anchoredPosition = _originalPosition + new Vector3(x, y, 0);

                elapsed += Time.deltaTime;
                yield return null;
            }

            _canvasRect.anchoredPosition = _originalPosition;
            _isShaking = false;
        }

        /// <summary>
        /// Flash the screen.
        /// </summary>
        public void TriggerScreenFlash(Color color, float duration = 0.1f)
        {
            StartCoroutine(ScreenFlashCoroutine(color, duration));
        }

        private IEnumerator ScreenFlashCoroutine(Color color, float duration)
        {
            // Would need a flash overlay image
            yield return new WaitForSeconds(duration);
        }

        #endregion

        #region Self-Correcting Text

        /// <summary>
        /// Display text that "corrects" itself during typing.
        /// </summary>
        public IEnumerator TypeSelfCorrectingText(TextMeshProUGUI textComponent, string targetText, float charDelay = 0.03f)
        {
            if (textComponent == null) yield break;

            string current = textComponent.text;
            var corrections = GenerateCorrections(targetText);

            foreach (string line in corrections)
            {
                // Type out the incorrect version
                foreach (char c in line)
                {
                    current += c;
                    textComponent.text = current;
                    yield return new WaitForSeconds(charDelay);
                }

                yield return new WaitForSeconds(_correctionDelay);

                // Backspace and correct
                while (current.Length > 0 && !targetText.StartsWith(current))
                {
                    current = current.Substring(0, current.Length - 1);
                    textComponent.text = current;
                    yield return new WaitForSeconds(charDelay * 0.5f);
                }
            }

            // Type final correct version
            foreach (char c in targetText)
            {
                if (current.Length < targetText.Length)
                {
                    current += c;
                    textComponent.text = current;
                    yield return new WaitForSeconds(charDelay);
                }
            }
        }

        private List<string> GenerateCorrections(string target)
        {
            var corrections = new List<string>();
            int numCorrections = UnityEngine.Random.Range(1, _maxCorrections + 1);

            for (int i = 0; i < numCorrections; i++)
            {
                // Generate a "wrong" version
                int splitPoint = UnityEngine.Random.Range(1, target.Length);
                string prefix = target.Substring(0, splitPoint);
                string wrongSuffix = GenerateWrongText(target.Length - splitPoint);
                corrections.Add(prefix + wrongSuffix);
            }

            return corrections;
        }

        private string GenerateWrongText(int length)
        {
            var chars = new char[length];
            for (int i = 0; i < length; i++)
            {
                if (UnityEngine.Random.value < 0.3f)
                {
                    chars[i] = GetRandomGlitchChar();
                }
                else
                {
                    chars[i] = (char)UnityEngine.Random.Range('a', 'z' + 1);
                }
            }
            return new string(chars);
        }

        #endregion

        #region Fragmented Vision

        /// <summary>
        /// Enter fragmented vision mode.
        /// </summary>
        public void EnterFragmentedVision()
        {
            if (_fragmentedVisionActive) return;

            _fragmentedVisionActive = true;
            OnFragmentedVisionStart?.Invoke();

            StartCoroutine(FragmentedVisionCoroutine());
        }

        /// <summary>
        /// Exit fragmented vision mode.
        /// </summary>
        public void ExitFragmentedVision()
        {
            _fragmentedVisionActive = false;
            OnFragmentedVisionEnd?.Invoke();
        }

        private IEnumerator FragmentedVisionCoroutine()
        {
            while (_fragmentedVisionActive)
            {
                // Random visual glitches
                if (_canvasGroup != null)
                {
                    // Alpha flicker
                    _canvasGroup.alpha = UnityEngine.Random.Range(0.7f, 1f);
                }

                // Random small screen shakes
                if (UnityEngine.Random.value < 0.1f)
                {
                    TriggerScreenShake(2f, 0.1f);
                }

                yield return new WaitForSeconds(UnityEngine.Random.Range(0.1f, 0.5f));
            }

            // Reset
            if (_canvasGroup != null)
            {
                _canvasGroup.alpha = 1f;
            }
        }

        /// <summary>
        /// Display text in multiple revealing layers.
        /// </summary>
        public IEnumerator TypeMultiLayerReveal(TextMeshProUGUI textComponent, string text, float layerDelay = 0.5f)
        {
            if (textComponent == null) yield break;

            int layers = 3;
            string[] layerTexts = new string[layers];

            // Generate layer versions (increasingly clear)
            for (int i = 0; i < layers; i++)
            {
                float clarity = (float)(i + 1) / layers;
                layerTexts[i] = GenerateLayerText(text, clarity);
            }

            // Display each layer
            for (int i = 0; i < layers; i++)
            {
                textComponent.text = layerTexts[i];
                yield return new WaitForSeconds(layerDelay);
            }

            // Final clear text
            textComponent.text = text;
        }

        private string GenerateLayerText(string text, float clarity)
        {
            char[] chars = text.ToCharArray();
            float obscureChance = 1f - clarity;

            for (int i = 0; i < chars.Length; i++)
            {
                if (UnityEngine.Random.value < obscureChance && !char.IsWhiteSpace(chars[i]))
                {
                    chars[i] = GetRandomGlitchChar();
                }
            }

            return new string(chars);
        }

        #endregion

        #region Effect Triggers

        /// <summary>
        /// Trigger effect by name.
        /// </summary>
        public void TriggerEffect(string effectName)
        {
            switch (effectName?.ToLower())
            {
                case "screen_shake":
                    TriggerScreenShake();
                    break;

                case "screen_corruption":
                    TriggerScreenShake(10f, 0.5f);
                    OnCorruptionTriggered?.Invoke();
                    break;

                case "fragmented_vision":
                    EnterFragmentedVision();
                    break;

                case "self_correcting":
                    // Handled during text display
                    break;

                case "multi_layer_reveal":
                    // Handled during text display
                    break;

                default:
                    Debug.LogWarning($"[Effects] Unknown effect: {effectName}");
                    break;
            }
        }

        /// <summary>
        /// Get the current glitch multiplier based on state and arcana.
        /// </summary>
        public float GetCurrentGlitchMultiplier()
        {
            float multiplier = 1f;

            // Add corruption level
            if (CristalMemory.Instance != null)
            {
                multiplier += CristalMemory.Instance.Data.stateFlags.corruptionLevel;
            }

            // Add arcana modifier
            var arcanaModifiers = ArcanaSystem.Instance?.GetActiveModifiers();
            if (arcanaModifiers != null)
            {
                multiplier *= arcanaModifiers.glitchMultiplier;
            }

            return multiplier;
        }

        #endregion

        /// <summary>
        /// Set the output text reference.
        /// </summary>
        public void SetOutputText(TextMeshProUGUI text)
        {
            _outputText = text;
        }

        /// <summary>
        /// Set the cursor text reference.
        /// </summary>
        public void SetCursorText(TextMeshProUGUI text)
        {
            _cursorText = text;
        }
    }
}

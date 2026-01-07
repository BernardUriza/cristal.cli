using System;
using System.Collections;
using UnityEngine;
using TMPro;

namespace Cristal.CLI
{
    /// <summary>
    /// Typewriter effect component for terminal text animation.
    /// Creates the classic terminal feel with character-by-character reveal.
    /// </summary>
    public class TypewriterEffect : MonoBehaviour
    {
        [Header("Timing")]
        [SerializeField] private float _defaultCharDelay = 0.03f;
        [SerializeField] private float _punctuationDelay = 0.1f;
        [SerializeField] private float _spaceDelay = 0.01f;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip[] _typeSounds;
        [SerializeField] private float _soundVolume = 0.3f;
        [SerializeField] private float _soundPitchVariation = 0.1f;

        [Header("Effects")]
        [SerializeField] private bool _enableScreenShake = false;
        [SerializeField] private float _shakeIntensity = 0.5f;

        private Coroutine _currentTypeCoroutine;
        private bool _isTyping = false;
        private bool _skipRequested = false;

        public bool IsTyping => _isTyping;
        public event Action OnTypeComplete;

        /// <summary>
        /// Type text to a TextMeshProUGUI component with typewriter effect.
        /// </summary>
        public Coroutine TypeText(TextMeshProUGUI target, string text, float? customDelay = null)
        {
            if (_currentTypeCoroutine != null)
            {
                StopCoroutine(_currentTypeCoroutine);
            }

            _currentTypeCoroutine = StartCoroutine(TypeTextCoroutine(target, text, customDelay ?? _defaultCharDelay));
            return _currentTypeCoroutine;
        }

        /// <summary>
        /// Type and append text to existing content.
        /// </summary>
        public Coroutine AppendText(TextMeshProUGUI target, string text, float? customDelay = null)
        {
            if (_currentTypeCoroutine != null)
            {
                StopCoroutine(_currentTypeCoroutine);
            }

            _currentTypeCoroutine = StartCoroutine(AppendTextCoroutine(target, text, customDelay ?? _defaultCharDelay));
            return _currentTypeCoroutine;
        }

        private IEnumerator TypeTextCoroutine(TextMeshProUGUI target, string text, float charDelay)
        {
            _isTyping = true;
            _skipRequested = false;
            target.text = "";

            foreach (char c in text)
            {
                if (_skipRequested)
                {
                    target.text = text;
                    break;
                }

                target.text += c;
                PlayTypeSound();

                yield return new WaitForSeconds(GetDelayForChar(c, charDelay));
            }

            _isTyping = false;
            OnTypeComplete?.Invoke();
        }

        private IEnumerator AppendTextCoroutine(TextMeshProUGUI target, string text, float charDelay)
        {
            _isTyping = true;
            _skipRequested = false;
            string originalText = target.text;

            foreach (char c in text)
            {
                if (_skipRequested)
                {
                    target.text = originalText + text;
                    break;
                }

                target.text += c;
                PlayTypeSound();

                yield return new WaitForSeconds(GetDelayForChar(c, charDelay));
            }

            _isTyping = false;
            OnTypeComplete?.Invoke();
        }

        private float GetDelayForChar(char c, float baseDelay)
        {
            // Punctuation gets longer pauses
            if (c == '.' || c == '!' || c == '?')
            {
                return _punctuationDelay;
            }

            // Commas and semicolons get medium pauses
            if (c == ',' || c == ';' || c == ':')
            {
                return _punctuationDelay * 0.5f;
            }

            // Spaces are quick
            if (c == ' ')
            {
                return _spaceDelay;
            }

            // Newlines get a pause
            if (c == '\n')
            {
                return baseDelay * 2f;
            }

            return baseDelay;
        }

        private void PlayTypeSound()
        {
            if (_audioSource == null || _typeSounds == null || _typeSounds.Length == 0) return;

            AudioClip clip = _typeSounds[UnityEngine.Random.Range(0, _typeSounds.Length)];
            float pitch = 1f + UnityEngine.Random.Range(-_soundPitchVariation, _soundPitchVariation);

            _audioSource.pitch = pitch;
            _audioSource.PlayOneShot(clip, _soundVolume);
        }

        /// <summary>
        /// Skip to the end of current typing animation.
        /// </summary>
        public void Skip()
        {
            _skipRequested = true;
        }

        /// <summary>
        /// Stop typing immediately.
        /// </summary>
        public void Stop()
        {
            if (_currentTypeCoroutine != null)
            {
                StopCoroutine(_currentTypeCoroutine);
                _currentTypeCoroutine = null;
            }
            _isTyping = false;
        }

        private void Update()
        {
            // Allow skipping with space or enter while typing
            if (_isTyping && (UnityEngine.Input.GetKeyDown(KeyCode.Space) || UnityEngine.Input.GetKeyDown(KeyCode.Return)))
            {
                // Disabled by default - can be enabled for accessibility
                // Skip();
            }
        }
    }
}

using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Cristal.CLI;

namespace Cristal.CLI
{
    /// <summary>
    /// Main CLI Controller - Handles UI interaction and visual presentation.
    /// This is the face of the terminal that players interact with.
    /// </summary>
    public class CrystalCLI : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private TMP_InputField _inputField;
        [SerializeField] private TextMeshProUGUI _outputText;
        [SerializeField] private TextMeshProUGUI _cursorText;
        [SerializeField] private ScrollRect _scrollRect;
        [SerializeField] private RectTransform _contentRect;

        [Header("Visual Settings")]
        [SerializeField] private string _promptSymbol = "> ";
        [SerializeField] private Color _inputColor = new Color(0.8f, 0.8f, 0.8f);
        [SerializeField] private Color _outputColor = new Color(0.6f, 0.9f, 0.6f);
        [SerializeField] private Color _systemColor = new Color(0.5f, 0.7f, 1f);
        [SerializeField] private Color _errorColor = new Color(1f, 0.4f, 0.4f);

        [Header("Typewriter Settings")]
        [SerializeField] private float _typewriterSpeed = 0.03f;
        [SerializeField] private float _lineDelay = 0.1f;
        [SerializeField] private bool _enableTypewriterSound = true;

        [Header("Glitch Settings")]
        [SerializeField] private float _glitchChance = 0.05f;
        [SerializeField] private string[] _glitchChars = { "█", "▓", "▒", "░", "Δ", "◊", "●", "○" };

        private TerminalCore _terminalCore;
        private TypewriterEffect _typewriter;
        private CursorBlink _cursorBlink;
        private bool _isTyping = false;
        private string _fullOutputHistory = "";

        private const string BOOT_SEQUENCE = @"
╔══════════════════════════════════════════╗
║           C R I S T A L . C L I          ║
║──────────────────────────────────────────║
║  SYSTEM INITIALIZATION...                ║
║  MEMORY BANKS: FRAGMENTED                ║
║  REALITY COHERENCE: UNSTABLE             ║
║  AWAITING INPUT...                       ║
╚══════════════════════════════════════════╝

";

        private void Awake()
        {
            ValidateReferences();
        }

        private void Start()
        {
            InitializeCLI();
            StartCoroutine(BootSequence());
        }

        private void ValidateReferences()
        {
            if (_inputField == null)
                Debug.LogError("[CrystalCLI] InputField reference missing!");
            if (_outputText == null)
                Debug.LogError("[CrystalCLI] OutputText reference missing!");
        }

        private void InitializeCLI()
        {
            // Get or create TerminalCore
            _terminalCore = TerminalCore.Instance;
            if (_terminalCore == null)
            {
                GameObject coreObj = new GameObject("TerminalCore");
                _terminalCore = coreObj.AddComponent<TerminalCore>();
            }

            // Subscribe to terminal events
            _terminalCore.OnResponseGenerated += HandleResponse;
            _terminalCore.OnStateChanged += HandleStateChange;

            // Get typewriter component
            _typewriter = GetComponent<TypewriterEffect>();
            if (_typewriter == null)
            {
                _typewriter = gameObject.AddComponent<TypewriterEffect>();
            }

            // Get cursor blink component
            _cursorBlink = GetComponentInChildren<CursorBlink>();

            // Setup input field
            if (_inputField != null)
            {
                _inputField.onSubmit.AddListener(OnInputSubmit);
                _inputField.onValueChanged.AddListener(OnInputChanged);
            }

            // Clear output
            if (_outputText != null)
            {
                _outputText.text = "";
            }
        }

        private IEnumerator BootSequence()
        {
            yield return new WaitForSeconds(0.5f);

            // Display boot sequence with typewriter effect
            yield return StartCoroutine(TypeText(BOOT_SEQUENCE, _systemColor));

            // Enable input after boot
            EnableInput();
            FocusInput();
        }

        private void OnInputSubmit(string input)
        {
            if (string.IsNullOrWhiteSpace(input) || _isTyping) return;

            // Display player input
            AppendToOutput($"\n{_promptSymbol}<color=#{ColorUtility.ToHtmlStringRGB(_inputColor)}>{input}</color>\n");

            // Clear input field
            _inputField.text = "";

            // Process through terminal core
            _terminalCore.ProcessInput(input);

            // Refocus input
            StartCoroutine(RefocusInput());
        }

        private void OnInputChanged(string value)
        {
            // Could add real-time effects here
        }

        private void HandleResponse(TerminalResponse response)
        {
            StartCoroutine(DisplayResponse(response));
        }

        private IEnumerator DisplayResponse(TerminalResponse response)
        {
            _isTyping = true;
            DisableInput();

            Color responseColor = GetColorForResponseType(response.ResponseType);

            foreach (string line in response.Lines)
            {
                string displayLine = line;

                // Apply glitch effect
                if (response.ApplyGlitch && Random.value < _glitchChance)
                {
                    displayLine = ApplyGlitchToLine(line);
                }

                yield return StartCoroutine(TypeLine(displayLine, responseColor));
                yield return new WaitForSeconds(_lineDelay);
            }

            _isTyping = false;
            EnableInput();
            FocusInput();
            _terminalCore.SetState(TerminalState.Waiting);
        }

        private IEnumerator TypeText(string text, Color color)
        {
            _isTyping = true;

            foreach (char c in text)
            {
                AppendToOutput($"<color=#{ColorUtility.ToHtmlStringRGB(color)}>{c}</color>");
                ScrollToBottom();

                if (c != ' ' && c != '\n')
                {
                    yield return new WaitForSeconds(_typewriterSpeed);
                }
            }

            _isTyping = false;
        }

        private IEnumerator TypeLine(string line, Color color)
        {
            foreach (char c in line)
            {
                // Occasional glitch during typing
                if (Random.value < _glitchChance * 0.5f)
                {
                    string glitchChar = _glitchChars[Random.Range(0, _glitchChars.Length)];
                    AppendToOutput($"<color=#{ColorUtility.ToHtmlStringRGB(color)}>{glitchChar}</color>");
                    yield return new WaitForSeconds(_typewriterSpeed);
                    RemoveLastChar();
                }

                AppendToOutput($"<color=#{ColorUtility.ToHtmlStringRGB(color)}>{c}</color>");
                ScrollToBottom();

                if (c != ' ')
                {
                    yield return new WaitForSeconds(_typewriterSpeed);
                }
            }

            AppendToOutput("\n");
        }

        private void AppendToOutput(string text)
        {
            _fullOutputHistory += text;
            if (_outputText != null)
            {
                _outputText.text = _fullOutputHistory;
            }
        }

        private void RemoveLastChar()
        {
            if (_fullOutputHistory.Length > 0)
            {
                // Remove last rich text tag (simplified)
                int lastTagStart = _fullOutputHistory.LastIndexOf("<color=");
                if (lastTagStart >= 0)
                {
                    _fullOutputHistory = _fullOutputHistory.Substring(0, lastTagStart);
                    if (_outputText != null)
                    {
                        _outputText.text = _fullOutputHistory;
                    }
                }
            }
        }

        private string ApplyGlitchToLine(string line)
        {
            if (string.IsNullOrEmpty(line)) return line;

            char[] chars = line.ToCharArray();
            int glitchCount = Random.Range(1, Mathf.Max(2, line.Length / 10));

            for (int i = 0; i < glitchCount; i++)
            {
                int pos = Random.Range(0, chars.Length);
                chars[pos] = _glitchChars[Random.Range(0, _glitchChars.Length)][0];
            }

            return new string(chars);
        }

        private Color GetColorForResponseType(ResponseType type)
        {
            switch (type)
            {
                case ResponseType.System:
                    return _systemColor;
                case ResponseType.Memory:
                    return new Color(1f, 0.8f, 0.4f); // Amber
                case ResponseType.Identity:
                    return new Color(0.8f, 0.5f, 1f); // Purple
                case ResponseType.Emotional:
                    return new Color(1f, 0.6f, 0.7f); // Pink
                case ResponseType.Error:
                    return _errorColor;
                default:
                    return _outputColor;
            }
        }

        private void HandleStateChange(TerminalState state)
        {
            // Could update visual indicators based on state
            if (_cursorBlink != null)
            {
                _cursorBlink.SetBlinking(state == TerminalState.Waiting);
            }
        }

        private void EnableInput()
        {
            if (_inputField != null)
            {
                _inputField.interactable = true;
            }
        }

        private void DisableInput()
        {
            if (_inputField != null)
            {
                _inputField.interactable = false;
            }
        }

        private void FocusInput()
        {
            if (_inputField != null)
            {
                _inputField.Select();
                _inputField.ActivateInputField();
            }
        }

        private IEnumerator RefocusInput()
        {
            yield return new WaitForEndOfFrame();
            FocusInput();
        }

        private void ScrollToBottom()
        {
            if (_scrollRect != null)
            {
                Canvas.ForceUpdateCanvases();
                _scrollRect.verticalNormalizedPosition = 0f;
            }
        }

        private void OnDestroy()
        {
            if (_terminalCore != null)
            {
                _terminalCore.OnResponseGenerated -= HandleResponse;
                _terminalCore.OnStateChanged -= HandleStateChange;
            }

            if (_inputField != null)
            {
                _inputField.onSubmit.RemoveListener(OnInputSubmit);
                _inputField.onValueChanged.RemoveListener(OnInputChanged);
            }
        }

        /// <summary>
        /// Public method to inject text directly (for cutscenes, etc.)
        /// </summary>
        public void InjectText(string text, Color? color = null)
        {
            StartCoroutine(TypeText(text, color ?? _outputColor));
        }

        /// <summary>
        /// Clear the terminal output
        /// </summary>
        public void ClearTerminal()
        {
            _fullOutputHistory = "";
            if (_outputText != null)
            {
                _outputText.text = "";
            }
        }
    }
}

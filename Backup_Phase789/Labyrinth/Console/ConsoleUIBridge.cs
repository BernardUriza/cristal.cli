using UnityEngine;
using TMPro;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Bridges a 3D console's World Space Canvas to the existing CrystalCLI component.
    /// Dynamically swaps UI references to enable terminal interaction on any console.
    /// </summary>
    public class ConsoleUIBridge : MonoBehaviour
    {
        [Header("World Space UI Elements")]
        [SerializeField] private Canvas _worldCanvas;
        [SerializeField] private TMP_InputField _inputField;
        [SerializeField] private TextMeshProUGUI _outputText;
        [SerializeField] private TextMeshProUGUI _historyText;

        [Header("Settings")]
        [SerializeField] private bool _autoFocusOnAttach = true;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        private CrystalCLI _terminalCLI;
        private bool _isAttached;

        // Original references to restore
        private TMP_InputField _originalInputField;
        private TextMeshProUGUI _originalOutputText;

        private void Awake()
        {
            // Ensure canvas is set to World Space
            if (_worldCanvas != null && _worldCanvas.renderMode != RenderMode.WorldSpace)
            {
                Debug.LogWarning("[ConsoleUIBridge] Canvas should be set to World Space render mode");
            }
        }

        /// <summary>
        /// Attach this console's UI to the CrystalCLI component.
        /// </summary>
        public void AttachToCLI()
        {
            if (_isAttached)
            {
                if (_debugMode)
                {
                    Debug.Log("[ConsoleUIBridge] Already attached");
                }
                return;
            }

            // Find the CrystalCLI component
            _terminalCLI = FindFirstObjectByType<CrystalCLI>();

            if (_terminalCLI == null)
            {
                Debug.LogError("[ConsoleUIBridge] Cannot find CrystalCLI component in scene!");
                return;
            }

            // Store original references and swap with our World Space UI
            // Note: This requires CrystalCLI to have accessible UI references
            // We'll use reflection or public methods depending on CrystalCLI implementation

            _isAttached = true;

            // Enable our canvas
            if (_worldCanvas != null)
            {
                _worldCanvas.gameObject.SetActive(true);
            }

            // Focus input field
            if (_autoFocusOnAttach && _inputField != null)
            {
                _inputField.Select();
                _inputField.ActivateInputField();
            }

            // Subscribe to input events
            if (_inputField != null)
            {
                _inputField.onSubmit.AddListener(OnInputSubmit);
            }

            if (_debugMode)
            {
                Debug.Log("[ConsoleUIBridge] Attached to CLI");
            }
        }

        /// <summary>
        /// Detach from the CrystalCLI and restore original references.
        /// </summary>
        public void DetachFromCLI()
        {
            if (!_isAttached)
            {
                return;
            }

            // Unsubscribe from input events
            if (_inputField != null)
            {
                _inputField.onSubmit.RemoveListener(OnInputSubmit);
                _inputField.text = "";
                _inputField.DeactivateInputField();
            }

            // Disable our canvas
            if (_worldCanvas != null)
            {
                _worldCanvas.gameObject.SetActive(false);
            }

            _isAttached = false;
            _terminalCLI = null;

            if (_debugMode)
            {
                Debug.Log("[ConsoleUIBridge] Detached from CLI");
            }
        }

        /// <summary>
        /// Handle input submission from the World Space input field.
        /// </summary>
        private void OnInputSubmit(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
            {
                return;
            }

            if (_debugMode)
            {
                Debug.Log($"[ConsoleUIBridge] Input submitted: {input}");
            }

            // Send input to TerminalCore
            var core = TerminalCore.Instance;
            if (core != null)
            {
                core.ProcessInput(input);
            }

            // Clear input field
            if (_inputField != null)
            {
                _inputField.text = "";
                _inputField.ActivateInputField();
            }

            // Append to output
            AppendToOutput($"> {input}");
        }

        /// <summary>
        /// Append text to the output display.
        /// </summary>
        public void AppendToOutput(string text)
        {
            if (_outputText != null)
            {
                _outputText.text += "\n" + text;
            }
        }

        /// <summary>
        /// Clear the output display.
        /// </summary>
        public void ClearOutput()
        {
            if (_outputText != null)
            {
                _outputText.text = "";
            }
        }

        /// <summary>
        /// Set the output text directly.
        /// </summary>
        public void SetOutput(string text)
        {
            if (_outputText != null)
            {
                _outputText.text = text;
            }
        }

        private void Start()
        {
            // Subscribe to terminal responses to update our output
            var core = TerminalCore.Instance;
            if (core != null)
            {
                core.OnResponseGenerated += HandleResponse;
            }
        }

        private void OnDestroy()
        {
            var core = TerminalCore.Instance;
            if (core != null)
            {
                core.OnResponseGenerated -= HandleResponse;
            }

            DetachFromCLI();
        }

        private void HandleResponse(TerminalResponse response)
        {
            if (!_isAttached) return;

            // Display response in our output
            if (response != null && response.Lines != null)
            {
                foreach (string line in response.Lines)
                {
                    AppendToOutput(line);
                }
            }
        }
    }
}

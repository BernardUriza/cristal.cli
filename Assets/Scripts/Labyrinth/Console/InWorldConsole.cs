using System;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// A 3D terminal console that can be interacted with in the labyrinth.
    /// Implements IInteractable and bridges to the existing terminal system.
    /// </summary>
    public class InWorldConsole : MonoBehaviour, IInteractable
    {
        [Header("Console Identity")]
        [SerializeField] private string _consoleId = "console_01";
        [SerializeField] private CristalState _associatedState = CristalState.Waiting;

        [Header("Interaction")]
        [SerializeField] private string _interactPrompt = "ACCESS TERMINAL";
        [SerializeField] private bool _isActive = true;

        [Header("Visual References")]
        [SerializeField] private Canvas _worldSpaceCanvas;
        [SerializeField] private MeshRenderer _screenRenderer;
        [SerializeField] private Light _screenLight;
        [SerializeField] private ParticleSystem _idleParticles;

        [Header("State Colors")]
        [SerializeField] private Color _waitingColor = new Color(0.2f, 0.8f, 0.2f);
        [SerializeField] private Color _processingColor = new Color(0.9f, 0.9f, 0.2f);
        [SerializeField] private Color _respondingColor = new Color(0.2f, 0.6f, 0.9f);
        [SerializeField] private Color _errorColor = new Color(0.9f, 0.2f, 0.2f);
        [SerializeField] private Color _inactiveColor = new Color(0.3f, 0.3f, 0.3f);

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip _activateClip;
        [SerializeField] private AudioClip _deactivateClip;
        [SerializeField] private AudioClip _idleLoopClip;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // IInteractable implementation
        public string InteractPrompt => _interactPrompt;
        public bool CanInteract => _isActive && !_isOccupied;

        // Public properties
        public string ConsoleId => _consoleId;
        public CristalState AssociatedState => _associatedState;
        public bool IsOccupied => _isOccupied;

        // Events
        public event Action<InWorldConsole> OnActivated;
        public event Action<InWorldConsole> OnDeactivated;

        private bool _isOccupied;
        private bool _isFocused;
        private ConsoleUIBridge _uiBridge;
        private Material _screenMaterial;
        private Color _currentColor;

        private void Awake()
        {
            _uiBridge = GetComponent<ConsoleUIBridge>();

            // Get screen material instance
            if (_screenRenderer != null)
            {
                _screenMaterial = _screenRenderer.material;
            }
        }

        private void Start()
        {
            // Subscribe to terminal state changes
            var core = TerminalCore.Instance;
            if (core != null)
            {
                core.OnStateChanged += HandleTerminalStateChanged;
            }

            // Initialize visual state
            UpdateVisualState(_isActive ? TerminalState.Waiting : TerminalState.Locked);

            // Hide canvas initially
            if (_worldSpaceCanvas != null)
            {
                _worldSpaceCanvas.gameObject.SetActive(false);
            }
        }

        private void OnDestroy()
        {
            var core = TerminalCore.Instance;
            if (core != null)
            {
                core.OnStateChanged -= HandleTerminalStateChanged;
            }
        }

        #region IInteractable Implementation

        public void OnInteract(PlayerInteraction player)
        {
            if (!CanInteract)
            {
                if (_debugMode)
                {
                    Debug.Log($"[InWorldConsole] {_consoleId} cannot be interacted with");
                }
                return;
            }

            if (_debugMode)
            {
                Debug.Log($"[InWorldConsole] {_consoleId} interacted with");
            }

            // Tell LabyrinthManager to enter console mode
            LabyrinthManager.Instance?.EnterConsoleMode(this);
        }

        public void OnFocus()
        {
            _isFocused = true;

            // Visual feedback for focus
            if (_screenLight != null)
            {
                _screenLight.intensity *= 1.5f;
            }

            if (_idleParticles != null && !_idleParticles.isPlaying)
            {
                _idleParticles.Play();
            }

            if (_debugMode)
            {
                Debug.Log($"[InWorldConsole] {_consoleId} focused");
            }
        }

        public void OnUnfocus()
        {
            _isFocused = false;

            // Reset visual feedback
            if (_screenLight != null)
            {
                _screenLight.intensity /= 1.5f;
            }

            if (_idleParticles != null && _idleParticles.isPlaying)
            {
                _idleParticles.Stop();
            }

            if (_debugMode)
            {
                Debug.Log($"[InWorldConsole] {_consoleId} unfocused");
            }
        }

        #endregion

        #region Activation

        /// <summary>
        /// Activate this console for terminal interaction.
        /// Called by LabyrinthManager when entering console mode.
        /// </summary>
        public void Activate()
        {
            _isOccupied = true;

            // Show the terminal UI canvas
            if (_worldSpaceCanvas != null)
            {
                _worldSpaceCanvas.gameObject.SetActive(true);
            }

            // Attach UI bridge
            if (_uiBridge != null)
            {
                _uiBridge.AttachToCLI();
            }

            // Play activation sound
            PlaySound(_activateClip);

            // Start idle loop
            if (_audioSource != null && _idleLoopClip != null)
            {
                _audioSource.clip = _idleLoopClip;
                _audioSource.loop = true;
                _audioSource.Play();
            }

            OnActivated?.Invoke(this);

            if (_debugMode)
            {
                Debug.Log($"[InWorldConsole] {_consoleId} activated");
            }
        }

        /// <summary>
        /// Deactivate this console.
        /// Called by LabyrinthManager when exiting console mode.
        /// </summary>
        public void Deactivate()
        {
            _isOccupied = false;

            // Hide the terminal UI canvas
            if (_worldSpaceCanvas != null)
            {
                _worldSpaceCanvas.gameObject.SetActive(false);
            }

            // Detach UI bridge
            if (_uiBridge != null)
            {
                _uiBridge.DetachFromCLI();
            }

            // Stop idle loop and play deactivation
            if (_audioSource != null)
            {
                _audioSource.Stop();
                _audioSource.loop = false;
            }
            PlaySound(_deactivateClip);

            OnDeactivated?.Invoke(this);

            if (_debugMode)
            {
                Debug.Log($"[InWorldConsole] {_consoleId} deactivated");
            }
        }

        #endregion

        #region Visual State

        private void HandleTerminalStateChanged(TerminalState state)
        {
            if (_isOccupied)
            {
                UpdateVisualState(state);
            }
        }

        private void UpdateVisualState(TerminalState state)
        {
            Color targetColor = state switch
            {
                TerminalState.Waiting => _waitingColor,
                TerminalState.Processing => _processingColor,
                TerminalState.Responding => _respondingColor,
                TerminalState.Error => _errorColor,
                TerminalState.Locked => _inactiveColor,
                _ => _waitingColor
            };

            SetScreenColor(targetColor);
        }

        private void SetScreenColor(Color color)
        {
            _currentColor = color;

            if (_screenMaterial != null)
            {
                _screenMaterial.SetColor("_EmissionColor", color * 2f);
                _screenMaterial.color = color;
            }

            if (_screenLight != null)
            {
                _screenLight.color = color;
            }
        }

        #endregion

        #region Utility

        private void PlaySound(AudioClip clip)
        {
            if (_audioSource != null && clip != null)
            {
                _audioSource.PlayOneShot(clip);
            }
        }

        /// <summary>
        /// Enable or disable this console.
        /// </summary>
        public void SetActive(bool active)
        {
            _isActive = active;
            UpdateVisualState(active ? TerminalState.Waiting : TerminalState.Locked);
        }

        #endregion
    }
}

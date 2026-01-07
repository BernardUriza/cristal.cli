using System;
using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Core coordinator for the 3D labyrinth experience.
    /// Manages mode switching between exploration and console interaction.
    /// Subscribes to terminal events to drive environmental changes.
    /// </summary>
    public class LabyrinthManager : MonoBehaviour
    {
        public static LabyrinthManager Instance { get; private set; }

        [Header("References")]
        [SerializeField] private PlayerController _player;
        [SerializeField] private PlayerCamera _playerCamera;
        [SerializeField] private Canvas _consoleCanvas;

        [Header("Settings")]
        [SerializeField] private float _modeTransitionDuration = 0.5f;
        [SerializeField] private bool _debugMode = false;

        // Events
        public event Action<GameMode> OnModeChanged;
        public event Action<SymbolicRoom> OnRoomEntered;
        public event Action<InWorldConsole> OnConsoleActivated;
        public event Action OnConsoleDeactivated;

        // State
        private GameMode _currentMode = GameMode.Exploration;
        private InWorldConsole _activeConsole;
        private SymbolicRoom _currentRoom;
        private float _transitionTimer;

        public GameMode CurrentMode => _currentMode;
        public InWorldConsole ActiveConsole => _activeConsole;
        public SymbolicRoom CurrentRoom => _currentRoom;
        public bool IsInConsoleMode => _currentMode == GameMode.Console;
        public bool IsTransitioning => _currentMode == GameMode.Transition;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            SubscribeToTerminalEvents();
            SetMode(GameMode.Exploration);
        }

        private void OnDestroy()
        {
            UnsubscribeFromTerminalEvents();
        }

        private void Update()
        {
            if (_currentMode == GameMode.Transition)
            {
                _transitionTimer -= Time.deltaTime;
                if (_transitionTimer <= 0)
                {
                    CompleteTransition();
                }
            }

            // Allow escape to exit console mode
            if (_currentMode == GameMode.Console && UnityEngine.Input.GetKeyDown(KeyCode.Escape))
            {
                ExitConsoleMode();
            }
        }

        #region Mode Management

        /// <summary>
        /// Enter console interaction mode with the specified console.
        /// </summary>
        public void EnterConsoleMode(InWorldConsole console)
        {
            if (_currentMode != GameMode.Exploration)
            {
                Log("Cannot enter console mode - not in exploration mode");
                return;
            }

            if (console == null)
            {
                Log("Cannot enter console mode - console is null");
                return;
            }

            Log($"Entering console mode: {console.ConsoleId}");

            _activeConsole = console;
            StartTransition(GameMode.Console);

            // Disable player movement
            if (_player != null)
            {
                _player.DisableMovement();
            }

            // Focus camera on console
            if (_playerCamera != null)
            {
                _playerCamera.FocusOnConsole(console.transform);
            }

            // Activate console
            console.Activate();

            // Show cursor for terminal input
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;

            OnConsoleActivated?.Invoke(console);
        }

        /// <summary>
        /// Exit console mode and return to exploration.
        /// </summary>
        public void ExitConsoleMode()
        {
            if (_currentMode != GameMode.Console)
            {
                return;
            }

            Log("Exiting console mode");

            // Deactivate current console
            if (_activeConsole != null)
            {
                _activeConsole.Deactivate();
            }

            StartTransition(GameMode.Exploration);

            // Enable player movement
            if (_player != null)
            {
                _player.EnableMovement();
            }

            // Return camera to follow mode
            if (_playerCamera != null)
            {
                _playerCamera.ReturnToFollow();
            }

            // Lock cursor for exploration
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;

            OnConsoleDeactivated?.Invoke();
            _activeConsole = null;
        }

        private void StartTransition(GameMode targetMode)
        {
            _currentMode = GameMode.Transition;
            _transitionTimer = _modeTransitionDuration;
            OnModeChanged?.Invoke(_currentMode);
        }

        private void CompleteTransition()
        {
            // Determine target based on what we were transitioning to
            GameMode targetMode = _activeConsole != null ? GameMode.Console : GameMode.Exploration;
            SetMode(targetMode);
        }

        private void SetMode(GameMode mode)
        {
            if (_currentMode == mode) return;

            _currentMode = mode;
            Log($"Mode changed to: {mode}");
            OnModeChanged?.Invoke(mode);
        }

        #endregion

        #region Room Management

        /// <summary>
        /// Called when player enters a new symbolic room.
        /// </summary>
        public void NotifyRoomEntered(SymbolicRoom room)
        {
            if (_currentRoom == room) return;

            _currentRoom = room;
            Log($"Entered room: {room.RoomName} (State: {room.RoomState})");
            OnRoomEntered?.Invoke(room);
        }

        #endregion

        #region Terminal Event Integration

        private void SubscribeToTerminalEvents()
        {
            // Subscribe to state machine transitions for environmental changes
            var stateMachine = TerminalStateMachine.Instance;
            if (stateMachine != null)
            {
                stateMachine.OnStateTransition += HandleStateTransition;
            }

            // Subscribe to ritual events for UNBOUND transformation
            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                ritualSystem.OnUnboundTriggered += HandleUnboundTriggered;
                ritualSystem.OnUnboundEnded += HandleUnboundEnded;
            }

            // Subscribe to vision events for hologram spawning
            var visionManager = VisionManager.Instance;
            if (visionManager != null)
            {
                visionManager.OnVisionUnlocked += HandleVisionUnlocked;
            }
        }

        private void UnsubscribeFromTerminalEvents()
        {
            var stateMachine = TerminalStateMachine.Instance;
            if (stateMachine != null)
            {
                stateMachine.OnStateTransition -= HandleStateTransition;
            }

            var ritualSystem = RitualSystem.Instance;
            if (ritualSystem != null)
            {
                ritualSystem.OnUnboundTriggered -= HandleUnboundTriggered;
                ritualSystem.OnUnboundEnded -= HandleUnboundEnded;
            }

            var visionManager = VisionManager.Instance;
            if (visionManager != null)
            {
                visionManager.OnVisionUnlocked -= HandleVisionUnlocked;
            }
        }

        private void HandleStateTransition(CristalState from, CristalState to)
        {
            Log($"Terminal state transition: {from} -> {to}");

            // Broadcast to all rooms for environmental updates
            var rooms = FindObjectsByType<SymbolicRoom>(FindObjectsSortMode.None);
            foreach (var room in rooms)
            {
                room.ApplyStateEffect(to);
            }

            // Broadcast to all gates for unlock checks
            var gates = FindObjectsByType<SymbolicGate>(FindObjectsSortMode.None);
            foreach (var gate in gates)
            {
                gate.OnTerminalStateChanged(from, to);
            }
        }

        private void HandleUnboundTriggered()
        {
            Log("=== UNBOUND TRIGGERED - LABYRINTH TRANSFORMATION ===");

            // Find and trigger the UnboundTransformer
            var transformer = FindFirstObjectByType<UnboundTransformer>();
            if (transformer != null)
            {
                transformer.TransformLabyrinth();
            }
        }

        private void HandleUnboundEnded()
        {
            Log("=== UNBOUND ENDED - REVERTING LABYRINTH ===");

            var transformer = FindFirstObjectByType<UnboundTransformer>();
            if (transformer != null)
            {
                transformer.RevertLabyrinth();
            }
        }

        private void HandleVisionUnlocked(VisionInstance vision)
        {
            Log($"Vision unlocked: {vision.Definition.displayName}");

            // Find hologram projectors that match this vision
            var projectors = FindObjectsByType<HologramProjector>(FindObjectsSortMode.None);
            foreach (var projector in projectors)
            {
                projector.OnVisionUnlocked(vision);
            }
        }

        #endregion

        #region Utility

        /// <summary>
        /// Set player and camera references at runtime.
        /// </summary>
        public void SetPlayerReferences(PlayerController player, PlayerCamera camera)
        {
            _player = player;
            _playerCamera = camera;
        }

        private void Log(string message)
        {
            if (_debugMode)
            {
                Debug.Log($"[LabyrinthManager] {message}");
            }
        }

        #endregion
    }
}

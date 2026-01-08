using System;
using UnityEngine;

namespace Cristal.CLI.Labyrinth.Console
{
    /// <summary>
    /// Stub for InWorldConsole - TODO: Restore full implementation from Phase 7
    /// A 3D terminal console that can be interacted with in the labyrinth.
    /// </summary>
    public class InWorldConsole : MonoBehaviour
    {
        [Header("Console Identity")]
        [SerializeField] private string _consoleId = "console_01";
        
        [Header("Interaction")]
        [SerializeField] private string _interactPrompt = "ACCESS TERMINAL";
        [SerializeField] private bool _isActive = true;

        // Public properties
        public string ConsoleId => _consoleId;
        public string InteractPrompt => _interactPrompt;
        public bool CanInteract => _isActive && !_isOccupied;
        public bool IsOccupied => _isOccupied;

        // Events
        public event Action<InWorldConsole> OnActivated;
        public event Action<InWorldConsole> OnDeactivated;

        private bool _isOccupied;

        /// <summary>
        /// Stub interact method - TODO: implement full terminal bridge
        /// </summary>
        public void Interact()
        {
            if (!CanInteract) return;
            Activate();
        }

        /// <summary>
        /// Activate the console
        /// </summary>
        public void Activate()
        {
            _isOccupied = true;
            OnActivated?.Invoke(this);
            Debug.Log($"[InWorldConsole] {_consoleId} activated (stub)");
        }

        /// <summary>
        /// Deactivate the console
        /// </summary>
        public void Deactivate()
        {
            _isOccupied = false;
            OnDeactivated?.Invoke(this);
            Debug.Log($"[InWorldConsole] {_consoleId} deactivated (stub)");
        }

        /// <summary>
        /// Exit console mode (alias for Deactivate)
        /// </summary>
        public void ExitConsole() => Deactivate();
    }
}

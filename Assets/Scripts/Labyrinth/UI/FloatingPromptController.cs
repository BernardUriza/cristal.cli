using UnityEngine;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Orchestrates when to show/hide/update the FloatingInteractPrompt.
    /// Keeps PlayerInteraction dumb: it only detects targets; this controller resolves context.
    /// </summary>
    [DisallowMultipleComponent]
    public class FloatingPromptController : MonoBehaviour
    {
        [Header("Dependencies")]
        [SerializeField] private FloatingInteractPrompt _prompt;
        [SerializeField] private PromptContextResolver _resolver;

        [Header("State Source (optional)")]
        [SerializeField] private TerminalStateMachine _stateMachine;

        private Cristal.CLI.Labyrinth.IInteractable _currentInteractable;
        private Transform _currentTargetTransform;
        private Cristal.CLI.Memory.CristalState _lastState;

        private void Awake()
        {
            if (_resolver == null)
            {
                _resolver = GetComponent<PromptContextResolver>();
            }

            if (_stateMachine == null)
            {
                _stateMachine = TerminalStateMachine.Instance;
            }

            if (_resolver != null && _stateMachine != null)
            {
                _resolver.StateMachine = _stateMachine;
            }
        }

        private void OnEnable()
        {
            if (_stateMachine != null)
            {
                _lastState = _stateMachine.CurrentStateId;
                _stateMachine.OnStateTransition += HandleStateTransition;
            }
        }

        private void OnDisable()
        {
            if (_stateMachine != null)
            {
                _stateMachine.OnStateTransition -= HandleStateTransition;
            }
        }

        public void SetTarget(Cristal.CLI.Labyrinth.IInteractable interactable, Transform targetTransform)
        {
            _currentInteractable = interactable;
            _currentTargetTransform = targetTransform;

            RefreshPrompt();
        }

        public void ClearTarget()
        {
            _currentInteractable = null;
            _currentTargetTransform = null;

            if (_prompt != null)
            {
                _prompt.Hide();
            }
        }

        private void HandleStateTransition(Cristal.CLI.Memory.CristalState from, Cristal.CLI.Memory.CristalState to)
        {
            _lastState = to;

            // If we're currently focusing something, update text/urgency on state changes.
            if (_currentTargetTransform != null)
            {
                RefreshPrompt();
            }
        }

        private void RefreshPrompt()
        {
            if (_prompt == null || _resolver == null || _currentTargetTransform == null)
            {
                return;
            }

            var context = _resolver.Resolve(_currentInteractable, _currentTargetTransform);

            // If there's no action text, hide.
            if (string.IsNullOrEmpty(context.ActionText))
            {
                _prompt.Hide();
                return;
            }

            _prompt.Show(
                target: _currentTargetTransform,
                actionText: context.ActionText,
                keyText: context.KeyText,
                urgency: context.Urgency
            );
        }
    }
}

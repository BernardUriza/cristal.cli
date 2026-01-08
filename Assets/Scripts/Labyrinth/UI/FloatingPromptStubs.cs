using UnityEngine;

namespace Cristal.CLI.Labyrinth.UI
{
    /// <summary>
    /// Stub for FloatingInteractPrompt - TODO: Restore from Phase 7
    /// </summary>
    public class FloatingInteractPrompt : MonoBehaviour
    {
        public void Show(Transform target, string prompt) { }
        public void Show(Transform target, string prompt, PromptState state) { }
        public void Hide() { }
        public void UpdatePosition() { }
    }

    /// <summary>
    /// Stub for FloatingPromptController - TODO: Restore from Phase 7
    /// </summary>
    public class FloatingPromptController : MonoBehaviour
    {
        public void ShowPrompt(Transform target, string text) { }
        public void HidePrompt() { }
        public void SetTarget(IInteractable interactable, Transform target) { }
        public void ClearTarget() { }
    }
}

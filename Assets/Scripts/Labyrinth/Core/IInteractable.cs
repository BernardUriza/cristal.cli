namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Interface for objects that can be interacted with by the player.
    /// </summary>
    public interface IInteractable
    {
        /// <summary>
        /// The prompt text shown to the player (e.g., "Press E to interact").
        /// </summary>
        string InteractPrompt { get; }

        /// <summary>
        /// Whether this object can currently be interacted with.
        /// </summary>
        bool CanInteract { get; }

        /// <summary>
        /// Called when the player presses the interact button.
        /// </summary>
        void OnInteract(PlayerInteraction player);

        /// <summary>
        /// Called when the player looks at/focuses on this interactable.
        /// </summary>
        void OnFocus();

        /// <summary>
        /// Called when the player looks away from this interactable.
        /// </summary>
        void OnUnfocus();
    }
}

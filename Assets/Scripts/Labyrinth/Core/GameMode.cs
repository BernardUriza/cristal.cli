namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Defines the current gameplay mode in the labyrinth.
    /// </summary>
    public enum GameMode
    {
        /// <summary>
        /// Player is freely exploring the 3D labyrinth.
        /// Movement and camera are active.
        /// </summary>
        Exploration,

        /// <summary>
        /// Player is interacting with a terminal console.
        /// Movement is disabled, terminal UI is active.
        /// </summary>
        Console,

        /// <summary>
        /// Transitioning between modes (e.g., camera lerping to console).
        /// Input is blocked during transition.
        /// </summary>
        Transition
    }
}

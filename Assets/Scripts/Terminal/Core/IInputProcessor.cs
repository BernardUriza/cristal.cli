using System;

namespace Cristal.CLI.Core
{
    /// <summary>
    /// Interface for input processing - enables testing without Unity.
    /// </summary>
    public interface IInputProcessor
    {
        /// <summary>
        /// Process raw input and return a response.
        /// </summary>
        TerminalResponse Process(string input);

        /// <summary>
        /// Event fired when input is received.
        /// </summary>
        event Action<string> OnInputReceived;

        /// <summary>
        /// Event fired when response is generated.
        /// </summary>
        event Action<TerminalResponse> OnResponseGenerated;
    }

    /// <summary>
    /// Pure function processor for testable input processing.
    /// </summary>
    public interface IResponseGenerator
    {
        /// <summary>
        /// Generate response for input in given state.
        /// </summary>
        TerminalResponse Generate(string input, string currentState);
    }
}

using Cristal.CLI.Input;
using Cristal.CLI.Response;
using Cristal.CLI.Core;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Labyrinth.Player
{
    /// <summary>
    /// Handles avatar-related terminal commands.
    /// Integrates with existing TerminalCore command flow.
    /// </summary>
    public static class AvatarCommandHandler
    {
        /// <summary>
        /// Attempts to process avatar command. Returns null if not an avatar command.
        /// </summary>
        public static BuiltResponse TryProcessCommand(ParsedCommand command)
        {
            if (!command.IsCommand)
            {
                return null;
            }

            switch (command.Command.ToLower())
            {
                case "avatar":
                case "avatars":
                    return HandleAvatarCommand(command);

                default:
                    return null;
            }
        }

        private static BuiltResponse HandleAvatarCommand(ParsedCommand command)
        {
            var avatarManager = ServiceLocator.TryGet<AvatarManager>();

            if (avatarManager == null)
            {
                return BuildErrorResponse("Avatar system not initialized.");
            }

            // No arguments: list all avatars
            if (command.ArgumentCount == 0)
            {
                string list = avatarManager.FormatAvatarList();
                return BuildSuccessResponse(list);
            }

            // Special arguments
            string firstArg = command.Arguments[0].ToLower();

            switch (firstArg)
            {
                case "list":
                case "all":
                    return BuildSuccessResponse(avatarManager.FormatAvatarList());

                case "info":
                case "current":
                    return BuildSuccessResponse(avatarManager.GetCurrentAvatarInfo());

                case "help":
                    return BuildHelpResponse();

                default:
                    // Try to select avatar by ID
                    return SelectAvatar(avatarManager, firstArg);
            }
        }

        private static BuiltResponse SelectAvatar(AvatarManager manager, string avatarId)
        {
            bool success = manager.SelectAvatar(avatarId);

            if (success)
            {
                var avatar = manager.CurrentAvatar;
                string message = $"\n> Avatar changed: {avatar.DisplayName}\n\n" +
                               $"{avatar.Description}\n\n" +
                               $"\"{avatar.FlavorText}\"\n\n" +
                               $"Archetype: {avatar.Archetype}\n";

                return BuildSuccessResponse(message);
            }
            else
            {
                string message = $"Avatar '{avatarId}' not found.\n" +
                               "Use 'avatar' to see available avatars.";
                return BuildErrorResponse(message);
            }
        }

        private static BuiltResponse BuildSuccessResponse(string text)
        {
            return new BuiltResponse
            {
                Lines = new System.Collections.Generic.List<string> { text },
                Level = ResponseLevel.Literal,
                ApplyGlitch = false
            };
        }

        private static BuiltResponse BuildErrorResponse(string text)
        {
            return new BuiltResponse
            {
                Lines = new System.Collections.Generic.List<string> { text },
                Level = ResponseLevel.Literal,
                ApplyGlitch = false
            };
        }

        private static BuiltResponse BuildHelpResponse()
        {
            string help = "\n=== AVATAR COMMANDS ===\n\n" +
                        "avatar                - List all available avatars\n" +
                        "avatar <id>           - Select avatar by ID\n" +
                        "avatar info           - Show current avatar details\n" +
                        "avatar help           - Show this help\n\n" +
                        "Examples:\n" +
                        "  avatar vampire_lusth\n" +
                        "  avatar demon\n" +
                        "  avatar info\n";

            return BuildSuccessResponse(help);
        }
    }
}

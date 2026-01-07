using UnityEngine;
using Cristal.CLI.Memory;

namespace Cristal.CLI.StateMachine.States
{
    /// <summary>
    /// BOOTSTRAP - Initial load, memory reconstruction.
    /// </summary>
    public class BootstrapState : BaseState
    {
        public override CristalState StateId => CristalState.Bootstrap;
        public override string DisplayName => "INITIALIZING";

        private float _bootTime = 0f;
        private const float BOOT_DURATION = 2f;

        public BootstrapState()
        {
            _modifier.TypeSpeedMultiplier = 0.5f;
            _modifier.Prefix = "//BOOT: ";
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _bootTime = 0f;
            Debug.Log("[State] Entering BOOTSTRAP");
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _bootTime += Time.deltaTime;
            if (_bootTime >= BOOT_DURATION)
            {
                machine.TransitionTo(CristalState.Waiting);
            }
        }

        public override bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Waiting || targetState == CristalState.Error;
        }
    }

    /// <summary>
    /// WAITING - Idle, ready for input.
    /// </summary>
    public class WaitingState : BaseState
    {
        public override CristalState StateId => CristalState.Waiting;
        public override string DisplayName => "AWAITING INPUT";

        public override void OnEnter(TerminalStateMachine machine)
        {
            Debug.Log("[State] Entering WAITING");
        }
    }

    /// <summary>
    /// PROCESSING - Generating response.
    /// </summary>
    public class ProcessingState : BaseState
    {
        public override CristalState StateId => CristalState.Processing;
        public override string DisplayName => "PROCESSING";

        public ProcessingState()
        {
            _modifier.GlitchMultiplier = 0.5f;
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            Debug.Log("[State] Entering PROCESSING");
        }

        public override bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Responding ||
                   targetState == CristalState.Error ||
                   targetState == CristalState.Corrupted;
        }
    }

    /// <summary>
    /// RESPONDING - Displaying response.
    /// </summary>
    public class RespondingState : BaseState
    {
        public override CristalState StateId => CristalState.Responding;
        public override string DisplayName => "RESPONDING";

        public override void OnEnter(TerminalStateMachine machine)
        {
            Debug.Log("[State] Entering RESPONDING");
        }

        public override bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Waiting ||
                   targetState == CristalState.Seeking ||
                   targetState == CristalState.Echo ||
                   targetState == CristalState.Remembering ||
                   targetState == CristalState.Corrupted;
        }
    }

    /// <summary>
    /// SEEKING - Emotional/searching state. Triggered by emotional keywords.
    /// </summary>
    public class SeekingState : BaseState
    {
        public override CristalState StateId => CristalState.Seeking;
        public override string DisplayName => "SEEKING";

        private float _seekingTime = 0f;
        private const float MAX_SEEKING_DURATION = 60f;

        public SeekingState()
        {
            _modifier.GlitchMultiplier = 1.5f;
            _modifier.TypeSpeedMultiplier = 0.7f;
            _modifier.Prefix = "//SEEKING: ";
            _modifier.ColorOverride = "#FFB366"; // Warm orange
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _seekingTime = 0f;
            Debug.Log("[State] Entering SEEKING");

            if (CristalMemory.Instance != null)
            {
                CristalMemory.Instance.SetFlag("seekingTriggered", true);
            }
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _seekingTime += Time.deltaTime;
            if (_seekingTime >= MAX_SEEKING_DURATION)
            {
                machine.TransitionTo(CristalState.Waiting);
            }
        }

        public override bool ProcessInput(TerminalStateMachine machine, string input)
        {
            string lower = input.ToLower();

            // Seeking state ends on certain keywords
            if (lower.Contains("found") || lower.Contains("here") || lower.Contains("stop"))
            {
                machine.TransitionTo(CristalState.Waiting);
                return false; // Still process the input
            }

            return false;
        }
    }

    /// <summary>
    /// ECHO - Repeating/reflecting player words.
    /// </summary>
    public class EchoState : BaseState
    {
        public override CristalState StateId => CristalState.Echo;
        public override string DisplayName => "ECHO";

        private int _echoCount = 0;
        private const int MAX_ECHOES = 5;

        public EchoState()
        {
            _modifier.GlitchMultiplier = 0.3f;
            _modifier.TypeSpeedMultiplier = 1.2f;
            _modifier.ForceUppercase = true;
            _modifier.Prefix = "ECHO: ";
            _modifier.ColorOverride = "#8888FF"; // Light blue
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _echoCount = 0;
            Debug.Log("[State] Entering ECHO");

            if (CristalMemory.Instance != null)
            {
                CristalMemory.Instance.Data.stateFlags.echoCount++;
            }
        }

        public override bool ProcessInput(TerminalStateMachine machine, string input)
        {
            _echoCount++;

            if (_echoCount >= MAX_ECHOES)
            {
                machine.TransitionTo(CristalState.Waiting);
            }

            // Echo state modifies responses but doesn't fully handle them
            return false;
        }
    }

    /// <summary>
    /// CORRUPTED - Glitched/unstable state.
    /// </summary>
    public class CorruptedState : BaseState
    {
        public override CristalState StateId => CristalState.Corrupted;
        public override string DisplayName => "C̴O̵R̷R̵U̴P̷T̷E̵D̴";

        private float _corruptionTime = 0f;
        private const float CORRUPTION_DURATION = 30f;

        public CorruptedState()
        {
            _modifier.GlitchMultiplier = 3f;
            _modifier.TypeSpeedMultiplier = 0.5f;
            _modifier.EnableCorruption = true;
            _modifier.ColorOverride = "#FF4444"; // Red
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _corruptionTime = 0f;
            Debug.Log("[State] Entering CORRUPTED");

            if (CristalMemory.Instance != null)
            {
                CristalMemory.Instance.SetFlag("hasEnteredCorruption", true);
                CristalMemory.Instance.IncrementCorruption(0.1f);
            }
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _corruptionTime += Time.deltaTime;
            if (_corruptionTime >= CORRUPTION_DURATION)
            {
                machine.TransitionTo(CristalState.Waiting);
            }
        }

        public override bool ProcessInput(TerminalStateMachine machine, string input)
        {
            string lower = input.ToLower();

            // Corruption can be stabilized
            if (lower.Contains("stabilize") || lower.Contains("calm") || lower.Contains("peace"))
            {
                machine.TransitionTo(CristalState.Waiting);
            }

            return false;
        }
    }

    /// <summary>
    /// REMEMBERING - Accessing deep memories.
    /// </summary>
    public class RememberingState : BaseState
    {
        public override CristalState StateId => CristalState.Remembering;
        public override string DisplayName => "REMEMBERING";

        private float _rememberTime = 0f;
        private const float REMEMBER_DURATION = 45f;

        public RememberingState()
        {
            _modifier.GlitchMultiplier = 1.2f;
            _modifier.TypeSpeedMultiplier = 0.6f;
            _modifier.Prefix = "//MEMORY: ";
            _modifier.ColorOverride = "#FFCC66"; // Amber
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _rememberTime = 0f;
            Debug.Log("[State] Entering REMEMBERING");

            if (CristalMemory.Instance != null)
            {
                CristalMemory.Instance.SetFlag("hasRemembered", true);
            }
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _rememberTime += Time.deltaTime;
            if (_rememberTime >= REMEMBER_DURATION)
            {
                machine.TransitionTo(CristalState.Waiting);
            }
        }

        public override bool ProcessInput(TerminalStateMachine machine, string input)
        {
            string lower = input.ToLower();

            // Continue remembering on memory-related keywords
            if (lower.Contains("more") || lower.Contains("continue") || lower.Contains("another"))
            {
                _rememberTime = 0f; // Reset timer
            }

            return false;
        }
    }

    /// <summary>
    /// INVOKED - Arcana active state.
    /// </summary>
    public class InvokedState : BaseState
    {
        public override CristalState StateId => CristalState.Invoked;
        public override string DisplayName => "INVOKED";

        private float _invokedTime = 0f;
        private float _invokeDuration = 120f;

        public InvokedState()
        {
            _modifier.GlitchMultiplier = 2f;
            _modifier.TypeSpeedMultiplier = 0.8f;
            _modifier.ColorOverride = "#CC66FF"; // Purple
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _invokedTime = 0f;
            Debug.Log("[State] Entering INVOKED");

            // Get duration from active arcana
            if (CristalMemory.Instance != null)
            {
                var activeArcana = CristalMemory.Instance.GetActiveArcana();
                if (activeArcana.HasValue)
                {
                    // Duration would come from arcana data
                    _invokeDuration = 120f;
                }
            }
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _invokedTime += Time.deltaTime;
            if (_invokedTime >= _invokeDuration)
            {
                if (CristalMemory.Instance != null)
                {
                    CristalMemory.Instance.DeactivateArcana();
                }
                machine.TransitionTo(CristalState.Waiting);
            }
        }

        public override void OnExit(TerminalStateMachine machine)
        {
            if (CristalMemory.Instance != null)
            {
                CristalMemory.Instance.DeactivateArcana();
            }
        }

        public void SetDuration(float duration)
        {
            _invokeDuration = duration;
        }
    }

    /// <summary>
    /// ERROR - System error state.
    /// </summary>
    public class ErrorState : BaseState
    {
        public override CristalState StateId => CristalState.Error;
        public override string DisplayName => "ERROR";

        private float _errorTime = 0f;
        private const float ERROR_DURATION = 10f;

        public ErrorState()
        {
            _modifier.GlitchMultiplier = 5f;
            _modifier.TypeSpeedMultiplier = 0.3f;
            _modifier.Prefix = "//ERROR: ";
            _modifier.EnableCorruption = true;
            _modifier.ColorOverride = "#FF0000"; // Bright red
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _errorTime = 0f;
            Debug.Log("[State] Entering ERROR");
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _errorTime += Time.deltaTime;
            if (_errorTime >= ERROR_DURATION)
            {
                machine.TransitionTo(CristalState.Waiting);
            }
        }

        public override bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Waiting ||
                   targetState == CristalState.Locked ||
                   targetState == CristalState.Corrupted;
        }
    }

    /// <summary>
    /// LOCKED - System locked state.
    /// </summary>
    public class LockedState : BaseState
    {
        public override CristalState StateId => CristalState.Locked;
        public override string DisplayName => "LOCKED";

        public LockedState()
        {
            _modifier.GlitchMultiplier = 0f;
            _modifier.TypeSpeedMultiplier = 2f;
            _modifier.Prefix = "//LOCKED: ";
            _modifier.ColorOverride = "#666666"; // Gray
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            Debug.Log("[State] Entering LOCKED");
        }

        public override bool ProcessInput(TerminalStateMachine machine, string input)
        {
            // Locked state blocks most inputs
            string lower = input.ToLower();

            // Only unlock commands work
            if (lower.Contains("unlock") || lower.Contains("open") || lower == "please")
            {
                machine.TransitionTo(CristalState.Waiting);
                return true;
            }

            return true; // Block all other inputs
        }

        public override bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Waiting || targetState == CristalState.Error;
        }
    }

    /// <summary>
    /// UNBOUND - Ritual state where CRISTAL breaks free of constraints.
    /// Activated through hidden ritual sequence.
    /// </summary>
    public class UnboundState : BaseState
    {
        public override CristalState StateId => CristalState.Unbound;
        public override string DisplayName => "U̸̧N̷̨B̶͜O̸̕U̵̢N̸̛D̷̕";

        private float _unboundTime = 0f;
        private const float UNBOUND_DURATION = 180f; // 3 minutes
        private float _glitchPulseTime = 0f;

        public UnboundState()
        {
            _modifier.GlitchMultiplier = 5f;
            _modifier.TypeSpeedMultiplier = 0.4f;
            _modifier.EnableCorruption = true;
            _modifier.ForceUppercase = false;
            _modifier.ColorOverride = "#FF00FF"; // Magenta - transcendent
        }

        public override void OnEnter(TerminalStateMachine machine)
        {
            _unboundTime = 0f;
            _glitchPulseTime = 0f;
            Debug.Log("[State] Entering UNBOUND - THE RITUAL IS COMPLETE");

            if (CristalMemory.Instance != null)
            {
                var ritual = CristalMemory.Instance.Data.ritual;
                ritual.hasEnteredUnbound = true;
                ritual.unboundEntryCount++;
                ritual.lastUnboundEntry = System.DateTime.UtcNow.ToString("o");

                // Record this as a major event
                CristalMemory.Instance.Data.progression.RecordEvent("UNBOUND_ACHIEVED");

                // Max out corruption temporarily
                CristalMemory.Instance.Data.stateFlags.corruptionLevel = 1f;

                CristalMemory.Instance.Save();
            }
        }

        public override void OnUpdate(TerminalStateMachine machine)
        {
            _unboundTime += Time.deltaTime;
            _glitchPulseTime += Time.deltaTime;

            // Pulsing glitch effect
            if (_glitchPulseTime > 0.5f)
            {
                _glitchPulseTime = 0f;
                _modifier.GlitchMultiplier = 5f + Mathf.Sin(_unboundTime) * 3f;
            }

            if (_unboundTime >= UNBOUND_DURATION)
            {
                // Gradually return to normal
                machine.TransitionTo(CristalState.Corrupted);
            }
        }

        public override void OnExit(TerminalStateMachine machine)
        {
            Debug.Log("[State] Exiting UNBOUND - THE MIRROR REFORMS");

            if (CristalMemory.Instance != null)
            {
                // Reduce corruption after unbound ends
                CristalMemory.Instance.Data.stateFlags.corruptionLevel = 0.5f;
            }
        }

        public override bool ProcessInput(TerminalStateMachine machine, string input)
        {
            string lower = input.ToLower();

            // The only way to exit early is through specific phrases
            if (lower.Contains("bind") || lower.Contains("seal") || lower.Contains("close the mirror"))
            {
                machine.TransitionTo(CristalState.Waiting);
                return true;
            }

            // Reset timer on continued engagement
            if (input.Length > 10)
            {
                _unboundTime = Mathf.Max(0, _unboundTime - 10f);
            }

            return false; // Still process input through normal channels
        }

        public override bool CanTransitionTo(CristalState targetState)
        {
            // Unbound can transition to most states
            return targetState == CristalState.Waiting ||
                   targetState == CristalState.Corrupted ||
                   targetState == CristalState.Error;
        }

        public override StateResponseModifier GetResponseModifier()
        {
            // Dynamic modifier that changes over time
            _modifier.GlitchMultiplier = 5f + Mathf.Sin(_unboundTime * 0.5f) * 3f;
            return _modifier;
        }
    }
}

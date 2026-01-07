using System.Collections.Generic;
using Cristal.CLI.Memory;

namespace Cristal.CLI.StateMachine.Core
{
    /// <summary>
    /// Testable state implementations without Unity dependencies.
    /// These can be unit tested in isolation.
    /// </summary>
    /// 
    public class TestableBootstrapState : IStateLogic
    {
        public CristalState StateId => CristalState.Bootstrap;
        
        private float _bootTime = 0f;
        private const float BOOT_DURATION = 2f;
        private readonly StateResponseModifier _modifier;

        public TestableBootstrapState()
        {
            _modifier = new StateResponseModifier
            {
                TypeSpeedMultiplier = 0.5f,
                Prefix = "//BOOT: "
            };
        }

        public bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Waiting || targetState == CristalState.Error;
        }

        public StateResponseModifier GetModifier() => _modifier;

        public void OnEnter(IStateContext context)
        {
            _bootTime = 0f;
        }

        public void OnExit(IStateContext context) { }

        public void OnUpdate(IStateContext context, float deltaTime)
        {
            _bootTime += deltaTime;
            if (_bootTime >= BOOT_DURATION)
            {
                context.TransitionTo(CristalState.Waiting);
            }
        }

        public bool ProcessInput(string input, IStateContext context)
        {
            return false;
        }
    }

    public class TestableWaitingState : IStateLogic
    {
        public CristalState StateId => CristalState.Waiting;
        
        private readonly StateResponseModifier _modifier = new StateResponseModifier();

        public bool CanTransitionTo(CristalState targetState) => true;
        public StateResponseModifier GetModifier() => _modifier;
        public void OnEnter(IStateContext context) { }
        public void OnExit(IStateContext context) { }
        public void OnUpdate(IStateContext context, float deltaTime) { }
        public bool ProcessInput(string input, IStateContext context) => false;
    }

    public class TestableProcessingState : IStateLogic
    {
        public CristalState StateId => CristalState.Processing;
        
        private readonly StateResponseModifier _modifier;

        public TestableProcessingState()
        {
            _modifier = new StateResponseModifier { GlitchMultiplier = 0.5f };
        }

        public bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Responding ||
                   targetState == CristalState.Error ||
                   targetState == CristalState.Corrupted;
        }

        public StateResponseModifier GetModifier() => _modifier;
        public void OnEnter(IStateContext context) { }
        public void OnExit(IStateContext context) { }
        public void OnUpdate(IStateContext context, float deltaTime) { }
        public bool ProcessInput(string input, IStateContext context) => false;
    }

    public class TestableRespondingState : IStateLogic
    {
        public CristalState StateId => CristalState.Responding;
        
        private readonly StateResponseModifier _modifier = new StateResponseModifier();

        public bool CanTransitionTo(CristalState targetState)
        {
            return targetState == CristalState.Waiting ||
                   targetState == CristalState.Seeking ||
                   targetState == CristalState.Echo ||
                   targetState == CristalState.Remembering ||
                   targetState == CristalState.Corrupted;
        }

        public StateResponseModifier GetModifier() => _modifier;
        public void OnEnter(IStateContext context) { }
        public void OnExit(IStateContext context) { }
        public void OnUpdate(IStateContext context, float deltaTime) { }
        public bool ProcessInput(string input, IStateContext context) => false;
    }

    public class TestableSeekingState : IStateLogic
    {
        public CristalState StateId => CristalState.Seeking;
        
        private float _seekingTime = 0f;
        private const float MAX_SEEKING_DURATION = 60f;
        private readonly StateResponseModifier _modifier;
        private readonly HashSet<string> _exitKeywords = new HashSet<string> { "found", "here", "stop" };

        public TestableSeekingState()
        {
            _modifier = new StateResponseModifier
            {
                GlitchMultiplier = 1.5f,
                TypeSpeedMultiplier = 0.7f,
                Prefix = "//SEEKING: ",
                ColorOverride = "#FFB366"
            };
        }

        public bool CanTransitionTo(CristalState targetState) => true;
        public StateResponseModifier GetModifier() => _modifier;

        public void OnEnter(IStateContext context)
        {
            _seekingTime = 0f;
        }

        public void OnExit(IStateContext context) { }

        public void OnUpdate(IStateContext context, float deltaTime)
        {
            _seekingTime += deltaTime;
            if (_seekingTime >= MAX_SEEKING_DURATION)
            {
                context.TransitionTo(CristalState.Waiting);
            }
        }

        public bool ProcessInput(string input, IStateContext context)
        {
            string lower = input.ToLowerInvariant();
            foreach (var keyword in _exitKeywords)
            {
                if (lower.Contains(keyword))
                {
                    context.TransitionTo(CristalState.Waiting);
                    return false;
                }
            }
            return false;
        }
    }

    public class TestableEchoState : IStateLogic
    {
        public CristalState StateId => CristalState.Echo;
        
        private int _echoCount = 0;
        private const int MAX_ECHOES = 5;
        private readonly StateResponseModifier _modifier;

        public TestableEchoState()
        {
            _modifier = new StateResponseModifier
            {
                GlitchMultiplier = 0.3f,
                TypeSpeedMultiplier = 1.2f,
                ForceUppercase = true,
                Prefix = "ECHO: ",
                ColorOverride = "#8888FF"
            };
        }

        public bool CanTransitionTo(CristalState targetState) => true;
        public StateResponseModifier GetModifier() => _modifier;

        public void OnEnter(IStateContext context)
        {
            _echoCount = 0;
        }

        public void OnExit(IStateContext context) { }
        public void OnUpdate(IStateContext context, float deltaTime) { }

        public bool ProcessInput(string input, IStateContext context)
        {
            _echoCount++;
            if (_echoCount >= MAX_ECHOES)
            {
                context.TransitionTo(CristalState.Waiting);
            }
            return false;
        }
    }

    public class TestableCorruptedState : IStateLogic
    {
        public CristalState StateId => CristalState.Corrupted;
        
        private float _corruptionTime = 0f;
        private const float CORRUPTION_DURATION = 30f;
        private readonly StateResponseModifier _modifier;
        private readonly HashSet<string> _stabilizeKeywords = new HashSet<string> { "stabilize", "calm", "peace" };

        public TestableCorruptedState()
        {
            _modifier = new StateResponseModifier
            {
                GlitchMultiplier = 3f,
                TypeSpeedMultiplier = 0.5f,
                EnableCorruption = true,
                ColorOverride = "#FF4444"
            };
        }

        public bool CanTransitionTo(CristalState targetState) => true;
        public StateResponseModifier GetModifier() => _modifier;

        public void OnEnter(IStateContext context)
        {
            _corruptionTime = 0f;
        }

        public void OnExit(IStateContext context) { }

        public void OnUpdate(IStateContext context, float deltaTime)
        {
            _corruptionTime += deltaTime;
            if (_corruptionTime >= CORRUPTION_DURATION)
            {
                context.TransitionTo(CristalState.Waiting);
            }
        }

        public bool ProcessInput(string input, IStateContext context)
        {
            string lower = input.ToLowerInvariant();
            foreach (var keyword in _stabilizeKeywords)
            {
                if (lower.Contains(keyword))
                {
                    context.TransitionTo(CristalState.Waiting);
                    break;
                }
            }
            return false;
        }
    }

    public class TestableRememberingState : IStateLogic
    {
        public CristalState StateId => CristalState.Remembering;
        
        private float _rememberTime = 0f;
        private const float REMEMBER_DURATION = 45f;
        private readonly StateResponseModifier _modifier;

        public TestableRememberingState()
        {
            _modifier = new StateResponseModifier
            {
                GlitchMultiplier = 1.2f,
                TypeSpeedMultiplier = 0.6f,
                Prefix = "//MEMORY: ",
                ColorOverride = "#FFCC66"
            };
        }

        public bool CanTransitionTo(CristalState targetState) => true;
        public StateResponseModifier GetModifier() => _modifier;

        public void OnEnter(IStateContext context)
        {
            _rememberTime = 0f;
        }

        public void OnExit(IStateContext context) { }

        public void OnUpdate(IStateContext context, float deltaTime)
        {
            _rememberTime += deltaTime;
            if (_rememberTime >= REMEMBER_DURATION)
            {
                context.TransitionTo(CristalState.Waiting);
            }
        }

        public bool ProcessInput(string input, IStateContext context) => false;
    }

    /// <summary>
    /// Factory to create testable state machine with all states.
    /// </summary>
    public static class TestableStateFactory
    {
        public static TestableStateMachine CreateFullStateMachine()
        {
            var machine = new TestableStateMachine();
            
            machine.RegisterState(new TestableBootstrapState());
            machine.RegisterState(new TestableWaitingState());
            machine.RegisterState(new TestableProcessingState());
            machine.RegisterState(new TestableRespondingState());
            machine.RegisterState(new TestableSeekingState());
            machine.RegisterState(new TestableEchoState());
            machine.RegisterState(new TestableCorruptedState());
            machine.RegisterState(new TestableRememberingState());
            
            return machine;
        }
    }
}

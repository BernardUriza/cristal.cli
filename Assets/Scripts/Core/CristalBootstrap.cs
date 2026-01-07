using UnityEngine;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Memory;
using Cristal.CLI.Response;
using Cristal.CLI.Arcana;
using Cristal.CLI.Effects;
using Cristal.CLI.AI;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Core
{
    /// <summary>
    /// Bootstrap component that initializes all CRISTAL services in correct order.
    /// 
    /// Place this on a GameObject that loads FIRST (before any scene-specific logic).
    /// Uses [DefaultExecutionOrder(-100)] to run before other scripts.
    /// 
    /// This replaces the scattered singleton pattern with centralized initialization.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class CristalBootstrap : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private LogConfig _logConfig;
        [SerializeField] private bool _dontDestroyOnLoad = true;

        [Header("Optional Service References")]
        [Tooltip("If null, will find in scene or create")]
        [SerializeField] private TerminalStateMachine _stateMachine;
        [SerializeField] private CristalMemory _memory;
        [SerializeField] private ResponseEngine _responseEngine;
        [SerializeField] private ArcanaSystem _arcanaSystem;
        [SerializeField] private VisualEffectsController _effectsController;
        [SerializeField] private AIIntegration _aiIntegration;
        [SerializeField] private RitualSystem _ritualSystem;
        [SerializeField] private VisionManager _visionManager;

        private static bool _isInitialized;

        private void Awake()
        {
            if (_isInitialized)
            {
                Destroy(gameObject);
                return;
            }

            _isInitialized = true;

            if (_dontDestroyOnLoad)
            {
                DontDestroyOnLoad(gameObject);
            }

            InitializeServices();
        }

        private void InitializeServices()
        {
            // 1. Logging first
            if (_logConfig != null)
            {
                CristalLog.Initialize(_logConfig);
            }

            CristalLog.Info("Bootstrap", "Initializing CRISTAL services...");

            // 2. Core systems (order matters)
            RegisterService(ref _memory, "CristalMemory");
            RegisterService(ref _stateMachine, "TerminalStateMachine");
            RegisterService(ref _responseEngine, "ResponseEngine");

            // 3. Feature systems
            RegisterService(ref _arcanaSystem, "ArcanaSystem");
            RegisterService(ref _effectsController, "VisualEffectsController");
            RegisterService(ref _ritualSystem, "RitualSystem");
            RegisterService(ref _visionManager, "VisionManager");

            // 4. AI (optional)
            if (_aiIntegration != null)
            {
                ServiceLocator.RegisterMono(_aiIntegration);
            }

            CristalLog.Info("Bootstrap", "CRISTAL services initialized");
        }

        private void RegisterService<T>(ref T service, string name) where T : MonoBehaviour
        {
            if (service == null)
            {
                service = FindFirstObjectByType<T>();
            }

            if (service != null)
            {
                ServiceLocator.RegisterMono(service);
                CristalLog.Info("Bootstrap", $"Registered: {name}");
            }
            else
            {
                CristalLog.Warning("Bootstrap", $"Service not found: {name}");
            }
        }

        private void OnApplicationQuit()
        {
            ServiceLocator.Shutdown();
            _isInitialized = false;
        }

        #if UNITY_EDITOR
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        private static void ResetStatics()
        {
            // Reset for domain reload in editor
            _isInitialized = false;
            ServiceLocator.Reset();
        }
        #endif
    }
}

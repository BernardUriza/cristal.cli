using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Core.Events;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Symbolic
{
    /// <summary>
    /// Central system for procedural symbolic generation.
    /// Subscribes to ReactiveSystemBus and generates symbols in response to events.
    /// 
    /// The Forge is the creative engine of CRISTAL's visual symbolism -
    /// transforming abstract events into concrete visual manifestations.
    /// </summary>
    public class SymbolicForge : MonoBehaviour, IReactiveSystem
    {
        [Header("Configuration")]
        [SerializeField] private bool _autoGenerateOnEvents = true;
        [SerializeField] private int _maxCachedSymbols = 50;
        [SerializeField] private bool _exportToFiles = false;
        [SerializeField] private string _exportPath = "Exports/Symbols";

        [Header("Templates")]
        [SerializeField] private SymbolicTemplate _defaultTemplate;
        [SerializeField] private SymbolicTemplate[] _archetypeTemplates;

        [Header("Projectors")]
        [SerializeField] private SymbolicProjection[] _projectors;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Reactive signals we respond to
        public SymbolicSignalType[] SubscribedSignals => new[]
        {
            SymbolicSignalType.ArcanaInvoked,
            SymbolicSignalType.ArcanaUnlocked,
            SymbolicSignalType.MemoryRecovered,
            SymbolicSignalType.MemoryOversaturation,
            SymbolicSignalType.UnboundTriggered,
            SymbolicSignalType.VisionUnlocked,
            SymbolicSignalType.CorruptionSpike,
            SymbolicSignalType.EchoTriggered,
            SymbolicSignalType.GateOpened
        };

        // Events
        public event Action<GeneratedSymbol> OnSymbolGenerated;
        public event Action<GeneratedSymbol, SymbolicProjection> OnSymbolProjected;

        // Cache
        private Queue<GeneratedSymbol> _symbolCache = new();
        private Dictionary<SymbolicArchetype, SymbolicTemplate> _templateLookup = new();
        private SymbolicMemoryLog _memoryLog;

        // Statistics
        private int _totalSymbolsGenerated = 0;
        private float _lastGenerationTime;

        public int TotalSymbolsGenerated => _totalSymbolsGenerated;
        public GeneratedSymbol LastGeneratedSymbol => _symbolCache.Count > 0 ? _symbolCache.Peek() : null;

        #region Unity Lifecycle

        private void Awake()
        {
            ServiceLocator.Register(this);
            BuildTemplateLookup();

            _memoryLog = GetComponent<SymbolicMemoryLog>();
            if (_memoryLog == null)
            {
                _memoryLog = gameObject.AddComponent<SymbolicMemoryLog>();
            }
        }

        private void OnEnable()
        {
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Subscribe(signal, OnSymbolicEvent);
            }
        }

        private void OnDisable()
        {
            foreach (var signal in SubscribedSignals)
            {
                ReactiveSystemBus.Unsubscribe(signal, OnSymbolicEvent);
            }
        }

        private void OnDestroy()
        {
            ServiceLocator.Unregister<SymbolicForge>();
        }

        #endregion

        #region Reactive Event Handling

        public void OnSymbolicEvent(in SymbolicEvent evt)
        {
            if (!_autoGenerateOnEvents) return;

            if (_debugMode)
            {
                Debug.Log($"[SymbolicForge] Received: {evt.Signal} at intensity {evt.Intensity}");
            }

            // Generate symbol based on event
            var symbol = GenerateFromEvent(in evt);

            // Auto-project if we have available projectors
            if (_projectors != null && _projectors.Length > 0)
            {
                ProjectSymbol(symbol);
            }
        }

        #endregion

        #region Generation API

        /// <summary>
        /// Generate a symbol from a reactive event.
        /// </summary>
        public GeneratedSymbol GenerateFromEvent(in SymbolicEvent evt)
        {
            // Find matching template
            var archetype = MapEventToArchetype(evt);
            var template = GetTemplateForArchetype(archetype);

            // Generate
            var symbol = SVGGenerator.GenerateFromEvent(in evt, template);

            // Cache and log
            CacheSymbol(symbol);
            _memoryLog?.LogSymbol(symbol, evt);

            // Notify
            OnSymbolGenerated?.Invoke(symbol);

            // Export if enabled
            if (_exportToFiles)
            {
                ExportSymbol(symbol);
            }

            _totalSymbolsGenerated++;
            _lastGenerationTime = Time.time;

            if (_debugMode)
            {
                Debug.Log($"[SymbolicForge] Generated: {symbol}");
            }

            return symbol;
        }

        /// <summary>
        /// Generate a symbol from an archetype directly.
        /// </summary>
        public GeneratedSymbol GenerateFromArchetype(SymbolicArchetype archetype, int intensity = 50)
        {
            var template = GetTemplateForArchetype(archetype);
            var symbol = SVGGenerator.Generate(template);
            symbol.Archetype = archetype;

            CacheSymbol(symbol);
            OnSymbolGenerated?.Invoke(symbol);

            _totalSymbolsGenerated++;
            return symbol;
        }

        /// <summary>
        /// Generate a quick symbol with minimal configuration.
        /// </summary>
        public string GenerateQuick(ShapeLanguage shape, string color = "#99FF99", int sides = 6)
        {
            return SVGGenerator.GenerateQuick(shape, color, sides);
        }

        #endregion

        #region Projection

        /// <summary>
        /// Project a symbol onto an available projector.
        /// </summary>
        public void ProjectSymbol(GeneratedSymbol symbol, SymbolicProjection targetProjector = null)
        {
            if (symbol == null) return;

            SymbolicProjection projector = targetProjector;

            // Find available projector if not specified
            if (projector == null && _projectors != null)
            {
                foreach (var p in _projectors)
                {
                    if (p != null && p.IsAvailable)
                    {
                        projector = p;
                        break;
                    }
                }
            }

            if (projector != null)
            {
                projector.Project(symbol);
                OnSymbolProjected?.Invoke(symbol, projector);

                if (_debugMode)
                {
                    Debug.Log($"[SymbolicForge] Projected {symbol.Archetype} to {projector.name}");
                }
            }
        }

        /// <summary>
        /// Project to all available projectors (for major events like UNBOUND).
        /// </summary>
        public void ProjectToAll(GeneratedSymbol symbol)
        {
            if (_projectors == null) return;

            foreach (var projector in _projectors)
            {
                if (projector != null)
                {
                    projector.Project(symbol);
                    OnSymbolProjected?.Invoke(symbol, projector);
                }
            }
        }

        /// <summary>
        /// Register a projector at runtime.
        /// </summary>
        public void RegisterProjector(SymbolicProjection projector)
        {
            var list = _projectors != null ? new List<SymbolicProjection>(_projectors) : new List<SymbolicProjection>();
            if (!list.Contains(projector))
            {
                list.Add(projector);
                _projectors = list.ToArray();
            }
        }

        #endregion

        #region Template Management

        private void BuildTemplateLookup()
        {
            _templateLookup.Clear();

            if (_archetypeTemplates != null)
            {
                foreach (var template in _archetypeTemplates)
                {
                    if (template != null && !_templateLookup.ContainsKey(template.archetype))
                    {
                        _templateLookup[template.archetype] = template;
                    }
                }
            }
        }

        private SymbolicTemplate GetTemplateForArchetype(SymbolicArchetype archetype)
        {
            if (_templateLookup.TryGetValue(archetype, out var template))
            {
                return template;
            }

            // Fallback to default or create runtime template
            return _defaultTemplate ?? SymbolicTemplate.CreateFromArchetype(archetype);
        }

        private SymbolicArchetype MapEventToArchetype(in SymbolicEvent evt)
        {
            return evt.Signal switch
            {
                SymbolicSignalType.ArcanaInvoked => MapArcanaToArchetype(evt.Payload),
                SymbolicSignalType.ArcanaUnlocked => MapArcanaToArchetype(evt.Payload),
                SymbolicSignalType.MemoryRecovered => SymbolicArchetype.TheMemory,
                SymbolicSignalType.MemoryOversaturation => SymbolicArchetype.TheCorruption,
                SymbolicSignalType.UnboundTriggered => SymbolicArchetype.TheUnbound,
                SymbolicSignalType.VisionUnlocked => SymbolicArchetype.TheVision,
                SymbolicSignalType.CorruptionSpike => SymbolicArchetype.TheCorruption,
                SymbolicSignalType.EchoTriggered => SymbolicArchetype.TheEcho,
                SymbolicSignalType.GateOpened => SymbolicArchetype.TheGate,
                _ => SymbolicArchetype.TheFragment
            };
        }

        private SymbolicArchetype MapArcanaToArchetype(object payload)
        {
            if (payload is ArcanaEventPayload arcana)
            {
                return arcana.ArcanaId switch
                {
                    0 => SymbolicArchetype.TheFool,
                    1 => SymbolicArchetype.TheMagician,
                    2 => SymbolicArchetype.TheHighPriestess,
                    3 => SymbolicArchetype.TheEmpress,
                    4 => SymbolicArchetype.TheEmperor,
                    5 => SymbolicArchetype.TheHierophant,
                    6 => SymbolicArchetype.TheLovers,
                    7 => SymbolicArchetype.TheChariot,
                    8 => SymbolicArchetype.Strength,
                    9 => SymbolicArchetype.TheHermit,
                    10 => SymbolicArchetype.WheelOfFortune,
                    11 => SymbolicArchetype.Justice,
                    12 => SymbolicArchetype.TheHangedMan,
                    13 => SymbolicArchetype.Death,
                    14 => SymbolicArchetype.Temperance,
                    15 => SymbolicArchetype.TheDevil,
                    16 => SymbolicArchetype.TheTower,
                    17 => SymbolicArchetype.TheStar,
                    18 => SymbolicArchetype.TheMoon,
                    19 => SymbolicArchetype.TheSun,
                    20 => SymbolicArchetype.Judgement,
                    21 => SymbolicArchetype.TheWorld,
                    _ => SymbolicArchetype.TheFragment
                };
            }
            return SymbolicArchetype.TheFragment;
        }

        #endregion

        #region Cache & Export

        private void CacheSymbol(GeneratedSymbol symbol)
        {
            _symbolCache.Enqueue(symbol);

            while (_symbolCache.Count > _maxCachedSymbols)
            {
                _symbolCache.Dequeue();
            }
        }

        private void ExportSymbol(GeneratedSymbol symbol)
        {
            if (string.IsNullOrEmpty(_exportPath)) return;

            string filename = $"{symbol.Archetype}_{symbol.Timestamp:F0}.svg";
            string fullPath = System.IO.Path.Combine(Application.dataPath, "..", _exportPath, filename);

            try
            {
                System.IO.Directory.CreateDirectory(System.IO.Path.GetDirectoryName(fullPath));
                System.IO.File.WriteAllText(fullPath, symbol.SvgContent);

                if (_debugMode)
                {
                    Debug.Log($"[SymbolicForge] Exported: {fullPath}");
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[SymbolicForge] Export failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Get all cached symbols.
        /// </summary>
        public IEnumerable<GeneratedSymbol> GetCachedSymbols()
        {
            return _symbolCache;
        }

        /// <summary>
        /// Clear the symbol cache.
        /// </summary>
        public void ClearCache()
        {
            _symbolCache.Clear();
        }

        #endregion
    }
}

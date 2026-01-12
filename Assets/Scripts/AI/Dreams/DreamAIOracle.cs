using System;
using System.Collections;
using System.Text;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Arcana;

namespace Cristal.CLI.AI.Dreams
{
    /// <summary>
    /// AI Oracle for generating dream content via Ollama/Qwen3.
    /// Generates room names, wall inscriptions, narrative fragments, and symbol descriptions.
    /// Falls back to procedural generation if AI is unavailable.
    /// </summary>
    public class DreamAIOracle : MonoBehaviour
    {
        public static DreamAIOracle Instance { get; private set; }

        [Header("Generation Settings")]
        [SerializeField] private float _requestTimeout = 30f;
        [SerializeField] private int _maxRetries = 2;
        [SerializeField] private bool _useFallbackOnError = true;

        [Header("Prompt Templates")]
        [SerializeField] [TextArea(2, 4)] private string _roomNamePrompt =
            "Generate a short, evocative 2-4 word dream room name. Theme: {theme}. " +
            "Style: cryptic, surreal, poetic. No quotes. Just the name.";

        [SerializeField] [TextArea(2, 4)] private string _inscriptionPrompt =
            "Write a short cryptic wall inscription for a dream sequence. Theme: {theme}. " +
            "Style: prophetic, fragmented, surreal. Max 15 words. No quotes.";

        [SerializeField] [TextArea(2, 4)] private string _narrativePrompt =
            "Write a brief surreal dream message. Theme: {theme}. Emotional tone: {emotion}. " +
            "Style: second person, present tense, dreamlike. Max 25 words. No quotes.";

        [SerializeField] [TextArea(2, 4)] private string _symbolPrompt =
            "Describe a geometric symbol seen in a dream. Theme: {theme}. " +
            "Style: visual, mystical, abstract. Max 20 words. No quotes.";

        // State
        private OllamaClient _ollamaClient;
        private bool _isAvailable;
        private int _pendingRequests;

        // Fallback content pools
        private static readonly string[] FallbackRoomNames = {
            "The Hollow Mirror", "Chamber of Echoes", "Veil of Whispers",
            "The Unspoken Gate", "Corridor of Sighs", "The Dreaming Threshold",
            "Hall of Forgotten Names", "The Spiral Descent", "Vault of Shadows",
            "The Eye's Reflection", "Passage of Lost Hours", "The Silent Archive"
        };

        private static readonly string[] FallbackInscriptions = {
            "the mirror remembers what you forgot",
            "time bends here... or you do",
            "do not wake... not yet",
            "your name was written in dust",
            "the door was always open",
            "nothing ends... it only transforms",
            "you were here before... before what?",
            "the walls breathe your secrets",
            "truth hides in fragments"
        };

        private static readonly string[] FallbackNarratives = {
            "You feel the weight of unseen eyes.",
            "The walls shift when you're not looking.",
            "Something familiar lingers in the air.",
            "A memory surfaces, then dissolves.",
            "The path behind you has changed.",
            "You recognize this place from somewhere.",
            "Time moves differently here.",
            "The silence speaks in riddles."
        };

        public static bool IsAvailable => Instance != null && Instance._isAvailable;
        public int PendingRequests => _pendingRequests;

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            ServiceLocator.RegisterMono(this);
        }

        private void Start()
        {
            // Find OllamaClient
            _ollamaClient = ServiceLocator.TryGet<OllamaClient>();
            if (_ollamaClient == null)
            {
                _ollamaClient = FindFirstObjectByType<OllamaClient>();
            }

            // Check availability
            if (_ollamaClient != null)
            {
                _ollamaClient.CheckConnection(available =>
                {
                    _isAvailable = available;
                    CristalLog.Info("DreamAIOracle", available
                        ? "Ollama connection established"
                        : "Ollama unavailable, using fallbacks");
                });
            }
            else
            {
                _isAvailable = false;
                CristalLog.Warning("DreamAIOracle", "OllamaClient not found, using fallbacks");
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Generate a room name for a dream sequence.
        /// </summary>
        public void GenerateRoomName(DreamContext context, Action<string> onComplete)
        {
            StartCoroutine(GenerateContentCoroutine(
                DreamContentType.RoomName,
                context,
                onComplete
            ));
        }

        /// <summary>
        /// Generate a wall inscription for a dream room.
        /// </summary>
        public void GenerateWallInscription(DreamContext context, Action<string> onComplete)
        {
            StartCoroutine(GenerateContentCoroutine(
                DreamContentType.WallInscription,
                context,
                onComplete
            ));
        }

        /// <summary>
        /// Generate a narrative fragment for dream sequences.
        /// </summary>
        public void GenerateNarrativeFragment(DreamContext context, Action<string> onComplete)
        {
            StartCoroutine(GenerateContentCoroutine(
                DreamContentType.NarrativeFragment,
                context,
                onComplete
            ));
        }

        /// <summary>
        /// Generate a symbol description for dream visuals.
        /// </summary>
        public void GenerateSymbolDescription(DreamContext context, Action<string> onComplete)
        {
            StartCoroutine(GenerateContentCoroutine(
                DreamContentType.Symbol,
                context,
                onComplete
            ));
        }

        /// <summary>
        /// Coroutine-based async generation for use with yield return.
        /// </summary>
        public IEnumerator GenerateContentAsync(
            DreamContentType type,
            DreamContext context,
            Action<string> callback)
        {
            yield return GenerateContentCoroutine(type, context, callback);
        }

        #endregion

        #region Content Generation

        private IEnumerator GenerateContentCoroutine(
            DreamContentType type,
            DreamContext context,
            Action<string> onComplete)
        {
            _pendingRequests++;

            string result = null;
            bool completed = false;

            // Try AI generation if available
            if (_isAvailable && _ollamaClient != null && !_ollamaClient.IsRequestPending)
            {
                string prompt = BuildPrompt(type, context);

                for (int attempt = 0; attempt <= _maxRetries && !completed; attempt++)
                {
                    yield return _ollamaClient.GenerateAsync(
                        prompt,
                        response =>
                        {
                            result = CleanAIResponse(response, type);
                            completed = true;
                        },
                        error =>
                        {
                            CristalLog.Warning("DreamAIOracle", $"AI error (attempt {attempt + 1}): {error}");
                        }
                    );

                    if (!completed && attempt < _maxRetries)
                    {
                        yield return new WaitForSeconds(0.5f);
                    }
                }
            }

            // Use fallback if AI failed or unavailable
            if (!completed || string.IsNullOrEmpty(result))
            {
                if (_useFallbackOnError)
                {
                    result = GenerateFallbackContent(type, context);
                }
            }

            _pendingRequests--;
            onComplete?.Invoke(result ?? "");
        }

        private string BuildPrompt(DreamContentType type, DreamContext context)
        {
            string template = type switch
            {
                DreamContentType.RoomName => _roomNamePrompt,
                DreamContentType.WallInscription => _inscriptionPrompt,
                DreamContentType.NarrativeFragment => _narrativePrompt,
                DreamContentType.Symbol => _symbolPrompt,
                _ => _inscriptionPrompt
            };

            string theme = context.DreamTheme ?? context.Theme ?? "mystery";
            string emotion = GetEmotionFromContext(context);

            // Build arcana context if available
            string arcanaContext = "";
            if (context.ActiveArcana != null)
            {
                arcanaContext = $" Arcana: {context.ActiveArcana.name}.";
            }

            return template
                .Replace("{theme}", theme)
                .Replace("{emotion}", emotion)
                + arcanaContext;
        }

        private string GetEmotionFromContext(DreamContext context)
        {
            if (context.Intensity > 0.7f) return "intense";
            if (context.Intensity > 0.4f) return "contemplative";
            if (context.Intensity < 0.2f) return "melancholic";
            return "mysterious";
        }

        private string CleanAIResponse(string response, DreamContentType type)
        {
            if (string.IsNullOrEmpty(response)) return null;

            // Remove quotes
            response = response.Trim().Trim('"', '\'');

            // Remove common prefixes
            string[] prefixes = { "Here is", "Here's", "The name is", "I suggest" };
            foreach (var prefix in prefixes)
            {
                if (response.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    int colonIndex = response.IndexOf(':');
                    if (colonIndex > 0 && colonIndex < 20)
                    {
                        response = response.Substring(colonIndex + 1).Trim();
                    }
                }
            }

            // Enforce length limits
            int maxWords = type switch
            {
                DreamContentType.RoomName => 5,
                DreamContentType.WallInscription => 15,
                DreamContentType.NarrativeFragment => 30,
                DreamContentType.Symbol => 25,
                _ => 20
            };

            string[] words = response.Split(' ');
            if (words.Length > maxWords)
            {
                response = string.Join(" ", words, 0, maxWords);
            }

            return response.Trim();
        }

        #endregion

        #region Fallback Generation

        private string GenerateFallbackContent(DreamContentType type, DreamContext context)
        {
            return type switch
            {
                DreamContentType.RoomName => GenerateFallbackRoomName(context),
                DreamContentType.WallInscription => GenerateFallbackInscription(context),
                DreamContentType.NarrativeFragment => GenerateFallbackNarrative(context),
                DreamContentType.Symbol => GenerateFallbackSymbol(context),
                _ => GenerateFallbackInscription(context)
            };
        }

        private string GenerateFallbackRoomName(DreamContext context)
        {
            // Use theme to influence selection
            int hash = (context.DreamTheme ?? "").GetHashCode();
            int index = Mathf.Abs(hash) % FallbackRoomNames.Length;
            return FallbackRoomNames[index];
        }

        private string GenerateFallbackInscription(DreamContext context)
        {
            int index = UnityEngine.Random.Range(0, FallbackInscriptions.Length);
            return FallbackInscriptions[index];
        }

        private string GenerateFallbackNarrative(DreamContext context)
        {
            int index = UnityEngine.Random.Range(0, FallbackNarratives.Length);
            return FallbackNarratives[index];
        }

        private string GenerateFallbackSymbol(DreamContext context)
        {
            string[] shapes = { "spiral", "eye", "triangle", "circle", "crescent", "star" };
            string[] qualities = { "pulsing", "fractured", "luminous", "shifting", "ancient" };

            string shape = shapes[UnityEngine.Random.Range(0, shapes.Length)];
            string quality = qualities[UnityEngine.Random.Range(0, qualities.Length)];

            return $"A {quality} {shape} that seems to watch you.";
        }

        #endregion

        #region Utility

        /// <summary>
        /// Check Ollama connection status.
        /// </summary>
        public void RefreshConnectionStatus()
        {
            if (_ollamaClient != null)
            {
                _ollamaClient.CheckConnection(available =>
                {
                    _isAvailable = available;
                });
            }
        }

        /// <summary>
        /// Force fallback mode (for testing).
        /// </summary>
        public void SetForceFallback(bool force)
        {
            _isAvailable = !force;
        }

        #endregion
    }
}

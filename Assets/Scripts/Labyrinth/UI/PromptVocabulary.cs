using System;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Memory;

namespace Cristal.CLI.Labyrinth.UI
{
    public enum PromptSubjectType
    {
        Any = 0,
        Generic = 1,
        Console = 2,
        Door = 3,
        Hologram = 4
    }

    [Serializable]
    public struct PromptVocabularyEntry
    {
        public CristalState state;
        public PromptSubjectType subject;

        [TextArea(2, 5)]
        public string actionText;

        public bool includeKey;
        public string keyText;

        public PromptUrgency urgency;
    }

    /// <summary>
    /// ScriptableObject containing a mapping from (CristalState, SubjectType) to prompt text.
    /// Used by PromptContextResolver.
    /// </summary>
    [CreateAssetMenu(menuName = "CRISTAL/Prompt Vocabulary", fileName = "PromptVocabulary")]
    public class PromptVocabulary : ScriptableObject
    {
        [SerializeField] private List<PromptVocabularyEntry> _entries = new List<PromptVocabularyEntry>();

        private Dictionary<(CristalState, PromptSubjectType), PromptVocabularyEntry> _cache;
        private bool _isCacheBuilt;

        public IReadOnlyList<PromptVocabularyEntry> Entries => _entries;

        private void OnEnable()
        {
            _isCacheBuilt = false;
            _cache = null;
        }

        public bool TryGet(CristalState state, PromptSubjectType subject, out PromptVocabularyEntry entry)
        {
            EnsureCache();
            return _cache.TryGetValue((state, subject), out entry);
        }

        public bool TryResolve(CristalState state, PromptSubjectType subject, out PromptVocabularyEntry entry)
        {
            // Resolution order:
            // 1) (state, subject)
            // 2) (state, Any)
            // 3) (Waiting, subject)
            // 4) (Waiting, Any)
            // 5) (Bootstrap, Any)
            if (TryGet(state, subject, out entry)) return true;
            if (TryGet(state, PromptSubjectType.Any, out entry)) return true;
            if (TryGet(CristalState.Waiting, subject, out entry)) return true;
            if (TryGet(CristalState.Waiting, PromptSubjectType.Any, out entry)) return true;
            if (TryGet(CristalState.Bootstrap, PromptSubjectType.Any, out entry)) return true;

            entry = default;
            return false;
        }

        private void EnsureCache()
        {
            if (_isCacheBuilt && _cache != null) return;

            _cache = new Dictionary<(CristalState, PromptSubjectType), PromptVocabularyEntry>();
            foreach (var entry in _entries)
            {
                _cache[(entry.state, entry.subject)] = entry;
            }

            _isCacheBuilt = true;
        }

        public void SetDefaultsIfEmpty()
        {
            if (_entries.Count > 0) return;

            _entries = new List<PromptVocabularyEntry>
            {
                new PromptVocabularyEntry
                {
                    state = CristalState.Remembering,
                    subject = PromptSubjectType.Console,
                    actionText = "Evoca un recuerdo antiguo",
                    includeKey = true,
                    keyText = "E",
                    urgency = PromptUrgency.Normal
                },
                new PromptVocabularyEntry
                {
                    state = CristalState.Corrupted,
                    subject = PromptSubjectType.Console,
                    actionText = "Riesgo: Consola alterada",
                    includeKey = true,
                    keyText = "E",
                    urgency = PromptUrgency.Warning
                },
                new PromptVocabularyEntry
                {
                    state = CristalState.Echo,
                    subject = PromptSubjectType.Hologram,
                    actionText = "Escucha lo que ya fue",
                    includeKey = true,
                    keyText = "E",
                    urgency = PromptUrgency.Normal
                },
                new PromptVocabularyEntry
                {
                    state = CristalState.Waiting,
                    subject = PromptSubjectType.Door,
                    actionText = "La puerta no responde aún",
                    includeKey = false,
                    keyText = "",
                    urgency = PromptUrgency.Normal
                },
                new PromptVocabularyEntry
                {
                    state = CristalState.Unbound,
                    subject = PromptSubjectType.Any,
                    actionText = "Nada es estable. Toca bajo tu propio riesgo.",
                    includeKey = false,
                    keyText = "",
                    urgency = PromptUrgency.Critical
                },
                new PromptVocabularyEntry
                {
                    state = CristalState.Waiting,
                    subject = PromptSubjectType.Any,
                    actionText = "Interactuar",
                    includeKey = true,
                    keyText = "E",
                    urgency = PromptUrgency.Normal
                }
            };

            _isCacheBuilt = false;
        }
    }
}

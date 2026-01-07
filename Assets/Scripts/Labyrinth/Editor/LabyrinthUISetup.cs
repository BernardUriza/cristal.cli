using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Cristal.CLI.Labyrinth.UI;
using System.IO;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Editor tools for creating Labyrinth UI prefabs and configuration assets.
    /// Follows senior Unity dev best practices:
    /// - Creates both prefab and config ScriptableObject
    /// - Properly wires up serialized fields
    /// - Organizes assets in appropriate folders
    /// </summary>
    public static class LabyrinthUISetup
    {
        private const string PROMPT_PREFAB_PATH = "Assets/Prefabs/UI/FloatingInteractPrompt.prefab";
        private const string PROMPT_CONFIG_PATH = "Assets/Resources/Config/InteractPromptConfig.asset";
        private const string PROMPT_VOCAB_PATH = "Assets/Resources/Config/PromptVocabulary.asset";

        [MenuItem("CRISTAL/Floating Prompt/Create Complete Setup")]
        public static void CreateCompleteSetup()
        {
            // 1. Create config ScriptableObject
            var config = CreatePromptConfig();
            if (config == null)
            {
                Debug.LogError("[LabyrinthUISetup] Failed to create config!");
                return;
            }

            // 2. Create prefab with config wired up
            var prefab = CreatePromptPrefab(config);
            if (prefab == null)
            {
                Debug.LogError("[LabyrinthUISetup] Failed to create prefab!");
                return;
            }

            Debug.Log("[LabyrinthUISetup] ✅ Complete setup created:");
            Debug.Log($"  Config: {PROMPT_CONFIG_PATH}");
            Debug.Log($"  Prefab: {PROMPT_PREFAB_PATH}");

            Selection.activeObject = prefab;
        }

        [MenuItem("CRISTAL/Floating Prompt/Create Config Only")]
        public static void CreateConfigOnly()
        {
            var config = CreatePromptConfig();
            if (config != null)
            {
                Selection.activeObject = config;
                EditorGUIUtility.PingObject(config);
            }
        }

        [MenuItem("CRISTAL/Floating Prompt/Create Vocabulary")]
        public static void CreateVocabulary()
        {
            var vocab = CreatePromptVocabulary();
            if (vocab != null)
            {
                Selection.activeObject = vocab;
                EditorGUIUtility.PingObject(vocab);
            }
        }

        [MenuItem("CRISTAL/Floating Prompt/Create Prefab Only")]
        public static void CreatePrefabOnly()
        {
            // Try to find existing config
            var config = AssetDatabase.LoadAssetAtPath<InteractPromptConfig>(PROMPT_CONFIG_PATH);
            if (config == null)
            {
                config = Resources.Load<InteractPromptConfig>("Config/InteractPromptConfig");
            }

            if (config == null)
            {
                Debug.LogWarning("[LabyrinthUISetup] No config found. Creating prefab without config assignment.");
            }

            var prefab = CreatePromptPrefab(config);
            if (prefab != null)
            {
                Selection.activeObject = prefab;
                EditorGUIUtility.PingObject(prefab);
            }
        }

        private static InteractPromptConfig CreatePromptConfig()
        {
            // Ensure directory exists
            string directory = Path.GetDirectoryName(PROMPT_CONFIG_PATH);
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }

            // Check if already exists
            var existing = AssetDatabase.LoadAssetAtPath<InteractPromptConfig>(PROMPT_CONFIG_PATH);
            if (existing != null)
            {
                Debug.Log($"[LabyrinthUISetup] Config already exists at {PROMPT_CONFIG_PATH}");
                return existing;
            }

            // Create new config with CRISTAL-themed defaults
            var config = ScriptableObject.CreateInstance<InteractPromptConfig>();
            
            AssetDatabase.CreateAsset(config, PROMPT_CONFIG_PATH);
            AssetDatabase.SaveAssets();

            Debug.Log($"[LabyrinthUISetup] Created InteractPromptConfig at {PROMPT_CONFIG_PATH}");
            return config;
        }

        private static PromptVocabulary CreatePromptVocabulary()
        {
            // Ensure directory exists
            string directory = Path.GetDirectoryName(PROMPT_VOCAB_PATH);
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }

            // Check if already exists
            var existing = AssetDatabase.LoadAssetAtPath<PromptVocabulary>(PROMPT_VOCAB_PATH);
            if (existing != null)
            {
                Debug.Log($"[LabyrinthUISetup] PromptVocabulary already exists at {PROMPT_VOCAB_PATH}");
                return existing;
            }

            var vocab = ScriptableObject.CreateInstance<PromptVocabulary>();
            vocab.SetDefaultsIfEmpty();

            AssetDatabase.CreateAsset(vocab, PROMPT_VOCAB_PATH);
            AssetDatabase.SaveAssets();

            Debug.Log($"[LabyrinthUISetup] Created PromptVocabulary at {PROMPT_VOCAB_PATH}");
            return vocab;
        }

        private static GameObject CreatePromptPrefab(InteractPromptConfig config)
        {
            // Ensure directory exists
            string directory = Path.GetDirectoryName(PROMPT_PREFAB_PATH);
            if (!AssetDatabase.IsValidFolder(directory))
            {
                CreateFolderRecursive(directory);
            }

            // Check if already exists
            var existing = AssetDatabase.LoadAssetAtPath<GameObject>(PROMPT_PREFAB_PATH);
            if (existing != null)
            {
                if (!EditorUtility.DisplayDialog(
                    "Prefab Exists",
                    "FloatingInteractPrompt prefab already exists. Replace it?",
                    "Replace", "Cancel"))
                {
                    return existing;
                }
                AssetDatabase.DeleteAsset(PROMPT_PREFAB_PATH);
            }

            // Create hierarchy
            var root = CreatePromptHierarchy(config);

            // Save as prefab
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, PROMPT_PREFAB_PATH);
            
            // Clean up scene instance
            Object.DestroyImmediate(root);

            Debug.Log($"[LabyrinthUISetup] Created prefab at {PROMPT_PREFAB_PATH}");
            return prefab;
        }

        private static GameObject CreatePromptHierarchy(InteractPromptConfig config)
        {
            // Create root object
            var root = new GameObject("FloatingInteractPrompt");

            // Create World Space Canvas
            var canvasGO = new GameObject("Canvas");
            canvasGO.transform.SetParent(root.transform, false);
            
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            canvas.sortingOrder = 100;

            var canvasScaler = canvasGO.AddComponent<CanvasScaler>();
            canvasScaler.dynamicPixelsPerUnit = 100;

            canvasGO.AddComponent<GraphicRaycaster>();

            var canvasGroup = canvasGO.AddComponent<CanvasGroup>();
            canvasGroup.alpha = 0f;

            // Set canvas size
            var canvasRT = canvasGO.GetComponent<RectTransform>();
            canvasRT.sizeDelta = new Vector2(200, 100);
            canvasRT.localScale = new Vector3(0.01f, 0.01f, 0.01f);

            // Create container for animations
            var container = new GameObject("Container");
            container.transform.SetParent(canvasGO.transform, false);
            var containerRT = container.AddComponent<RectTransform>();
            containerRT.sizeDelta = new Vector2(200, 100);

            // Create background circle for key
            var bgGO = new GameObject("KeyBackground");
            bgGO.transform.SetParent(container.transform, false);
            var bgImage = bgGO.AddComponent<Image>();
            bgImage.color = config != null ? config.backgroundColor : new Color(0, 0, 0, 0.7f);
            
            var bgRT = bgGO.GetComponent<RectTransform>();
            bgRT.sizeDelta = new Vector2(60, 60);
            bgRT.anchoredPosition = new Vector2(0, 15);

            // Create glow effect (behind background)
            var glowGO = new GameObject("Glow");
            glowGO.transform.SetParent(bgGO.transform, false);
            glowGO.transform.SetAsFirstSibling();
            var glowImage = glowGO.AddComponent<Image>();
            glowImage.color = config != null 
                ? new Color(config.glowColor.r, config.glowColor.g, config.glowColor.b, 0.3f)
                : new Color(0.4f, 1f, 0.4f, 0.3f);
            
            var glowRT = glowGO.GetComponent<RectTransform>();
            glowRT.sizeDelta = new Vector2(80, 80);
            glowRT.anchoredPosition = Vector2.zero;

            // Create key text (E)
            var keyGO = new GameObject("KeyText");
            keyGO.transform.SetParent(container.transform, false);
            var keyText = keyGO.AddComponent<TextMeshProUGUI>();
            keyText.text = "E";
            keyText.fontSize = 36;
            keyText.fontStyle = FontStyles.Bold;
            keyText.color = config != null ? config.textColor : new Color(0.6f, 1f, 0.6f);
            keyText.alignment = TextAlignmentOptions.Center;
            keyText.enableAutoSizing = false;

            var keyRT = keyGO.GetComponent<RectTransform>();
            keyRT.sizeDelta = new Vector2(60, 60);
            keyRT.anchoredPosition = new Vector2(0, 15);

            // Create action text (below key)
            var actionGO = new GameObject("ActionText");
            actionGO.transform.SetParent(container.transform, false);
            var actionText = actionGO.AddComponent<TextMeshProUGUI>();
            actionText.text = "INTERACT";
            actionText.fontSize = 14;
            actionText.color = new Color(0.8f, 0.8f, 0.8f);
            actionText.alignment = TextAlignmentOptions.Center;
            actionGO.SetActive(false); // Hidden by default

            var actionRT = actionGO.GetComponent<RectTransform>();
            actionRT.sizeDelta = new Vector2(150, 30);
            actionRT.anchoredPosition = new Vector2(0, -25);

            // Add and configure FloatingInteractPrompt component
            var prompt = root.AddComponent<FloatingInteractPrompt>();
            
            // Wire up serialized fields using SerializedObject
            var so = new SerializedObject(prompt);
            so.FindProperty("_config").objectReferenceValue = config;
            so.FindProperty("_canvas").objectReferenceValue = canvas;
            so.FindProperty("_canvasGroup").objectReferenceValue = canvasGroup;
            so.FindProperty("_keyText").objectReferenceValue = keyText;
            so.FindProperty("_actionText").objectReferenceValue = actionText;
            so.FindProperty("_container").objectReferenceValue = containerRT;
            so.ApplyModifiedPropertiesWithoutUndo();

            return root;
        }

        private static void CreateFolderRecursive(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;

            string parent = Path.GetDirectoryName(path);
            if (!AssetDatabase.IsValidFolder(parent))
            {
                CreateFolderRecursive(parent);
            }

            string folderName = Path.GetFileName(path);
            AssetDatabase.CreateFolder(parent, folderName);
        }

        [MenuItem("CRISTAL/Floating Prompt/Setup on Player")]
        public static void SetupPromptOnPlayer()
        {
            // Find player
            var player = Object.FindFirstObjectByType<PlayerInteraction>();
            if (player == null)
            {
                Debug.LogError("[LabyrinthUISetup] PlayerInteraction not found in scene!");
                return;
            }

            // Find or create prompt in scene
            var existingPrompt = Object.FindFirstObjectByType<FloatingInteractPrompt>();
            if (existingPrompt == null)
            {
                // Try to load prefab
                var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PROMPT_PREFAB_PATH);
                if (prefab == null)
                {
                    Debug.LogWarning("[LabyrinthUISetup] Prefab not found. Creating complete setup first...");
                    CreateCompleteSetup();
                    prefab = AssetDatabase.LoadAssetAtPath<GameObject>(PROMPT_PREFAB_PATH);
                }

                if (prefab == null)
                {
                    Debug.LogError("[LabyrinthUISetup] Failed to create or load prefab!");
                    return;
                }

                // Instantiate in scene
                var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
                instance.name = "FloatingInteractPrompt";
                Undo.RegisterCreatedObjectUndo(instance, "Create FloatingInteractPrompt");
                existingPrompt = instance.GetComponent<FloatingInteractPrompt>();
            }

            // Ensure vocabulary exists
            var vocab = AssetDatabase.LoadAssetAtPath<PromptVocabulary>(PROMPT_VOCAB_PATH);
            if (vocab == null)
            {
                vocab = CreatePromptVocabulary();
            }

            // Add / get resolver + controller on player
            var resolver = player.GetComponent<PromptContextResolver>();
            if (resolver == null)
            {
                resolver = Undo.AddComponent<PromptContextResolver>(player.gameObject);
            }

            var controller = player.GetComponent<FloatingPromptController>();
            if (controller == null)
            {
                controller = Undo.AddComponent<FloatingPromptController>(player.gameObject);
            }

            // Wire resolver
            resolver.Vocabulary = vocab;

            // Wire controller fields via SerializedObject (private serialized fields)
            var controllerSO = new SerializedObject(controller);
            controllerSO.FindProperty("_prompt").objectReferenceValue = existingPrompt;
            controllerSO.FindProperty("_resolver").objectReferenceValue = resolver;
            controllerSO.ApplyModifiedPropertiesWithoutUndo();

            // Wire PlayerInteraction references via SerializedObject
            var playerSO = new SerializedObject(player);
            playerSO.FindProperty("_floatingPrompt").objectReferenceValue = existingPrompt;
            playerSO.FindProperty("_promptController").objectReferenceValue = controller;
            playerSO.ApplyModifiedPropertiesWithoutUndo();

            Debug.Log("[LabyrinthUISetup] ✅ Contextual Floating Prompt system set up on Player.");
            Debug.Log("- PlayerInteraction now uses FloatingPromptController for prompts.");
            Debug.Log($"- Vocabulary: {PROMPT_VOCAB_PATH}");

            Selection.activeGameObject = existingPrompt != null ? existingPrompt.gameObject : player.gameObject;
        }
    }
}

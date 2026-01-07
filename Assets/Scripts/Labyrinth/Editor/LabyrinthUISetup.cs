using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Cristal.CLI.Labyrinth.UI;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Editor tools for creating Labyrinth UI prefabs.
    /// </summary>
    public static class LabyrinthUISetup
    {
        [MenuItem("CRISTAL/Create Floating Interact Prompt")]
        public static void CreateFloatingPrompt()
        {
            // Create root object
            var root = new GameObject("FloatingInteractPrompt");
            var prompt = root.AddComponent<FloatingInteractPrompt>();

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
            bgImage.color = new Color(0, 0, 0, 0.7f);
            
            var bgRT = bgGO.GetComponent<RectTransform>();
            bgRT.sizeDelta = new Vector2(60, 60);
            bgRT.anchoredPosition = new Vector2(0, 15);

            // Create key text (E)
            var keyGO = new GameObject("KeyText");
            keyGO.transform.SetParent(container.transform, false);
            var keyText = keyGO.AddComponent<TextMeshProUGUI>();
            keyText.text = "E";
            keyText.fontSize = 36;
            keyText.fontStyle = FontStyles.Bold;
            keyText.color = new Color(0.6f, 1f, 0.6f);
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

            var actionRT = actionGO.GetComponent<RectTransform>();
            actionRT.sizeDelta = new Vector2(150, 30);
            actionRT.anchoredPosition = new Vector2(0, -25);

            // Create glow effect (optional outline)
            var glowGO = new GameObject("Glow");
            glowGO.transform.SetParent(bgGO.transform, false);
            glowGO.transform.SetAsFirstSibling();
            var glowImage = glowGO.AddComponent<Image>();
            glowImage.color = new Color(0.4f, 1f, 0.4f, 0.3f);
            
            var glowRT = glowGO.GetComponent<RectTransform>();
            glowRT.sizeDelta = new Vector2(80, 80);
            glowRT.anchoredPosition = Vector2.zero;

            // Wire up SerializedFields via SerializedObject
            Selection.activeGameObject = root;

            Debug.Log("[LabyrinthUISetup] Created FloatingInteractPrompt. Drag to Prefabs folder to save.");
            Debug.Log("Note: Assign the serialized fields in the inspector after saving as prefab.");

            // Mark scene dirty
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
            );
        }

        [MenuItem("CRISTAL/Setup Floating Prompt on Player")]
        public static void SetupPromptOnPlayer()
        {
            // Find player
            var player = Object.FindFirstObjectByType<PlayerInteraction>();
            if (player == null)
            {
                Debug.LogError("[LabyrinthUISetup] PlayerInteraction not found in scene!");
                return;
            }

            // Check if already has prompt
            var existingPrompt = Object.FindFirstObjectByType<FloatingInteractPrompt>();
            if (existingPrompt != null)
            {
                Debug.Log("[LabyrinthUISetup] FloatingInteractPrompt already exists in scene.");
                Selection.activeGameObject = existingPrompt.gameObject;
                return;
            }

            // Create prompt and add to scene
            CreateFloatingPrompt();

            Debug.Log("[LabyrinthUISetup] FloatingInteractPrompt created. Now wire it up in PlayerInteraction.");
        }
    }
}

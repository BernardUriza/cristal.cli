using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace Cristal.CLI.Terminal.Editor
{
    /// <summary>
    /// Editor menu for setting up the 2D terminal scene.
    /// </summary>
    public static class Terminal2DSetup
    {
        [MenuItem("CRISTAL/Setup 2D Terminal Scene")]
        public static void Setup2DTerminalScene()
        {
            var config = FindFirstVisualConfig();

            // Create or find Canvas
            Canvas canvas = Object.FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                var canvasObj = new GameObject("TerminalCanvas");
                canvas = canvasObj.AddComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                canvasObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                canvasObj.AddComponent<GraphicRaycaster>();
            }

            // Setup EventSystem
            if (Object.FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                var eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                eventSystem.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
            }

            // Create background
            var background = CreateUIElement<Image>("Background", canvas.transform);
            background.color = config != null ? config.backgroundColor : new Color(0.02f, 0.02f, 0.02f, 1f);
            SetFullScreen(background.rectTransform);

            // Create terminal container
            var terminalContainer = CreateUIElement<RectTransform>("TerminalContainer", canvas.transform);
            SetAnchors(terminalContainer, new Vector2(0.05f, 0.05f), new Vector2(0.95f, 0.95f));
            terminalContainer.offsetMin = Vector2.zero;
            terminalContainer.offsetMax = Vector2.zero;

            // Create output area with scroll
            var scrollRect = CreateUIElement<ScrollRect>("OutputScroll", terminalContainer);
            SetAnchors(scrollRect.GetComponent<RectTransform>(), new Vector2(0, 0.1f), Vector2.one);
            scrollRect.GetComponent<RectTransform>().offsetMin = new Vector2(10, 0);
            scrollRect.GetComponent<RectTransform>().offsetMax = new Vector2(-10, -10);
            scrollRect.horizontal = false;
            scrollRect.vertical = true;
            scrollRect.movementType = ScrollRect.MovementType.Clamped;

            // Create content for scroll
            var content = CreateUIElement<RectTransform>("Content", scrollRect.transform);
            content.anchorMin = new Vector2(0, 1);
            content.anchorMax = new Vector2(1, 1);
            content.pivot = new Vector2(0.5f, 1);
            content.sizeDelta = new Vector2(0, 0);
            var contentFitter = content.gameObject.AddComponent<ContentSizeFitter>();
            contentFitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            scrollRect.content = content;

            // Create output text
            var outputText = CreateUIElement<TextMeshProUGUI>("OutputText", content);
            outputText.rectTransform.anchorMin = Vector2.zero;
            outputText.rectTransform.anchorMax = Vector2.one;
            outputText.rectTransform.offsetMin = Vector2.zero;
            outputText.rectTransform.offsetMax = Vector2.zero;
            outputText.alignment = TextAlignmentOptions.TopLeft;
            outputText.fontSize = config != null ? config.fontSize : 18;
            outputText.lineSpacing = config != null ? config.lineSpacing : outputText.lineSpacing;
            outputText.color = config != null ? config.outputColor : new Color(0.6f, 0.9f, 0.6f);
            outputText.richText = true;
            outputText.enableWordWrapping = true;
            if (config != null && config.font != null)
            {
                outputText.font = config.font;
            }

            // Create input area
            var inputContainer = CreateUIElement<RectTransform>("InputContainer", terminalContainer);
            SetAnchors(inputContainer, Vector2.zero, new Vector2(1, 0.1f));
            inputContainer.offsetMin = new Vector2(10, 10);
            inputContainer.offsetMax = new Vector2(-10, 0);

            // Create prompt symbol
            var prompt = CreateUIElement<TextMeshProUGUI>("Prompt", inputContainer);
            prompt.rectTransform.anchorMin = Vector2.zero;
            prompt.rectTransform.anchorMax = new Vector2(0, 1);
            prompt.rectTransform.sizeDelta = new Vector2(30, 0);
            prompt.rectTransform.anchoredPosition = new Vector2(15, 0);
            prompt.text = "> ";
            prompt.fontSize = config != null ? config.fontSize : 18;
            prompt.color = config != null ? config.outputColor : new Color(0.6f, 0.9f, 0.6f);
            prompt.alignment = TextAlignmentOptions.Left;
            if (config != null && config.font != null)
            {
                prompt.font = config.font;
            }

            // Create input field
            var inputFieldGO = new GameObject("InputField");
            inputFieldGO.transform.SetParent(inputContainer, false);
            var inputFieldRT = inputFieldGO.AddComponent<RectTransform>();
            SetAnchors(inputFieldRT, new Vector2(0, 0), new Vector2(1, 1));
            inputFieldRT.offsetMin = new Vector2(30, 0);
            inputFieldRT.offsetMax = Vector2.zero;

            var inputField = inputFieldGO.AddComponent<TMP_InputField>();
            
            // Create text area for input
            var textArea = CreateUIElement<RectTransform>("TextArea", inputFieldRT);
            SetFullScreen(textArea);
            
            var inputText = CreateUIElement<TextMeshProUGUI>("Text", textArea);
            SetFullScreen(inputText.rectTransform);
            inputText.fontSize = config != null ? config.fontSize : 18;
            inputText.lineSpacing = config != null ? config.lineSpacing : inputText.lineSpacing;
            inputText.color = config != null ? config.inputColor : new Color(0.8f, 0.8f, 0.8f);
            inputText.alignment = TextAlignmentOptions.Left;
            if (config != null && config.font != null)
            {
                inputText.font = config.font;
            }

            var placeholder = CreateUIElement<TextMeshProUGUI>("Placeholder", textArea);
            SetFullScreen(placeholder.rectTransform);
            placeholder.fontSize = config != null ? config.fontSize : 18;
            placeholder.color = new Color(0.4f, 0.4f, 0.4f);
            placeholder.alignment = TextAlignmentOptions.Left;
            placeholder.text = "type here...";
            if (config != null && config.font != null)
            {
                placeholder.font = config.font;
            }

            inputField.textViewport = textArea;
            inputField.textComponent = inputText;
            inputField.placeholder = placeholder;
            inputField.caretColor = config != null ? config.cursorColor : new Color(0.6f, 1f, 0.6f);
            inputField.caretWidth = 2;

            // Create cursor blink
            var cursor = CreateUIElement<TextMeshProUGUI>("Cursor", inputContainer);
            cursor.rectTransform.anchorMin = new Vector2(1, 0);
            cursor.rectTransform.anchorMax = new Vector2(1, 1);
            cursor.rectTransform.sizeDelta = new Vector2(15, 0);
            cursor.rectTransform.anchoredPosition = new Vector2(-7.5f, 0);
            cursor.text = "█";
            cursor.fontSize = config != null ? config.fontSize : 18;
            cursor.color = config != null ? config.cursorColor : new Color(0.6f, 1f, 0.6f);
            cursor.alignment = TextAlignmentOptions.Center;
            cursor.gameObject.AddComponent<CursorBlink>();
            if (config != null && config.font != null)
            {
                cursor.font = config.font;
            }

            // Create frame border
            if (config == null || config.showBorder)
            {
                Color borderColor = config != null ? config.borderColor : new Color(0.2f, 0.4f, 0.2f);
                float borderWidth = config != null ? config.borderWidth : 2f;
                CreateBorder(terminalContainer, borderColor, borderWidth);
            }

            // Create scanline overlay
            if (config == null || config.enableScanlines)
            {
                var scanlines = CreateUIElement<RawImage>("Scanlines", canvas.transform);
                SetFullScreen(scanlines.rectTransform);
                scanlines.raycastTarget = false;
                var effect = scanlines.gameObject.AddComponent<UI.ScanlineEffect>();

                if (config != null)
                {
                    effect.SetAlpha(config.scanlineAlpha);
                    effect.SetAnimated(config.scanlineSpeed > 0f, config.scanlineSpeed);
                }
            }

            // Add CrystalCLI controller
            var controller = canvas.gameObject.GetComponent<CrystalCLI>();
            if (controller == null)
            {
                controller = canvas.gameObject.AddComponent<CrystalCLI>();
            }

            // Bind references (so the scene actually works)
            var cliSO = new SerializedObject(controller);
            cliSO.FindProperty("_inputField").objectReferenceValue = inputField;
            cliSO.FindProperty("_outputText").objectReferenceValue = outputText;
            cliSO.FindProperty("_cursorText").objectReferenceValue = cursor;
            cliSO.FindProperty("_scrollRect").objectReferenceValue = scrollRect;
            cliSO.FindProperty("_contentRect").objectReferenceValue = content;
            if (config != null)
            {
                var visualConfigProp = cliSO.FindProperty("_visualConfig");
                if (visualConfigProp != null)
                {
                    visualConfigProp.objectReferenceValue = config;
                }
            }
            cliSO.ApplyModifiedPropertiesWithoutUndo();

            // Log completion
            Debug.Log("[Terminal2DSetup] 2D Terminal scene configured successfully");
            
            // Mark scene dirty
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
            );

            Selection.activeGameObject = canvas.gameObject;
        }

        [MenuItem("CRISTAL/Create Terminal Visual Config")]
        public static void CreateVisualConfig()
        {
            var config = ScriptableObject.CreateInstance<UI.TerminalVisualConfig>();
            
            string path = EditorUtility.SaveFilePanelInProject(
                "Save Terminal Visual Config",
                "TerminalVisualConfig",
                "asset",
                "Save the terminal visual configuration"
            );

            if (!string.IsNullOrEmpty(path))
            {
                AssetDatabase.CreateAsset(config, path);
                AssetDatabase.SaveAssets();
                Selection.activeObject = config;
            }
        }

        private const string DefaultVisualConfigResourcesPath = "Config/DefaultTerminalVisualConfig";

        /// <summary>
        /// Load visual config from Resources first, fallback to any config in the project.
        /// </summary>
        private static UI.TerminalVisualConfig FindFirstVisualConfig()
        {
            // Priority: Resources path (same as other setups)
            var resourcesConfig = Resources.Load<UI.TerminalVisualConfig>(DefaultVisualConfigResourcesPath);
            if (resourcesConfig != null)
            {
                return resourcesConfig;
            }

            // Fallback: any TerminalVisualConfig in the project
            string[] guids = AssetDatabase.FindAssets("t:TerminalVisualConfig");
            if (guids == null || guids.Length == 0) return null;
            string assetPath = AssetDatabase.GUIDToAssetPath(guids[0]);
            if (string.IsNullOrEmpty(assetPath)) return null;
            return AssetDatabase.LoadAssetAtPath<UI.TerminalVisualConfig>(assetPath);
        }

        private static T CreateUIElement<T>(string name, Transform parent) where T : Component
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            
            if (typeof(T) == typeof(RectTransform))
            {
                return go.AddComponent<RectTransform>() as T;
            }
            
            go.AddComponent<RectTransform>();
            return go.AddComponent<T>();
        }

        private static void SetFullScreen(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static void SetAnchors(RectTransform rt, Vector2 min, Vector2 max)
        {
            rt.anchorMin = min;
            rt.anchorMax = max;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static void CreateBorder(RectTransform parent, Color color, float width)
        {
            // Top
            var top = CreateUIElement<Image>("BorderTop", parent);
            top.color = color;
            top.rectTransform.anchorMin = new Vector2(0, 1);
            top.rectTransform.anchorMax = Vector2.one;
            top.rectTransform.pivot = new Vector2(0.5f, 1);
            top.rectTransform.sizeDelta = new Vector2(0, width);

            // Bottom
            var bottom = CreateUIElement<Image>("BorderBottom", parent);
            bottom.color = color;
            bottom.rectTransform.anchorMin = Vector2.zero;
            bottom.rectTransform.anchorMax = new Vector2(1, 0);
            bottom.rectTransform.pivot = new Vector2(0.5f, 0);
            bottom.rectTransform.sizeDelta = new Vector2(0, width);

            // Left
            var left = CreateUIElement<Image>("BorderLeft", parent);
            left.color = color;
            left.rectTransform.anchorMin = Vector2.zero;
            left.rectTransform.anchorMax = new Vector2(0, 1);
            left.rectTransform.pivot = new Vector2(0, 0.5f);
            left.rectTransform.sizeDelta = new Vector2(width, 0);

            // Right
            var right = CreateUIElement<Image>("BorderRight", parent);
            right.color = color;
            right.rectTransform.anchorMin = new Vector2(1, 0);
            right.rectTransform.anchorMax = Vector2.one;
            right.rectTransform.pivot = new Vector2(1, 0.5f);
            right.rectTransform.sizeDelta = new Vector2(width, 0);
        }
    }
}

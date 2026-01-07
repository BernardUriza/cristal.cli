#if UNITY_EDITOR
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using TMPro;
using Cristal.CLI;
using Cristal.CLI.Terminal.UI;

namespace Cristal.CLI.Editor
{
    /// <summary>
    /// Editor utility to setup the terminal scene with all required components.
    /// </summary>
    public class TerminalSceneSetup : EditorWindow
    {
        private const string DefaultVisualConfigResourcesPath = "Config/DefaultTerminalVisualConfig";

        [MenuItem("CRISTAL/Setup Terminal Scene")]
        public static void SetupScene()
        {
            TerminalVisualConfig config = LoadDefaultVisualConfig();
            Debug.Log($"[CRISTAL] Terminal config: {(config != null ? config.name : "none (using defaults)")}");

            // Create Canvas
            GameObject canvasObj = new GameObject("TerminalCanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasObj.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasObj.AddComponent<GraphicRaycaster>();

            // Get canvas scaler and configure
            CanvasScaler scaler = canvasObj.GetComponent<CanvasScaler>();
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;

            // Create background panel (pure black)
            Color bgColor = config != null ? config.backgroundColor : Color.black;
            GameObject bgPanel = CreatePanel(canvasObj.transform, "Background", bgColor);
            RectTransform bgRect = bgPanel.GetComponent<RectTransform>();
            bgRect.anchorMin = Vector2.zero;
            bgRect.anchorMax = Vector2.one;
            bgRect.offsetMin = Vector2.zero;
            bgRect.offsetMax = Vector2.zero;

            // Create main terminal container
            GameObject terminalContainer = new GameObject("TerminalContainer");
            terminalContainer.transform.SetParent(canvasObj.transform, false);
            RectTransform containerRect = terminalContainer.AddComponent<RectTransform>();
            containerRect.anchorMin = new Vector2(0.05f, 0.05f);
            containerRect.anchorMax = new Vector2(0.95f, 0.95f);
            containerRect.offsetMin = Vector2.zero;
            containerRect.offsetMax = Vector2.zero;

            // Create scroll view for output
            GameObject scrollView = new GameObject("OutputScrollView");
            scrollView.transform.SetParent(terminalContainer.transform, false);
            ScrollRect scrollRect = scrollView.AddComponent<ScrollRect>();
            scrollView.AddComponent<Image>().color = new Color(0, 0, 0, 0);

            RectTransform scrollRectTransform = scrollView.GetComponent<RectTransform>();
            scrollRectTransform.anchorMin = new Vector2(0, 0.08f);
            scrollRectTransform.anchorMax = Vector2.one;
            scrollRectTransform.offsetMin = Vector2.zero;
            scrollRectTransform.offsetMax = Vector2.zero;

            // Create viewport
            GameObject viewport = new GameObject("Viewport");
            viewport.transform.SetParent(scrollView.transform, false);
            viewport.AddComponent<RectTransform>();
            viewport.AddComponent<Image>().color = new Color(0, 0, 0, 0);
            viewport.AddComponent<Mask>().showMaskGraphic = false;

            RectTransform viewportRect = viewport.GetComponent<RectTransform>();
            viewportRect.anchorMin = Vector2.zero;
            viewportRect.anchorMax = Vector2.one;
            viewportRect.offsetMin = Vector2.zero;
            viewportRect.offsetMax = Vector2.zero;

            // Create content container
            GameObject content = new GameObject("Content");
            content.transform.SetParent(viewport.transform, false);
            RectTransform contentRect = content.AddComponent<RectTransform>();
            contentRect.anchorMin = new Vector2(0, 1);
            contentRect.anchorMax = new Vector2(1, 1);
            contentRect.pivot = new Vector2(0, 1);
            contentRect.sizeDelta = new Vector2(0, 0);

            ContentSizeFitter fitter = content.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            VerticalLayoutGroup layout = content.AddComponent<VerticalLayoutGroup>();
            layout.childForceExpandWidth = true;
            layout.childForceExpandHeight = false;
            layout.childControlWidth = true;
            layout.childControlHeight = true;
            layout.padding = new RectOffset(20, 20, 20, 20);

            // Configure scroll rect
            scrollRect.viewport = viewportRect;
            scrollRect.content = contentRect;
            scrollRect.horizontal = false;
            scrollRect.vertical = true;
            scrollRect.scrollSensitivity = 30f;

            // Create output text
            GameObject outputTextObj = new GameObject("OutputText");
            outputTextObj.transform.SetParent(content.transform, false);
            TextMeshProUGUI outputText = outputTextObj.AddComponent<TextMeshProUGUI>();
            outputText.text = "";
            outputText.fontSize = config != null ? config.fontSize : 18;
            outputText.lineSpacing = config != null ? config.lineSpacing : outputText.lineSpacing;
            outputText.color = config != null ? config.outputColor : new Color(0.7f, 1f, 0.7f);
            outputText.font = (config != null && config.font != null) ? config.font : TMP_Settings.defaultFontAsset;
            outputText.richText = true;
            outputText.alignment = TextAlignmentOptions.TopLeft;

            RectTransform outputRect = outputTextObj.GetComponent<RectTransform>();
            outputRect.anchorMin = Vector2.zero;
            outputRect.anchorMax = new Vector2(1, 0);
            outputRect.pivot = new Vector2(0.5f, 1);

            // Create input area
            GameObject inputArea = new GameObject("InputArea");
            inputArea.transform.SetParent(terminalContainer.transform, false);
            RectTransform inputAreaRect = inputArea.AddComponent<RectTransform>();
            inputAreaRect.anchorMin = Vector2.zero;
            inputAreaRect.anchorMax = new Vector2(1, 0.08f);
            inputAreaRect.offsetMin = Vector2.zero;
            inputAreaRect.offsetMax = Vector2.zero;

            HorizontalLayoutGroup inputLayout = inputArea.AddComponent<HorizontalLayoutGroup>();
            inputLayout.spacing = 5;
            inputLayout.padding = new RectOffset(20, 20, 5, 5);
            inputLayout.childForceExpandWidth = false;
            inputLayout.childForceExpandHeight = true;
            inputLayout.childControlWidth = true;
            inputLayout.childControlHeight = true;

            // Create prompt symbol
            GameObject promptObj = new GameObject("Prompt");
            promptObj.transform.SetParent(inputArea.transform, false);
            TextMeshProUGUI promptText = promptObj.AddComponent<TextMeshProUGUI>();
            promptText.text = "> ";
            promptText.fontSize = config != null ? config.fontSize : 20;
            promptText.color = config != null ? config.outputColor : new Color(0.5f, 0.8f, 1f);
            if (config != null && config.font != null)
            {
                promptText.font = config.font;
            }
            promptText.alignment = TextAlignmentOptions.Left;

            LayoutElement promptLayout = promptObj.AddComponent<LayoutElement>();
            promptLayout.preferredWidth = 30;

            // Create input field
            GameObject inputFieldObj = new GameObject("InputField");
            inputFieldObj.transform.SetParent(inputArea.transform, false);
            TMP_InputField inputField = inputFieldObj.AddComponent<TMP_InputField>();

            RectTransform inputFieldRect = inputFieldObj.GetComponent<RectTransform>();
            inputFieldRect.anchorMin = Vector2.zero;
            inputFieldRect.anchorMax = Vector2.one;

            LayoutElement inputFieldLayout = inputFieldObj.AddComponent<LayoutElement>();
            inputFieldLayout.flexibleWidth = 1;

            // Input field text area
            GameObject textArea = new GameObject("Text Area");
            textArea.transform.SetParent(inputFieldObj.transform, false);
            RectTransform textAreaRect = textArea.AddComponent<RectTransform>();
            textAreaRect.anchorMin = Vector2.zero;
            textAreaRect.anchorMax = Vector2.one;
            textAreaRect.offsetMin = Vector2.zero;
            textAreaRect.offsetMax = Vector2.zero;

            // Input text
            GameObject inputTextObj = new GameObject("Text");
            inputTextObj.transform.SetParent(textArea.transform, false);
            TextMeshProUGUI inputText = inputTextObj.AddComponent<TextMeshProUGUI>();
            inputText.fontSize = config != null ? config.fontSize : 20;
            inputText.lineSpacing = config != null ? config.lineSpacing : inputText.lineSpacing;
            inputText.color = config != null ? config.inputColor : Color.white;
            if (config != null && config.font != null)
            {
                inputText.font = config.font;
            }
            inputText.alignment = TextAlignmentOptions.Left;

            RectTransform inputTextRect = inputTextObj.GetComponent<RectTransform>();
            inputTextRect.anchorMin = Vector2.zero;
            inputTextRect.anchorMax = Vector2.one;
            inputTextRect.offsetMin = Vector2.zero;
            inputTextRect.offsetMax = Vector2.zero;

            // Configure input field
            inputField.textViewport = textAreaRect;
            inputField.textComponent = inputText;
            inputField.caretColor = config != null ? config.cursorColor : Color.white;
            inputField.caretWidth = 2;
            inputField.customCaretColor = true;

            // Create cursor (separate blinking cursor)
            GameObject cursorObj = new GameObject("Cursor");
            cursorObj.transform.SetParent(inputArea.transform, false);
            TextMeshProUGUI cursorText = cursorObj.AddComponent<TextMeshProUGUI>();
            cursorText.text = "█";
            cursorText.fontSize = config != null ? config.fontSize : 20;
            cursorText.color = config != null ? config.cursorColor : Color.white;
            if (config != null && config.font != null)
            {
                cursorText.font = config.font;
            }
            cursorText.alignment = TextAlignmentOptions.Left;
            CursorBlink cursorBlink = cursorObj.AddComponent<CursorBlink>();
            if (config != null)
            {
                cursorBlink.SetColor(config.cursorColor);
                cursorBlink.SetBlinkRate(config.cursorBlinkRate);
            }

            LayoutElement cursorLayout = cursorObj.AddComponent<LayoutElement>();
            cursorLayout.preferredWidth = 20;

            // Create CrystalCLI controller
            GameObject controllerObj = new GameObject("CrystalCLI");
            controllerObj.transform.SetParent(canvasObj.transform, false);

            CrystalCLI cli = controllerObj.AddComponent<CrystalCLI>();
            TypewriterEffect typewriter = controllerObj.AddComponent<TypewriterEffect>();

            // Use SerializedObject to set private serialized fields
            SerializedObject cliSO = new SerializedObject(cli);
            cliSO.FindProperty("_inputField").objectReferenceValue = inputField;
            cliSO.FindProperty("_outputText").objectReferenceValue = outputText;
            cliSO.FindProperty("_cursorText").objectReferenceValue = cursorText;
            cliSO.FindProperty("_scrollRect").objectReferenceValue = scrollRect;
            cliSO.FindProperty("_contentRect").objectReferenceValue = contentRect;
            if (config != null)
            {
                SerializedProperty configProp = cliSO.FindProperty("_visualConfig");
                if (configProp != null)
                {
                    configProp.objectReferenceValue = config;
                }
            }
            cliSO.ApplyModifiedProperties();

            // Create TerminalCore
            GameObject coreObj = new GameObject("TerminalCore");
            coreObj.AddComponent<TerminalCore>();
            coreObj.AddComponent<CommandMemory>();

            // Select the canvas in hierarchy
            Selection.activeGameObject = canvasObj;

            Debug.Log("[CRISTAL] Terminal scene setup complete!");
            EditorUtility.DisplayDialog("CRISTAL", "Terminal scene has been set up successfully!\n\nPress Play to test.", "OK");
        }

        private static GameObject CreatePanel(Transform parent, string name, Color color)
        {
            GameObject panel = new GameObject(name);
            panel.transform.SetParent(parent, false);
            Image image = panel.AddComponent<Image>();
            image.color = color;
            return panel;
        }

        private static TerminalVisualConfig LoadDefaultVisualConfig()
        {
            return Resources.Load<TerminalVisualConfig>(DefaultVisualConfigResourcesPath);
        }

        [MenuItem("CRISTAL/About")]
        public static void About()
        {
            EditorUtility.DisplayDialog("CRISTAL.CLI",
                "CRISTAL - Interactive Narrative Terminal\n\n" +
                "A conceptual game interface designed to evoke\n" +
                "emotional response through text interaction.\n\n" +
                "Write what you feel, not what you know.",
                "OK");
        }
    }
}
#endif

#if UNITY_EDITOR
using UnityEngine;
using UnityEngine.UI;
using UnityEditor;
using TMPro;
using Cristal.CLI;
using Cristal.CLI.Terminal.UI;

namespace Cristal.CLI.Editor
{
    public class SimpleTerminalSetup : EditorWindow
    {
        private const string DefaultVisualConfigResourcesPath = "Config/DefaultTerminalVisualConfig";

        [MenuItem("CRISTAL/Setup Simple Terminal")]
        public static void SetupSimpleTerminal()
        {
            TerminalVisualConfig config = LoadDefaultVisualConfig();

            // Delete existing terminal objects
            var existingCanvases = GameObject.FindObjectsByType<Canvas>(FindObjectsSortMode.None);
            foreach (var existingCanvas in existingCanvases)
            {
                if (existingCanvas.name.Contains("Terminal"))
                {
                    DestroyImmediate(existingCanvas.gameObject);
                }
            }

            var existingCores = GameObject.FindObjectsByType<TerminalCore>(FindObjectsSortMode.None);
            foreach (var existingCore in existingCores)
            {
                DestroyImmediate(existingCore.gameObject);
            }

            // Create EventSystem if needed
            if (GameObject.FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                var eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                eventSystem.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
            }

            // Create Canvas
            GameObject canvasObj = new GameObject("TerminalCanvas");
            Canvas canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 100;

            CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920, 1080);
            scaler.matchWidthOrHeight = 0.5f;

            canvasObj.AddComponent<GraphicRaycaster>();

            // Black background
            GameObject bg = new GameObject("Background");
            bg.transform.SetParent(canvasObj.transform, false);
            Image bgImage = bg.AddComponent<Image>();
            bgImage.color = config != null ? config.backgroundColor : Color.black;
            RectTransform bgRect = bg.GetComponent<RectTransform>();
            bgRect.anchorMin = Vector2.zero;
            bgRect.anchorMax = Vector2.one;
            bgRect.offsetMin = Vector2.zero;
            bgRect.offsetMax = Vector2.zero;

            // Output Text (simple, no scroll for now)
            GameObject outputObj = new GameObject("OutputText");
            outputObj.transform.SetParent(canvasObj.transform, false);
            TextMeshProUGUI outputText = outputObj.AddComponent<TextMeshProUGUI>();
            outputText.text = "";
            outputText.fontSize = config != null ? config.fontSize : 24;
            outputText.lineSpacing = config != null ? config.lineSpacing : outputText.lineSpacing;
            outputText.color = config != null ? config.outputColor : new Color(0.4f, 1f, 0.4f);
            if (config != null && config.font != null)
            {
                outputText.font = config.font;
            }
            outputText.alignment = TextAlignmentOptions.BottomLeft;
            outputText.enableWordWrapping = true;
            outputText.overflowMode = TextOverflowModes.Truncate;

            RectTransform outputRect = outputObj.GetComponent<RectTransform>();
            outputRect.anchorMin = new Vector2(0.02f, 0.12f);
            outputRect.anchorMax = new Vector2(0.98f, 0.98f);
            outputRect.offsetMin = Vector2.zero;
            outputRect.offsetMax = Vector2.zero;

            // Input area background
            GameObject inputBg = new GameObject("InputBackground");
            inputBg.transform.SetParent(canvasObj.transform, false);
            Image inputBgImage = inputBg.AddComponent<Image>();
            if (config != null)
            {
                inputBgImage.color = new Color(
                    config.backgroundColor.r,
                    config.backgroundColor.g,
                    config.backgroundColor.b,
                    0.8f
                );
            }
            else
            {
                inputBgImage.color = new Color(0.1f, 0.1f, 0.1f, 0.8f);
            }
            RectTransform inputBgRect = inputBg.GetComponent<RectTransform>();
            inputBgRect.anchorMin = new Vector2(0.02f, 0.02f);
            inputBgRect.anchorMax = new Vector2(0.98f, 0.10f);
            inputBgRect.offsetMin = Vector2.zero;
            inputBgRect.offsetMax = Vector2.zero;

            // Prompt text "> "
            GameObject promptObj = new GameObject("Prompt");
            promptObj.transform.SetParent(canvasObj.transform, false);
            TextMeshProUGUI promptText = promptObj.AddComponent<TextMeshProUGUI>();
            promptText.text = "> ";
            promptText.fontSize = config != null ? config.fontSize : 28;
            promptText.color = config != null ? config.outputColor : new Color(0.5f, 0.8f, 1f);
            if (config != null && config.font != null)
            {
                promptText.font = config.font;
            }
            promptText.alignment = TextAlignmentOptions.Left;

            RectTransform promptRect = promptObj.GetComponent<RectTransform>();
            promptRect.anchorMin = new Vector2(0.02f, 0.02f);
            promptRect.anchorMax = new Vector2(0.06f, 0.10f);
            promptRect.offsetMin = Vector2.zero;
            promptRect.offsetMax = Vector2.zero;

            // Create InputField using TMP prefab approach
            GameObject inputFieldObj = new GameObject("InputField");
            inputFieldObj.transform.SetParent(canvasObj.transform, false);

            RectTransform inputFieldRect = inputFieldObj.AddComponent<RectTransform>();
            inputFieldRect.anchorMin = new Vector2(0.06f, 0.02f);
            inputFieldRect.anchorMax = new Vector2(0.98f, 0.10f);
            inputFieldRect.offsetMin = Vector2.zero;
            inputFieldRect.offsetMax = Vector2.zero;

            // Text Area (viewport)
            GameObject textArea = new GameObject("Text Area");
            textArea.transform.SetParent(inputFieldObj.transform, false);
            RectTransform textAreaRect = textArea.AddComponent<RectTransform>();
            textAreaRect.anchorMin = Vector2.zero;
            textAreaRect.anchorMax = Vector2.one;
            textAreaRect.offsetMin = new Vector2(10, 6);
            textAreaRect.offsetMax = new Vector2(-10, -6);
            textArea.AddComponent<RectMask2D>();

            // Placeholder
            GameObject placeholder = new GameObject("Placeholder");
            placeholder.transform.SetParent(textArea.transform, false);
            TextMeshProUGUI placeholderText = placeholder.AddComponent<TextMeshProUGUI>();
            placeholderText.text = "escribe aquí...";
            placeholderText.fontSize = 24;
            placeholderText.fontStyle = FontStyles.Italic;
            placeholderText.color = new Color(0.5f, 0.5f, 0.5f, 0.5f);
            placeholderText.alignment = TextAlignmentOptions.Left;
            placeholderText.enableWordWrapping = false;

            RectTransform placeholderRect = placeholder.GetComponent<RectTransform>();
            placeholderRect.anchorMin = Vector2.zero;
            placeholderRect.anchorMax = Vector2.one;
            placeholderRect.offsetMin = Vector2.zero;
            placeholderRect.offsetMax = Vector2.zero;

            // Input Text
            GameObject inputTextObj = new GameObject("Text");
            inputTextObj.transform.SetParent(textArea.transform, false);
            TextMeshProUGUI inputText = inputTextObj.AddComponent<TextMeshProUGUI>();
            inputText.text = "";
            inputText.fontSize = config != null ? config.fontSize : 24;
            inputText.lineSpacing = config != null ? config.lineSpacing : inputText.lineSpacing;
            inputText.color = config != null ? config.inputColor : Color.white;
            if (config != null && config.font != null)
            {
                inputText.font = config.font;
            }
            inputText.alignment = TextAlignmentOptions.Left;
            inputText.enableWordWrapping = false;

            RectTransform inputTextRect = inputTextObj.GetComponent<RectTransform>();
            inputTextRect.anchorMin = Vector2.zero;
            inputTextRect.anchorMax = Vector2.one;
            inputTextRect.offsetMin = Vector2.zero;
            inputTextRect.offsetMax = Vector2.zero;

            // Configure TMP_InputField
            TMP_InputField inputField = inputFieldObj.AddComponent<TMP_InputField>();
            inputField.textViewport = textAreaRect;
            inputField.textComponent = inputText;
            inputField.placeholder = placeholderText;
            inputField.fontAsset = inputText.font;
            inputField.pointSize = 24;
            inputField.caretColor = config != null ? config.cursorColor : Color.white;
            inputField.customCaretColor = true;
            inputField.caretWidth = 2;
            inputField.selectionColor = new Color(0.3f, 0.5f, 0.8f, 0.5f);

            // Cursor blink
            GameObject cursorObj = new GameObject("Cursor");
            cursorObj.transform.SetParent(canvasObj.transform, false);
            TextMeshProUGUI cursorText = cursorObj.AddComponent<TextMeshProUGUI>();
            cursorText.text = "█";
            cursorText.fontSize = config != null ? config.fontSize : 28;
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

            RectTransform cursorRect = cursorObj.GetComponent<RectTransform>();
            cursorRect.anchorMin = new Vector2(0.96f, 0.02f);
            cursorRect.anchorMax = new Vector2(0.98f, 0.10f);
            cursorRect.offsetMin = Vector2.zero;
            cursorRect.offsetMax = Vector2.zero;

            // Add CrystalCLI to canvas
            CrystalCLI cli = canvasObj.AddComponent<CrystalCLI>();
            TypewriterEffect typewriter = canvasObj.AddComponent<TypewriterEffect>();

            // Set references via SerializedObject
            SerializedObject cliSO = new SerializedObject(cli);
            cliSO.FindProperty("_inputField").objectReferenceValue = inputField;
            cliSO.FindProperty("_outputText").objectReferenceValue = outputText;
            cliSO.FindProperty("_cursorText").objectReferenceValue = cursorText;
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
            TerminalCore core = coreObj.AddComponent<TerminalCore>();
            coreObj.AddComponent<CommandMemory>();

            // Mark scene dirty
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());

            Selection.activeGameObject = canvasObj;
            Debug.Log("[CRISTAL] Simple Terminal setup complete!");
        }

        private static TerminalVisualConfig LoadDefaultVisualConfig()
        {
            return Resources.Load<TerminalVisualConfig>(DefaultVisualConfigResourcesPath);
        }
    }
}
#endif

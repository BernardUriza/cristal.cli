#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class TerminalMaterialCreator
    {
        [MenuItem("CRISTAL/Fix Terminal Materials")]
        public static void CreateTerminalMaterials()
        {
            string materialsPath = "Assets/Materials/Terminal";

            // Ensure folder exists
            if (!AssetDatabase.IsValidFolder("Assets/Materials"))
            {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }
            if (!AssetDatabase.IsValidFolder(materialsPath))
            {
                AssetDatabase.CreateFolder("Assets/Materials", "Terminal");
            }

            // Create Console Body Material (dark metal)
            Material consoleBody = CreateURPMaterial("TerminalBody", new Color(0.15f, 0.15f, 0.15f), 0.8f, 0.5f);
            AssetDatabase.CreateAsset(consoleBody, $"{materialsPath}/TerminalBody.mat");

            // Create Screen Material (cyan glow)
            Material screen = CreateURPMaterial("TerminalScreen", new Color(0.0f, 0.8f, 0.9f), 0.0f, 0.0f);
            screen.SetColor("_EmissionColor", new Color(0.0f, 1.5f, 1.8f)); // Bright cyan emission
            screen.EnableKeyword("_EMISSION");
            AssetDatabase.CreateAsset(screen, $"{materialsPath}/TerminalScreen.mat");

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // Apply materials to TerminalConsole prefab
            ApplyMaterialsToPrefab();

            Debug.Log("[TerminalMaterialCreator] Terminal materials created and applied!");
            EditorUtility.DisplayDialog("Materials Created",
                "Terminal materials created and applied to TerminalConsole prefab.",
                "OK");
        }

        private static Material CreateURPMaterial(string name, Color baseColor, float metallic, float smoothness)
        {
            // Find URP Lit shader
            Shader urpLit = Shader.Find("Universal Render Pipeline/Lit");
            if (urpLit == null)
            {
                Debug.LogError("URP Lit shader not found!");
                return null;
            }

            Material mat = new Material(urpLit);
            mat.name = name;
            mat.SetColor("_BaseColor", baseColor);
            mat.SetFloat("_Metallic", metallic);
            mat.SetFloat("_Smoothness", smoothness);

            return mat;
        }

        private static void ApplyMaterialsToPrefab()
        {
            string prefabPath = "Assets/Prefabs/Labyrinth/Console/TerminalConsole.prefab";
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);

            if (prefab == null)
            {
                Debug.LogWarning("TerminalConsole prefab not found");
                return;
            }

            // Load materials
            Material bodyMat = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/Terminal/TerminalBody.mat");
            Material screenMat = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/Terminal/TerminalScreen.mat");

            // Instantiate prefab to modify
            GameObject instance = PrefabUtility.InstantiatePrefab(prefab) as GameObject;

            // Find renderers
            Transform consoleBody = instance.transform.Find("ConsoleBody");
            Transform screen = instance.transform.Find("Screen");

            if (consoleBody != null)
            {
                var renderer = consoleBody.GetComponent<MeshRenderer>();
                if (renderer != null && bodyMat != null)
                {
                    renderer.sharedMaterial = bodyMat;
                }
            }

            if (screen != null)
            {
                var renderer = screen.GetComponent<MeshRenderer>();
                if (renderer != null && screenMat != null)
                {
                    renderer.sharedMaterial = screenMat;
                }
            }

            // Apply changes back to prefab
            PrefabUtility.SaveAsPrefabAssetAndConnect(instance, prefabPath, InteractionMode.AutomatedAction);
            Object.DestroyImmediate(instance);

            Debug.Log("[TerminalMaterialCreator] Materials applied to prefab");
        }
    }
}
#endif

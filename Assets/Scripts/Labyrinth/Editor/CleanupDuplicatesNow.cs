using UnityEngine;
using UnityEditor;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class CleanupDuplicatesNow
    {
        [MenuItem("CRISTAL/Cleanup Duplicates Now", priority = 101)]
        public static void Execute()
        {
            Debug.Log("[CleanupDuplicates] Starting cleanup...");
            int removed = 0;

            // Remove duplicate RitualOperators (keep first)
            var ritualOps = Object.FindObjectsOfType<RitualOperator>();
            if (ritualOps.Length > 1)
            {
                Debug.Log($"[CleanupDuplicates] Found {ritualOps.Length} RitualOperators, removing duplicates...");
                for (int i = 1; i < ritualOps.Length; i++)
                {
                    Debug.Log($"[CleanupDuplicates] Destroying: {ritualOps[i].gameObject.name} (ID: {ritualOps[i].GetInstanceID()})");
                    Object.DestroyImmediate(ritualOps[i].gameObject);
                    removed++;
                }
            }

            // Remove duplicate TerminalConsoles (keep first)
            var consoles = Object.FindObjectsOfType<InWorldConsole>();
            if (consoles.Length > 1)
            {
                Debug.Log($"[CleanupDuplicates] Found {consoles.Length} TerminalConsoles, removing duplicates...");
                for (int i = 1; i < consoles.Length; i++)
                {
                    Debug.Log($"[CleanupDuplicates] Destroying: {consoles[i].gameObject.name} (ID: {consoles[i].GetInstanceID()})");
                    Object.DestroyImmediate(consoles[i].gameObject);
                    removed++;
                }
            }

            // Remove placeholder Floors (all of them - runtime will generate proper room)
            var rootObjects = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects();
            foreach (var obj in rootObjects)
            {
                if (obj.name == "Floor" && obj.GetComponent<MeshRenderer>() != null)
                {
                    Debug.Log($"[CleanupDuplicates] Destroying placeholder floor: {obj.name}");
                    Object.DestroyImmediate(obj);
                    removed++;
                }
            }

            // Remove duplicate Directional Lights (keep one without "(1)")
            var allLights = Object.FindObjectsOfType<Light>();
            var directionalLights = new System.Collections.Generic.List<Light>();
            foreach (var light in allLights)
            {
                if (light.type == LightType.Directional)
                {
                    directionalLights.Add(light);
                }
            }

            if (directionalLights.Count > 1)
            {
                Debug.Log($"[CleanupDuplicates] Found {directionalLights.Count} Directional Lights, removing duplicates...");
                foreach (var light in directionalLights)
                {
                    if (light.gameObject.name.Contains("(1)"))
                    {
                        Debug.Log($"[CleanupDuplicates] Destroying duplicate light: {light.gameObject.name}");
                        Object.DestroyImmediate(light.gameObject);
                        removed++;
                    }
                }
            }

            // Disable Main Camera (replaced by PlayerCamera)
            var mainCamera = GameObject.Find("Main Camera");
            if (mainCamera != null && mainCamera.activeSelf)
            {
                Debug.Log("[CleanupDuplicates] Disabling Main Camera (replaced by PlayerCamera)");
                mainCamera.SetActive(false);
            }

            Debug.Log($"[CleanupDuplicates] ✓ Cleanup complete. Removed {removed} duplicate objects.");

            EditorSceneManager.MarkSceneDirty(UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene());
            EditorSceneManager.SaveOpenScenes();

            EditorUtility.DisplayDialog("Cleanup Complete", $"Removed {removed} duplicate objects.\nMain Camera disabled.\nScene saved.", "OK");
        }
    }
}

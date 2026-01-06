#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;

public static class PlayModeController
{
    [MenuItem("CRISTAL/Stop Play Mode")]
    public static void StopPlayMode()
    {
        if (EditorApplication.isPlaying)
        {
            EditorApplication.isPlaying = false;
            Debug.Log("[CRISTAL] Play Mode stopped.");
        }
        else
        {
            Debug.Log("[CRISTAL] Not in Play Mode.");
        }
    }

    [MenuItem("CRISTAL/Start Play Mode")]
    public static void StartPlayMode()
    {
        if (!EditorApplication.isPlaying)
        {
            EditorApplication.isPlaying = true;
            Debug.Log("[CRISTAL] Play Mode started.");
        }
    }

    [MenuItem("CRISTAL/Import TMP Now")]
    public static void ImportTMPNow()
    {
        if (EditorApplication.isPlaying)
        {
            EditorApplication.isPlaying = false;
            EditorApplication.delayCall += DoImportTMP;
        }
        else
        {
            DoImportTMP();
        }
    }

    static void DoImportTMP()
    {
        string packagePath = "Assets/TMP_Resources.unitypackage";
        if (System.IO.File.Exists(packagePath))
        {
            Debug.Log("[CRISTAL] Importing TMP Essential Resources...");
            AssetDatabase.ImportPackage(packagePath, false);
            EditorApplication.delayCall += () => {
                AssetDatabase.DeleteAsset(packagePath);
                Debug.Log("[CRISTAL] TMP imported successfully!");
            };
        }
        else
        {
            // Try standard TMP import
            string[] paths = new string[]
            {
                "Packages/com.unity.ugui/Package Resources/TMP Essential Resources.unitypackage",
                "Library/PackageCache/com.unity.ugui@52e65280e89e/Package Resources/TMP Essential Resources.unitypackage"
            };

            foreach (var path in paths)
            {
                if (System.IO.File.Exists(path))
                {
                    Debug.Log($"[CRISTAL] Importing from: {path}");
                    AssetDatabase.ImportPackage(path, false);
                    Debug.Log("[CRISTAL] TMP imported successfully!");
                    return;
                }
            }
            Debug.LogWarning("[CRISTAL] TMP package not found.");
        }
    }
}
#endif

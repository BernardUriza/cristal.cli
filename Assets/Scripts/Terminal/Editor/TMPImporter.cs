#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

namespace Cristal.CLI.Editor
{
    [InitializeOnLoad]
    public static class TMPImporter
    {
        static TMPImporter()
        {
            EditorApplication.delayCall += ImportTMPResources;
        }

        [MenuItem("CRISTAL/Import TMP Resources")]
        public static void ImportTMPResources()
        {
            // Check if TMP resources already exist
            string tmpSettingsPath = "Assets/TextMesh Pro/Resources/TMP Settings.asset";
            if (File.Exists(tmpSettingsPath))
            {
                Debug.Log("[CRISTAL] TMP Resources already imported.");
                return;
            }

            // Find the TMP package
            string[] packagePaths = new string[]
            {
                "Packages/com.unity.textmeshpro/Package Resources/TMP Essential Resources.unitypackage",
                "Packages/com.unity.ugui/Package Resources/TMP Essential Resources.unitypackage",
                "Library/PackageCache/com.unity.ugui@52e65280e89e/Package Resources/TMP Essential Resources.unitypackage"
            };

            foreach (string packagePath in packagePaths)
            {
                if (File.Exists(packagePath))
                {
                    Debug.Log($"[CRISTAL] Importing TMP Resources from: {packagePath}");
                    AssetDatabase.ImportPackage(packagePath, false); // false = don't show dialog
                    Debug.Log("[CRISTAL] TMP Resources imported successfully!");
                    return;
                }
            }

            Debug.LogWarning("[CRISTAL] Could not find TMP Essential Resources package.");
        }
    }
}
#endif

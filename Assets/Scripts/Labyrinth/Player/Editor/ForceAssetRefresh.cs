#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class ForceAssetRefresh
    {
        [MenuItem("CRISTAL/Player/Force Asset Refresh")]
        public static void RefreshAssets()
        {
            Debug.Log("[ForceRefresh] Starting AssetDatabase refresh...");
            AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate);
            Debug.Log("[ForceRefresh] Asset refresh complete!");
        }
    }
}
#endif

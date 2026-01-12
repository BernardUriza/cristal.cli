#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Automatically configures Mixamo FBX files as Humanoid when imported to Animation/Player folder.
    /// Sets up proper import settings for locomotion animations.
    /// </summary>
    public class MixamoImportProcessor : AssetPostprocessor
    {
        private const string MIXAMO_FOLDER = "Assets/Animation/Player";

        // Animation names that should loop
        private static readonly string[] LoopingAnimations = {
            "idle", "walking", "running", "walk", "run", "locomotion", "breathing"
        };

        // Animation names that should NOT loop
        private static readonly string[] OneShotAnimations = {
            "jump", "land", "landing", "fall", "falling"
        };

        private void OnPreprocessModel()
        {
            // Only process FBX files in the Animation/Player folder
            if (!assetPath.StartsWith(MIXAMO_FOLDER))
                return;

            if (!assetPath.EndsWith(".fbx", System.StringComparison.OrdinalIgnoreCase))
                return;

            ModelImporter importer = assetImporter as ModelImporter;
            if (importer == null)
                return;

            Debug.Log($"[MixamoImport] Processing: {assetPath}");

            // Configure as Humanoid rig
            importer.animationType = ModelImporterAnimationType.Human;
            importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;

            // General settings
            importer.importAnimation = true;
            importer.importBlendShapes = false;
            importer.importVisibility = false;
            importer.importCameras = false;
            importer.importLights = false;

            // Mesh settings (no mesh needed for animation-only files)
            string fileName = System.IO.Path.GetFileNameWithoutExtension(assetPath).ToLower();
            bool isCharacterModel = fileName.Contains("ybot") || fileName.Contains("y bot") || fileName.Contains("character");

            if (!isCharacterModel)
            {
                // Animation-only file: disable mesh import
                importer.meshCompression = ModelImporterMeshCompression.Off;
            }

            // Animation settings
            importer.animationCompression = ModelImporterAnimationCompression.Optimal;

            Debug.Log($"[MixamoImport] Configured as Humanoid: {assetPath}");
        }

        private void OnPostprocessModel(GameObject g)
        {
            if (!assetPath.StartsWith(MIXAMO_FOLDER))
                return;

            if (!assetPath.EndsWith(".fbx", System.StringComparison.OrdinalIgnoreCase))
                return;

            ModelImporter importer = assetImporter as ModelImporter;
            if (importer == null)
                return;

            // Get animation clips
            var clips = importer.clipAnimations;
            if (clips == null || clips.Length == 0)
            {
                clips = importer.defaultClipAnimations;
            }

            if (clips == null || clips.Length == 0)
            {
                Debug.Log($"[MixamoImport] No animation clips found in: {assetPath}");
                return;
            }

            string fileName = System.IO.Path.GetFileNameWithoutExtension(assetPath).ToLower();
            bool modified = false;

            foreach (var clip in clips)
            {
                // Determine if this should loop
                bool shouldLoop = ShouldLoop(fileName, clip.name);

                if (clip.loopTime != shouldLoop)
                {
                    clip.loopTime = shouldLoop;
                    clip.loopPose = shouldLoop;
                    modified = true;
                }

                // Configure root motion (disable for Mixamo)
                clip.lockRootRotation = true;
                clip.lockRootHeightY = true;
                clip.lockRootPositionXZ = true;
            }

            if (modified)
            {
                importer.clipAnimations = clips;
                Debug.Log($"[MixamoImport] Configured loop settings for: {assetPath}");
            }
        }

        private bool ShouldLoop(string fileName, string clipName)
        {
            string combined = (fileName + " " + clipName).ToLower();

            // Check one-shot animations first
            foreach (var name in OneShotAnimations)
            {
                if (combined.Contains(name))
                    return false;
            }

            // Check looping animations
            foreach (var name in LoopingAnimations)
            {
                if (combined.Contains(name))
                    return true;
            }

            // Default to looping
            return true;
        }

        [MenuItem("CRISTAL/Player/Reimport Mixamo Animations")]
        public static void ReimportMixamoAnimations()
        {
            string[] guids = AssetDatabase.FindAssets("t:Model", new[] { MIXAMO_FOLDER });

            if (guids.Length == 0)
            {
                EditorUtility.DisplayDialog("No FBX Files",
                    $"No FBX files found in {MIXAMO_FOLDER}.\n\nDownload animations from Mixamo and place them in this folder.",
                    "OK");
                return;
            }

            int count = 0;
            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (path.EndsWith(".fbx", System.StringComparison.OrdinalIgnoreCase))
                {
                    AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate);
                    count++;
                }
            }

            Debug.Log($"[MixamoImport] Reimported {count} FBX files");
            EditorUtility.DisplayDialog("Reimport Complete",
                $"Reimported {count} Mixamo animations.\n\nAll files configured as Humanoid with appropriate loop settings.",
                "OK");
        }
    }
}
#endif

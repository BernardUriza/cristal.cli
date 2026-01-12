#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

namespace Cristal.CLI.Labyrinth.Player.Editor
{
    /// <summary>
    /// Processes avatar FBX files to configure them as Humanoid
    /// and regenerates prefabs with proper Animator setup.
    /// </summary>
    public static class AvatarFBXProcessor
    {
        private const string MODELS_PATH = "Assets/Models/Characters";
        private const string PREFABS_PATH = "Assets/Prefabs/Labyrinth/Player/Avatars";
        private const string CONTROLLER_GUID = "2f69b44073497fd439e6cfdee969e920"; // RitualOperatorController

        [MenuItem("CRISTAL/Player/Configure Avatar FBX Files")]
        public static void ConfigureAvatarFBX()
        {
            // Find all character FBX files
            string[] characterFBX = {
                "Demon T Wiezzorek.fbx",
                "Mutant.fbx",
                "Prisoner B Styperek.fbx",
                "Skeletonzombie T Avelange.fbx",
                "Vampire A Lusth.fbx",
                "Zombiegirl W Kurniawan.fbx"
            };

            int configured = 0;
            foreach (string fbxName in characterFBX)
            {
                string fbxPath = Path.Combine(MODELS_PATH, fbxName);
                if (File.Exists(fbxPath))
                {
                    if (ConfigureFBXAsHumanoid(fbxPath))
                        configured++;
                }
                else
                {
                    Debug.LogWarning($"[AvatarFBX] FBX not found: {fbxPath}");
                }
            }

            AssetDatabase.Refresh();
            Debug.Log($"[AvatarFBX] Configured {configured} FBX files as Humanoid");

            EditorUtility.DisplayDialog("FBX Configuration Complete",
                $"Configured {configured} avatar FBX files as Humanoid.\n\nNow run 'Regenerate Avatar Prefabs' to update prefabs.",
                "OK");
        }

        [MenuItem("CRISTAL/Player/Regenerate Avatar Prefabs")]
        public static void RegenerateAvatarPrefabs()
        {
            var controller = AssetDatabase.LoadAssetAtPath<RuntimeAnimatorController>(
                AssetDatabase.GUIDToAssetPath(CONTROLLER_GUID)
            );

            if (controller == null)
            {
                EditorUtility.DisplayDialog("Controller Not Found",
                    "Could not find RitualOperatorController. Run the configuration first.",
                    "OK");
                return;
            }

            // Avatar ID to FBX mapping
            var avatarMappings = new System.Collections.Generic.Dictionary<string, string>
            {
                { "vampire_lusth", "Vampire A Lusth.fbx" },
                { "demon_wiezzorek", "Demon T Wiezzorek.fbx" },
                { "skeletonzombie", "Skeletonzombie T Avelange.fbx" },
                { "zombiegirl", "Zombiegirl W Kurniawan.fbx" },
                { "prisoner", "Prisoner B Styperek.fbx" },
                { "mutant", "Mutant.fbx" }
            };

            int regenerated = 0;
            foreach (var mapping in avatarMappings)
            {
                string avatarId = mapping.Key;
                string fbxName = mapping.Value;
                string fbxPath = Path.Combine(MODELS_PATH, fbxName);
                string prefabPath = Path.Combine(PREFABS_PATH, $"{avatarId}.prefab");

                if (RegeneratePrefab(fbxPath, prefabPath, controller))
                    regenerated++;
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[AvatarFBX] Regenerated {regenerated} avatar prefabs");
            EditorUtility.DisplayDialog("Prefab Regeneration Complete",
                $"Regenerated {regenerated} avatar prefabs with proper Animator setup.\n\nReady for testing!",
                "OK");
        }

        private static bool ConfigureFBXAsHumanoid(string fbxPath)
        {
            ModelImporter importer = AssetImporter.GetAtPath(fbxPath) as ModelImporter;
            if (importer == null)
            {
                Debug.LogError($"[AvatarFBX] Could not get ModelImporter for: {fbxPath}");
                return false;
            }

            bool modified = false;

            // Configure as Humanoid
            if (importer.animationType != ModelImporterAnimationType.Human)
            {
                importer.animationType = ModelImporterAnimationType.Human;
                modified = true;
            }

            if (importer.avatarSetup != ModelImporterAvatarSetup.CreateFromThisModel)
            {
                importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                modified = true;
            }

            // Import settings
            importer.importBlendShapes = true;
            importer.importVisibility = false;
            importer.importCameras = false;
            importer.importLights = false;
            importer.importAnimation = true;

            // Mesh compression
            importer.meshCompression = ModelImporterMeshCompression.Medium;

            // Scale
            importer.globalScale = 1f;
            importer.useFileScale = true;

            if (modified)
            {
                importer.SaveAndReimport();
                Debug.Log($"[AvatarFBX] Configured: {fbxPath}");
            }

            return true;
        }

        private static bool RegeneratePrefab(string fbxPath, string prefabPath, RuntimeAnimatorController controller)
        {
            // Load FBX
            GameObject fbxModel = AssetDatabase.LoadAssetAtPath<GameObject>(fbxPath);
            if (fbxModel == null)
            {
                Debug.LogError($"[AvatarFBX] Could not load FBX: {fbxPath}");
                return false;
            }

            // Get or load Avatar from FBX
            ModelImporter importer = AssetImporter.GetAtPath(fbxPath) as ModelImporter;
            Avatar avatar = null;
            if (importer != null)
            {
                // Avatar is a sub-asset of the FBX
                var assets = AssetDatabase.LoadAllAssetsAtPath(fbxPath);
                foreach (var asset in assets)
                {
                    if (asset is Avatar av && av.isHuman)
                    {
                        avatar = av;
                        break;
                    }
                }
            }

            // Instantiate FBX for prefab creation
            GameObject instance = Object.Instantiate(fbxModel);
            instance.name = Path.GetFileNameWithoutExtension(fbxPath);

            // Add or configure Animator
            Animator animator = instance.GetComponent<Animator>();
            if (animator == null)
            {
                animator = instance.AddComponent<Animator>();
            }

            animator.runtimeAnimatorController = controller;
            animator.avatar = avatar;
            animator.applyRootMotion = false;
            animator.updateMode = AnimatorUpdateMode.Normal;
            animator.cullingMode = AnimatorCullingMode.CullUpdateTransforms;

            // Save as prefab
            bool isNewPrefab = !File.Exists(prefabPath);
            GameObject prefab;

            if (isNewPrefab)
            {
                prefab = PrefabUtility.SaveAsPrefabAsset(instance, prefabPath);
            }
            else
            {
                prefab = PrefabUtility.SaveAsPrefabAssetAndConnect(instance, prefabPath, InteractionMode.AutomatedAction);
            }

            Object.DestroyImmediate(instance);

            if (prefab != null)
            {
                Debug.Log($"[AvatarFBX] {(isNewPrefab ? "Created" : "Updated")} prefab: {prefabPath}");
                return true;
            }

            return false;
        }

        [MenuItem("CRISTAL/Player/Full Avatar Setup")]
        public static void FullAvatarSetup()
        {
            if (!EditorUtility.DisplayDialog("Full Avatar Setup",
                "This will:\n" +
                "1. Configure all FBX files as Humanoid\n" +
                "2. Regenerate all avatar prefabs\n" +
                "3. Configure RitualOperator prefab\n\n" +
                "Continue?",
                "Yes", "Cancel"))
            {
                return;
            }

            ConfigureAvatarFBX();
            RegenerateAvatarPrefabs();

            Debug.Log("[AvatarFBX] Full avatar setup complete!");
            EditorUtility.DisplayDialog("Setup Complete",
                "Avatar system fully configured!\n\nEnter Play Mode to test avatar switching.",
                "OK");
        }
    }
}
#endif

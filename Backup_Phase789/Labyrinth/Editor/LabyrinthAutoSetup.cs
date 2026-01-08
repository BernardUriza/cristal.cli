#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Auto-setup that runs when the Labyrinth scene is opened.
    /// No clicks. No excuses. Just works.
    /// </summary>
    [InitializeOnLoad]
    public static class LabyrinthAutoSetup
    {
        private const string LABYRINTH_SCENE_NAME = "Labyrinth";
        private const string AUTO_SETUP_KEY = "Cristal_LabyrinthAutoSetup_Done";

        static LabyrinthAutoSetup()
        {
            // Subscribe to scene opened event
            EditorSceneManager.sceneOpened += OnSceneOpened;
            
            // Also check on editor update for first load
            EditorApplication.delayCall += CheckCurrentScene;
        }

        private static void OnSceneOpened(Scene scene, OpenSceneMode mode)
        {
            if (scene.name == LABYRINTH_SCENE_NAME)
            {
                // Small delay to let Unity finish loading
                EditorApplication.delayCall += () => AutoSetupScene(scene);
            }
        }

        private static void CheckCurrentScene()
        {
            var scene = SceneManager.GetActiveScene();
            if (scene.name == LABYRINTH_SCENE_NAME)
            {
                // Check if we already ran setup this session
                string sessionKey = $"{AUTO_SETUP_KEY}_{scene.GetHashCode()}";
                if (!SessionState.GetBool(sessionKey, false))
                {
                    AutoSetupScene(scene);
                    SessionState.SetBool(sessionKey, true);
                }
            }
        }

        private static void AutoSetupScene(Scene scene)
        {
            Debug.Log($"[LabyrinthAutoSetup] Auto-configuring scene: {scene.name}");

            bool madeChanges = false;

            // 1. Check for LabyrinthBootstrap
            var bootstrap = Object.FindFirstObjectByType<LabyrinthBootstrap>();
            if (bootstrap == null)
            {
                CreateBootstrap();
                madeChanges = true;
            }
            else
            {
                // Verify references are set
                madeChanges |= VerifyBootstrapReferences(bootstrap);
            }

            // 2. Fix camera if ortho
            madeChanges |= FixCameraIfNeeded();

            // 3. Clean duplicates
            madeChanges |= CleanDuplicates();

            // 4. Mark scene dirty if changes were made
            if (madeChanges)
            {
                EditorSceneManager.MarkSceneDirty(scene);
                Debug.Log("[LabyrinthAutoSetup] ✓ Scene auto-configured. Changes pending save.");
            }
            else
            {
                Debug.Log("[LabyrinthAutoSetup] ✓ Scene already configured correctly.");
            }
        }

        private static void CreateBootstrap()
        {
            var bootstrapGO = new GameObject("LabyrinthBootstrap");
            var bootstrap = bootstrapGO.AddComponent<LabyrinthBootstrap>();

            // Set up references
            SetupBootstrapReferences(bootstrap);

            Debug.Log("[LabyrinthAutoSetup] Created LabyrinthBootstrap");
        }

        private static bool VerifyBootstrapReferences(LabyrinthBootstrap bootstrap)
        {
            var so = new SerializedObject(bootstrap);
            bool changed = false;

            // Check player ref
            var playerProp = so.FindProperty("_playerTransform");
            if (playerProp.objectReferenceValue == null)
            {
                var player = Object.FindFirstObjectByType<PlayerController>();
                if (player != null)
                {
                    playerProp.objectReferenceValue = player.transform;
                    changed = true;
                }
            }

            // Check console ref
            var consoleProp = so.FindProperty("_consoleTransform");
            if (consoleProp.objectReferenceValue == null)
            {
                var console = Object.FindFirstObjectByType<InWorldConsole>();
                if (console != null)
                {
                    consoleProp.objectReferenceValue = console.transform;
                    changed = true;
                }
            }

            if (changed)
            {
                so.ApplyModifiedPropertiesWithoutUndo();
                Debug.Log("[LabyrinthAutoSetup] Fixed missing references on LabyrinthBootstrap");
            }

            return changed;
        }

        private static void SetupBootstrapReferences(LabyrinthBootstrap bootstrap)
        {
            var so = new SerializedObject(bootstrap);

            // Player
            var player = Object.FindFirstObjectByType<PlayerController>();
            if (player != null)
            {
                so.FindProperty("_playerTransform").objectReferenceValue = player.transform;
            }

            // Console
            var console = Object.FindFirstObjectByType<InWorldConsole>();
            if (console != null)
            {
                so.FindProperty("_consoleTransform").objectReferenceValue = console.transform;
            }

            // Defaults
            so.FindProperty("_generateOnStart").boolValue = true;
            so.FindProperty("_roomSize").vector3Value = new Vector3(10f, 4f, 10f);
            so.FindProperty("_createDoorway").boolValue = true;
            so.FindProperty("_doorwayWall").intValue = (int)WallSide.North;
            so.FindProperty("_doorwaySize").vector2Value = new Vector2(2.5f, 3f);
            so.FindProperty("_destroyPlaceholders").boolValue = true;
            so.FindProperty("_debugMode").boolValue = true;

            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static bool FixCameraIfNeeded()
        {
            var cam = Camera.main;
            if (cam != null && cam.orthographic)
            {
                cam.orthographic = false;
                cam.fieldOfView = 60f;
                cam.nearClipPlane = 0.1f;
                cam.farClipPlane = 100f;
                cam.transform.position = new Vector3(0, 3f, -8f);
                cam.transform.rotation = Quaternion.Euler(15f, 0, 0);
                
                Debug.Log("[LabyrinthAutoSetup] Fixed orthographic camera");
                return true;
            }
            return false;
        }

        private static bool CleanDuplicates()
        {
            bool cleaned = false;

            // Clean duplicate players
            var players = Object.FindObjectsByType<PlayerController>(FindObjectsSortMode.None);
            for (int i = 1; i < players.Length; i++)
            {
                Object.DestroyImmediate(players[i].gameObject);
                cleaned = true;
            }

            // Clean duplicate consoles
            var consoles = Object.FindObjectsByType<InWorldConsole>(FindObjectsSortMode.None);
            for (int i = 1; i < consoles.Length; i++)
            {
                Object.DestroyImmediate(consoles[i].gameObject);
                cleaned = true;
            }

            // Clean duplicate floors (keep first one found)
            var allObjects = Object.FindObjectsByType<GameObject>(FindObjectsSortMode.None);
            bool foundFloor = false;
            foreach (var obj in allObjects)
            {
                if (obj.name == "Floor" && obj.transform.parent == null)
                {
                    if (foundFloor)
                    {
                        Object.DestroyImmediate(obj);
                        cleaned = true;
                    }
                    else
                    {
                        foundFloor = true;
                    }
                }
            }

            if (cleaned)
            {
                Debug.Log("[LabyrinthAutoSetup] Cleaned up duplicate objects");
            }

            return cleaned;
        }
    }
}
#endif

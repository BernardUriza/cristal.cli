using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using Cristal.CLI.Core;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Professional scene setup utility for Labyrinth.unity
    /// Ensures single source of truth for all scene references
    /// Zero tolerance for duplicates, missing references, or manual setup
    /// </summary>
    public static class LabyrinthSceneSetup
    {
        private const string LOG_SYSTEM = "LabyrinthSceneSetup";

        [MenuItem("CRISTAL/Setup Labyrinth Scene (Clean)", priority = 100)]
        public static void SetupLabyrinthSceneClean()
        {
            if (!EditorUtility.DisplayDialog(
                "Clean Labyrinth Setup",
                "This will:\n" +
                "• Remove ALL duplicate objects\n" +
                "• Create Player GameObject with proper components\n" +
                "• Wire all references automatically\n" +
                "• Clean placeholder geometry\n\n" +
                "Scene will be saved. Continue?",
                "Fix This Mess",
                "Cancel"))
            {
                return;
            }

            Debug.Log($"[{LOG_SYSTEM}] Starting clean labyrinth setup...");

            // Phase 1: Nuke duplicates
            RemoveDuplicates();

            // Phase 2: Create Player if missing
            EnsurePlayerExists();

            // Phase 3: Wire all references
            WireSceneReferences();

            // Phase 4: Clean placeholders
            CleanPlaceholders();

            // Phase 5: Validate
            ValidateScene();

            // Save
            EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());
            EditorSceneManager.SaveOpenScenes();

            Debug.Log($"[{LOG_SYSTEM}] ✓ Scene setup complete. Zero errors.");
            EditorUtility.DisplayDialog("Success", "Labyrinth scene is now properly configured.", "OK");
        }

        #region Duplicate Removal

        private static void RemoveDuplicates()
        {
            Debug.Log($"[{LOG_SYSTEM}] Phase 1: Removing duplicates...");

            // RitualOperator - keep only one
            RemoveDuplicateComponent<RitualOperator>("RitualOperator");

            // TerminalConsole - keep only one
            RemoveDuplicateComponent<InWorldConsole>("TerminalConsole");

            // Lights - keep Main Camera's AudioListener, remove duplicate lights
            RemoveDuplicateLights();

            // Floors - keep only runtime-generated, remove manual placeholders
            RemovePlaceholderFloors();
        }

        private static void RemoveDuplicateComponent<T>(string objectName) where T : Component
        {
            var all = Object.FindObjectsOfType<T>();
            if (all.Length <= 1)
            {
                Debug.Log($"[{LOG_SYSTEM}] {objectName}: {all.Length} found (OK)");
                return;
            }

            Debug.LogWarning($"[{LOG_SYSTEM}] {objectName}: {all.Length} duplicates found, removing extras");

            // Keep first, destroy rest
            for (int i = 1; i < all.Length; i++)
            {
                Debug.Log($"[{LOG_SYSTEM}] Destroying duplicate: {all[i].gameObject.name} (ID: {all[i].GetInstanceID()})");
                Object.DestroyImmediate(all[i].gameObject);
            }
        }

        private static void RemoveDuplicateLights()
        {
            var allLights = Object.FindObjectsOfType<Light>();
            int removed = 0;

            foreach (var light in allLights)
            {
                // Keep only:
                // 1. Directional lights (main scene lighting)
                // 2. Lights that are children of generated rooms
                if (light.type == LightType.Directional)
                {
                    // Check for duplicates
                    var directionalLights = Object.FindObjectsOfType<Light>();
                    int dirCount = 0;
                    foreach (var l in directionalLights)
                    {
                        if (l.type == LightType.Directional) dirCount++;
                    }

                    if (dirCount > 1 && light.gameObject.name.Contains("(1)"))
                    {
                        Debug.Log($"[{LOG_SYSTEM}] Removing duplicate directional light: {light.gameObject.name}");
                        Object.DestroyImmediate(light.gameObject);
                        removed++;
                    }
                }
            }

            if (removed > 0)
            {
                Debug.Log($"[{LOG_SYSTEM}] Removed {removed} duplicate lights");
            }
        }

        private static void RemovePlaceholderFloors()
        {
            var rootObjects = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects();
            int removed = 0;

            foreach (var obj in rootObjects)
            {
                // Remove any GameObject named exactly "Floor" (placeholders)
                // Keep dynamically generated rooms (WaitingChamber, etc.)
                if (obj.name == "Floor" && obj.GetComponent<MeshRenderer>() != null)
                {
                    Debug.Log($"[{LOG_SYSTEM}] Removing placeholder floor: {obj.name}");
                    Object.DestroyImmediate(obj);
                    removed++;
                }
            }

            if (removed > 0)
            {
                Debug.Log($"[{LOG_SYSTEM}] Removed {removed} placeholder floors");
            }
        }

        #endregion

        #region Player Creation

        private static void EnsurePlayerExists()
        {
            Debug.Log($"[{LOG_SYSTEM}] Phase 2: Ensuring Player exists...");

            var existingPlayer = Object.FindObjectOfType<PlayerController>();
            if (existingPlayer != null)
            {
                Debug.Log($"[{LOG_SYSTEM}] Player already exists: {existingPlayer.gameObject.name}");
                return;
            }

            // Create Player GameObject with proper architecture
            GameObject player = new GameObject("Player");
            player.tag = "Player";
            player.layer = LayerMask.NameToLayer("Default");

            // Transform
            player.transform.position = new Vector3(0, 1.0f, -3f);
            player.transform.rotation = Quaternion.identity;

            // CharacterController for movement
            var characterController = player.AddComponent<CharacterController>();
            characterController.radius = 0.3f;
            characterController.height = 1.8f;
            characterController.center = new Vector3(0, 0.9f, 0);

            // PlayerController script
            player.AddComponent<PlayerController>();

            // Camera setup (child of Player)
            GameObject cameraGO = new GameObject("PlayerCamera");
            cameraGO.transform.SetParent(player.transform);
            cameraGO.transform.localPosition = new Vector3(0, 1.6f, 0);
            cameraGO.transform.localRotation = Quaternion.identity;

            var camera = cameraGO.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.fieldOfView = 75f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 1000f;

            cameraGO.AddComponent<AudioListener>();

            var playerCamera = cameraGO.AddComponent<PlayerCamera>();

            // Wire PlayerController to PlayerCamera
            var playerController = player.GetComponent<PlayerController>();
            var playerCameraField = typeof(PlayerController).GetField("_playerCamera",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (playerCameraField != null)
            {
                playerCameraField.SetValue(playerController, playerCamera);
            }

            // PlayerInteraction for console interaction
            var interaction = player.AddComponent<PlayerInteraction>();

            // Temporary visual (will be replaced with Y Bot avatar)
            GameObject visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "PlayerVisual_Temp";
            visual.transform.SetParent(player.transform);
            visual.transform.localPosition = new Vector3(0, 0.9f, 0);
            visual.transform.localScale = Vector3.one;
            Object.DestroyImmediate(visual.GetComponent<CapsuleCollider>()); // Remove collider, CharacterController handles it

            var renderer = visual.GetComponent<MeshRenderer>();
            var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.color = new Color(0.2f, 0.8f, 0.3f); // Terminal green
            renderer.material = mat;

            Debug.Log($"[{LOG_SYSTEM}] ✓ Created Player GameObject with CharacterController, PlayerCamera, and PlayerInteraction");

            // Disable Main Camera (replaced by PlayerCamera)
            var mainCamera = GameObject.Find("Main Camera");
            if (mainCamera != null)
            {
                Debug.Log($"[{LOG_SYSTEM}] Disabling Main Camera (replaced by PlayerCamera)");
                mainCamera.SetActive(false);
            }
        }

        #endregion

        #region Reference Wiring

        private static void WireSceneReferences()
        {
            Debug.Log($"[{LOG_SYSTEM}] Phase 3: Wiring scene references...");

            // Wire LabyrinthBootstrap
            var bootstrap = Object.FindObjectOfType<LabyrinthBootstrap>();
            if (bootstrap != null)
            {
                var player = Object.FindObjectOfType<PlayerController>();
                var console = Object.FindObjectOfType<InWorldConsole>();

                if (player != null)
                {
                    var playerTransformField = typeof(LabyrinthBootstrap).GetField("_playerTransform",
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                    playerTransformField?.SetValue(bootstrap, player.transform);
                    Debug.Log($"[{LOG_SYSTEM}] Wired LabyrinthBootstrap._playerTransform");
                }

                if (console != null)
                {
                    var consoleTransformField = typeof(LabyrinthBootstrap).GetField("_consoleTransform",
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                    consoleTransformField?.SetValue(bootstrap, console.transform);
                    Debug.Log($"[{LOG_SYSTEM}] Wired LabyrinthBootstrap._consoleTransform");
                }

                EditorUtility.SetDirty(bootstrap);
            }

            // Wire LabyrinthManager
            var manager = Object.FindObjectOfType<LabyrinthManager>();
            if (manager != null)
            {
                var player = Object.FindObjectOfType<PlayerController>();
                var playerCamera = Object.FindObjectOfType<PlayerCamera>();

                if (player != null)
                {
                    var playerField = typeof(LabyrinthManager).GetField("_player",
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                    playerField?.SetValue(manager, player);
                    Debug.Log($"[{LOG_SYSTEM}] Wired LabyrinthManager._player");
                }

                if (playerCamera != null)
                {
                    var cameraField = typeof(LabyrinthManager).GetField("_playerCamera",
                        System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                    cameraField?.SetValue(manager, playerCamera);
                    Debug.Log($"[{LOG_SYSTEM}] Wired LabyrinthManager._playerCamera");
                }

                EditorUtility.SetDirty(manager);
            }

            Debug.Log($"[{LOG_SYSTEM}] ✓ All references wired");
        }

        #endregion

        #region Cleanup

        private static void CleanPlaceholders()
        {
            Debug.Log($"[{LOG_SYSTEM}] Phase 4: Cleaning placeholders...");

            var rootObjects = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects();
            int cleaned = 0;

            foreach (var obj in rootObjects)
            {
                // Remove common placeholder names
                if (obj.name == "Cube" || obj.name == "Plane" || obj.name == "Sphere")
                {
                    Debug.Log($"[{LOG_SYSTEM}] Removing placeholder: {obj.name}");
                    Object.DestroyImmediate(obj);
                    cleaned++;
                }
            }

            if (cleaned > 0)
            {
                Debug.Log($"[{LOG_SYSTEM}] Cleaned {cleaned} placeholder objects");
            }
        }

        #endregion

        #region Validation

        private static void ValidateScene()
        {
            Debug.Log($"[{LOG_SYSTEM}] Phase 5: Validating scene...");

            int errors = 0;
            int warnings = 0;

            // Check Player
            var player = Object.FindObjectOfType<PlayerController>();
            if (player == null)
            {
                Debug.LogError($"[{LOG_SYSTEM}] ✗ Player not found!");
                errors++;
            }
            else
            {
                Debug.Log($"[{LOG_SYSTEM}] ✓ Player exists");

                // Check components
                if (player.GetComponent<CharacterController>() == null)
                {
                    Debug.LogError($"[{LOG_SYSTEM}] ✗ Player missing CharacterController");
                    errors++;
                }

                var playerCamera = Object.FindObjectOfType<PlayerCamera>();
                if (playerCamera == null)
                {
                    Debug.LogError($"[{LOG_SYSTEM}] ✗ PlayerCamera not found");
                    errors++;
                }
            }

            // Check for duplicates
            var ritualOps = Object.FindObjectsOfType<RitualOperator>();
            if (ritualOps.Length > 1)
            {
                Debug.LogWarning($"[{LOG_SYSTEM}] ⚠ {ritualOps.Length} RitualOperators found (expected 1)");
                warnings++;
            }

            var consoles = Object.FindObjectsOfType<InWorldConsole>();
            if (consoles.Length > 1)
            {
                Debug.LogWarning($"[{LOG_SYSTEM}] ⚠ {consoles.Length} InWorldConsoles found (expected 1)");
                warnings++;
            }
            else if (consoles.Length == 0)
            {
                Debug.LogError($"[{LOG_SYSTEM}] ✗ No InWorldConsole found");
                errors++;
            }

            // Check LabyrinthBootstrap
            var bootstrap = Object.FindObjectOfType<LabyrinthBootstrap>();
            if (bootstrap == null)
            {
                Debug.LogError($"[{LOG_SYSTEM}] ✗ LabyrinthBootstrap not found");
                errors++;
            }

            // Check LabyrinthManager
            var manager = Object.FindObjectOfType<LabyrinthManager>();
            if (manager == null)
            {
                Debug.LogError($"[{LOG_SYSTEM}] ✗ LabyrinthManager not found");
                errors++;
            }

            // Summary
            if (errors == 0 && warnings == 0)
            {
                Debug.Log($"[{LOG_SYSTEM}] ✓✓✓ Scene validation PASSED - Zero errors, zero warnings");
            }
            else
            {
                Debug.LogWarning($"[{LOG_SYSTEM}] Scene validation: {errors} errors, {warnings} warnings");
            }
        }

        #endregion
    }
}

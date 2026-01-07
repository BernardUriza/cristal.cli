#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// One-click setup for the Labyrinth scene.
    /// Because if te dejo hacerlo a mano, va a quedar a medias otra vez.
    /// </summary>
    public static class LabyrinthSceneSetup
    {
        [MenuItem("Cristal/Labyrinth/Setup Current Scene (One-Click)", priority = 0)]
        public static void SetupCurrentScene()
        {
            // Verificar que estamos en la escena correcta
            var scene = EditorSceneManager.GetActiveScene();
            
            Debug.Log($"[LabyrinthSceneSetup] Setting up scene: {scene.name}");

            // 1. Limpiar duplicados y basura
            CleanupScene();

            // 2. Crear o encontrar LabyrinthBootstrap
            var bootstrap = SetupBootstrap();

            // 3. Configurar referencias
            SetupReferences(bootstrap);

            // 4. Configurar cámara correctamente
            FixCamera();

            // 5. Marcar escena como modificada
            EditorSceneManager.MarkSceneDirty(scene);

            Debug.Log("[LabyrinthSceneSetup] ✓ Scene setup complete. Press Play to generate room.");
            
            // Seleccionar el bootstrap para que el usuario lo vea
            Selection.activeGameObject = bootstrap.gameObject;
        }

        private static void CleanupScene()
        {
            int removed = 0;

            // Buscar y destruir duplicados de Floor
            var floors = GameObject.FindObjectsByType<MeshFilter>(FindObjectsSortMode.None);
            bool foundFirstFloor = false;
            foreach (var floor in floors)
            {
                if (floor.gameObject.name == "Floor")
                {
                    if (foundFirstFloor)
                    {
                        Debug.Log($"[Cleanup] Removing duplicate Floor");
                        Object.DestroyImmediate(floor.gameObject);
                        removed++;
                    }
                    else
                    {
                        foundFirstFloor = true;
                    }
                }
            }

            // Buscar RitualOperators duplicados
            var players = GameObject.FindObjectsByType<PlayerController>(FindObjectsSortMode.None);
            if (players.Length > 1)
            {
                for (int i = 1; i < players.Length; i++)
                {
                    Debug.Log($"[Cleanup] Removing duplicate RitualOperator");
                    Object.DestroyImmediate(players[i].gameObject);
                    removed++;
                }
            }

            // Buscar TerminalConsoles duplicados
            var consoles = GameObject.FindObjectsByType<InWorldConsole>(FindObjectsSortMode.None);
            if (consoles.Length > 1)
            {
                for (int i = 1; i < consoles.Length; i++)
                {
                    Debug.Log($"[Cleanup] Removing duplicate TerminalConsole");
                    Object.DestroyImmediate(consoles[i].gameObject);
                    removed++;
                }
            }

            if (removed > 0)
            {
                Debug.Log($"[LabyrinthSceneSetup] Cleaned up {removed} duplicate/orphan objects");
            }
        }

        private static LabyrinthBootstrap SetupBootstrap()
        {
            // Buscar existente
            var existing = Object.FindFirstObjectByType<LabyrinthBootstrap>();
            if (existing != null)
            {
                Debug.Log("[LabyrinthSceneSetup] Found existing LabyrinthBootstrap");
                return existing;
            }

            // Crear nuevo
            var bootstrapGO = new GameObject("LabyrinthBootstrap");
            var bootstrap = bootstrapGO.AddComponent<LabyrinthBootstrap>();
            
            Debug.Log("[LabyrinthSceneSetup] Created new LabyrinthBootstrap");
            return bootstrap;
        }

        private static void SetupReferences(LabyrinthBootstrap bootstrap)
        {
            var so = new SerializedObject(bootstrap);

            // Buscar player
            var player = Object.FindFirstObjectByType<PlayerController>();
            if (player != null)
            {
                so.FindProperty("_playerTransform").objectReferenceValue = player.transform;
                Debug.Log("[LabyrinthSceneSetup] ✓ Player reference set");
            }

            // Buscar consola
            var console = Object.FindFirstObjectByType<InWorldConsole>();
            if (console != null)
            {
                so.FindProperty("_consoleTransform").objectReferenceValue = console.transform;
                Debug.Log("[LabyrinthSceneSetup] ✓ Console reference set");
            }

            // Configurar valores por defecto
            so.FindProperty("_generateOnStart").boolValue = true;
            so.FindProperty("_roomSize").vector3Value = new Vector3(10f, 4f, 10f);
            so.FindProperty("_createDoorway").boolValue = true;
            so.FindProperty("_doorwayWall").intValue = (int)WallSide.North;
            so.FindProperty("_doorwaySize").vector2Value = new Vector2(2.5f, 3f);
            so.FindProperty("_destroyPlaceholders").boolValue = true;
            so.FindProperty("_debugMode").boolValue = true;

            so.ApplyModifiedProperties();
        }

        private static void FixCamera()
        {
            var mainCam = Camera.main;
            if (mainCam != null)
            {
                // Si es ortográfica, cambiar a perspectiva
                if (mainCam.orthographic)
                {
                    mainCam.orthographic = false;
                    mainCam.fieldOfView = 60f;
                    mainCam.nearClipPlane = 0.1f;
                    mainCam.farClipPlane = 100f;
                    
                    // Posicionar para ver el room
                    mainCam.transform.position = new Vector3(0, 3f, -8f);
                    mainCam.transform.rotation = Quaternion.Euler(15f, 0, 0);
                    
                    Debug.Log("[LabyrinthSceneSetup] ✓ Fixed camera (was orthographic in a 3D game... really?)");
                }
            }
        }

        [MenuItem("Cristal/Labyrinth/Generate Room Now (Editor)", priority = 1)]
        public static void GenerateRoomInEditor()
        {
            var bootstrap = Object.FindFirstObjectByType<LabyrinthBootstrap>();
            if (bootstrap == null)
            {
                Debug.LogError("[LabyrinthSceneSetup] No LabyrinthBootstrap found. Run 'Setup Current Scene' first.");
                return;
            }

            // Destruir room anterior si existe
            var existingRoom = GameObject.Find("Room_WaitingChamber");
            if (existingRoom != null)
            {
                Object.DestroyImmediate(existingRoom);
            }

            // Generar
            bootstrap.GenerateLabyrinth();

            Debug.Log("[LabyrinthSceneSetup] ✓ Room generated in editor");
        }

        [MenuItem("Cristal/Labyrinth/Validate Scene", priority = 10)]
        public static void ValidateScene()
        {
            int issues = 0;

            // Check bootstrap
            var bootstrap = Object.FindFirstObjectByType<LabyrinthBootstrap>();
            if (bootstrap == null)
            {
                Debug.LogWarning("⚠ No LabyrinthBootstrap in scene");
                issues++;
            }

            // Check player
            var players = Object.FindObjectsByType<PlayerController>(FindObjectsSortMode.None);
            if (players.Length == 0)
            {
                Debug.LogWarning("⚠ No PlayerController in scene");
                issues++;
            }
            else if (players.Length > 1)
            {
                Debug.LogWarning($"⚠ Multiple PlayerControllers ({players.Length}) - should be 1");
                issues++;
            }

            // Check console
            var consoles = Object.FindObjectsByType<InWorldConsole>(FindObjectsSortMode.None);
            if (consoles.Length == 0)
            {
                Debug.LogWarning("⚠ No InWorldConsole in scene");
                issues++;
            }
            else if (consoles.Length > 1)
            {
                Debug.LogWarning($"⚠ Multiple InWorldConsoles ({consoles.Length}) - should be 1");
                issues++;
            }

            // Check camera
            var cam = Camera.main;
            if (cam != null && cam.orthographic)
            {
                Debug.LogWarning("⚠ Main camera is orthographic (should be perspective for 3D)");
                issues++;
            }

            // Check LabyrinthManager
            var manager = Object.FindFirstObjectByType<LabyrinthManager>();
            if (manager != null)
            {
                var so = new SerializedObject(manager);
                if (so.FindProperty("_player").objectReferenceValue == null)
                {
                    Debug.LogWarning("⚠ LabyrinthManager._player is not assigned");
                    issues++;
                }
            }

            if (issues == 0)
            {
                Debug.Log("✓ Scene validation passed - no issues found");
            }
            else
            {
                Debug.LogWarning($"Scene validation found {issues} issue(s). Run 'Setup Current Scene' to fix.");
            }
        }
    }
}
#endif

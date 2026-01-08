#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using System.IO;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Editor utilities for setting up the Phase 6 Labyrinth environment.
    /// </summary>
    public static class LabyrinthSetup
    {
        private const string SETTINGS_PATH = "Assets/Settings";
        private const string PREFABS_PATH = "Assets/Prefabs/Labyrinth";
        private const string MATERIALS_PATH = "Assets/Materials/Labyrinth";

        [MenuItem("Cristal/Phase 6/Setup URP 3D Renderer")]
        public static void SetupURP3DRenderer()
        {
            // Create Forward Renderer if it doesn't exist
            string rendererPath = $"{SETTINGS_PATH}/ForwardRenderer.asset";

            if (!File.Exists(rendererPath))
            {
                // Create a new Forward Renderer
                var rendererData = ScriptableObject.CreateInstance<UniversalRendererData>();
                AssetDatabase.CreateAsset(rendererData, rendererPath);
                Debug.Log($"[LabyrinthSetup] Created Forward Renderer at {rendererPath}");
            }

            // Load the main URP asset
            var urpAsset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>($"{SETTINGS_PATH}/UniversalRP.asset");
            if (urpAsset != null)
            {
                // Configure for 3D
                urpAsset.supportsCameraDepthTexture = true;
                urpAsset.supportsCameraOpaqueTexture = true;
                EditorUtility.SetDirty(urpAsset);
                Debug.Log("[LabyrinthSetup] Configured URP for 3D rendering");
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
        }

        [MenuItem("Cristal/Phase 6/Create Folder Structure")]
        public static void CreateFolderStructure()
        {
            // Create Prefabs folders
            CreateFolder("Assets/Prefabs", "Labyrinth");
            CreateFolder($"{PREFABS_PATH}", "Player");
            CreateFolder($"{PREFABS_PATH}", "Console");
            CreateFolder($"{PREFABS_PATH}", "Environment");
            CreateFolder($"{PREFABS_PATH}/Environment", "Rooms");
            CreateFolder($"{PREFABS_PATH}/Environment", "Gates");
            CreateFolder($"{PREFABS_PATH}", "Effects");

            // Create Materials folders
            CreateFolder("Assets/Materials", "Labyrinth");
            CreateFolder($"{MATERIALS_PATH}", "States");
            CreateFolder($"{MATERIALS_PATH}", "Console");
            CreateFolder($"{MATERIALS_PATH}", "Hologram");

            // Create Shaders folder
            CreateFolder("Assets", "Shaders");
            CreateFolder("Assets/Shaders", "Labyrinth");

            Debug.Log("[LabyrinthSetup] Created Phase 6 folder structure");
            AssetDatabase.Refresh();
        }

        [MenuItem("Cristal/Phase 6/Create Basic Materials")]
        public static void CreateBasicMaterials()
        {
            CreateFolderStructure();

            // Create base materials
            CreateMaterial($"{MATERIALS_PATH}/M_ProBuilder_Floor.mat", new Color(0.2f, 0.2f, 0.25f));
            CreateMaterial($"{MATERIALS_PATH}/M_ProBuilder_Wall.mat", new Color(0.15f, 0.15f, 0.2f));
            CreateMaterial($"{MATERIALS_PATH}/M_ProBuilder_Ceiling.mat", new Color(0.1f, 0.1f, 0.15f));

            // State-themed materials
            CreateMaterial($"{MATERIALS_PATH}/States/M_State_Waiting.mat", new Color(0.2f, 0.8f, 0.3f), 0.5f);
            CreateMaterial($"{MATERIALS_PATH}/States/M_State_Remembering.mat", new Color(1f, 0.7f, 0.3f), 0.5f);
            CreateMaterial($"{MATERIALS_PATH}/States/M_State_Corrupted.mat", new Color(0.9f, 0.2f, 0.2f), 1f);
            CreateMaterial($"{MATERIALS_PATH}/States/M_State_Echo.mat", new Color(0.3f, 0.6f, 1f), 0.5f);
            CreateMaterial($"{MATERIALS_PATH}/States/M_State_Unbound.mat", new Color(1f, 0.2f, 1f), 2f);

            // Console materials
            CreateMaterial($"{MATERIALS_PATH}/Console/M_Console_Body.mat", new Color(0.05f, 0.05f, 0.08f));
            CreateMaterial($"{MATERIALS_PATH}/Console/M_Console_Screen.mat", new Color(0.1f, 0.8f, 0.2f), 1f);

            Debug.Log("[LabyrinthSetup] Created basic materials");
            AssetDatabase.Refresh();
        }

        [MenuItem("Cristal/Phase 6/Create RitualOperator Prefab")]
        public static void CreateRitualOperatorPrefab()
        {
            CreateFolderStructure();

            // Create root GameObject
            GameObject player = new GameObject("RitualOperator");

            // Add CharacterController
            var cc = player.AddComponent<CharacterController>();
            cc.height = 1.8f;
            cc.radius = 0.3f;
            cc.center = new Vector3(0, 0.9f, 0);

            // Add player scripts
            player.AddComponent<PlayerController>();
            player.AddComponent<PlayerInputHandler>();
            player.AddComponent<PlayerInteraction>();

            // Create visual representation (capsule)
            GameObject visual = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visual.name = "PlayerVisual";
            visual.transform.SetParent(player.transform);
            visual.transform.localPosition = new Vector3(0, 0.9f, 0);
            visual.transform.localScale = new Vector3(0.6f, 0.9f, 0.6f);

            // Remove capsule collider (CharacterController handles collision)
            Object.DestroyImmediate(visual.GetComponent<CapsuleCollider>());

            // Create camera rig
            GameObject cameraRig = new GameObject("CameraRig");
            cameraRig.transform.SetParent(player.transform);
            cameraRig.transform.localPosition = Vector3.zero;

            // Create camera
            GameObject cameraObj = new GameObject("PlayerCamera");
            cameraObj.transform.SetParent(cameraRig.transform);
            cameraObj.transform.localPosition = new Vector3(0, 2.5f, -4f);
            cameraObj.transform.localRotation = Quaternion.Euler(15f, 0, 0);

            var camera = cameraObj.AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 100f;
            camera.fieldOfView = 60f;

            // Add audio listener
            cameraObj.AddComponent<AudioListener>();

            // Add PlayerCamera script
            var playerCam = cameraObj.AddComponent<PlayerCamera>();

            // Set player tag
            player.tag = "Player";

            // Save as prefab
            string prefabPath = $"{PREFABS_PATH}/Player/RitualOperator.prefab";
            EnsureDirectoryExists(prefabPath);

            PrefabUtility.SaveAsPrefabAsset(player, prefabPath);
            Object.DestroyImmediate(player);

            Debug.Log($"[LabyrinthSetup] Created RitualOperator prefab at {prefabPath}");
            AssetDatabase.Refresh();
        }

        [MenuItem("Cristal/Phase 6/Create TerminalConsole Prefab")]
        public static void CreateTerminalConsolePrefab()
        {
            CreateFolderStructure();

            // Create root GameObject
            GameObject console = new GameObject("TerminalConsole");
            console.layer = LayerMask.NameToLayer("Default");

            // Add console scripts
            console.AddComponent<InWorldConsole>();
            console.AddComponent<ConsoleUIBridge>();

            // Create console body (cube base)
            GameObject body = GameObject.CreatePrimitive(PrimitiveType.Cube);
            body.name = "ConsoleBody";
            body.transform.SetParent(console.transform);
            body.transform.localPosition = new Vector3(0, 0.5f, 0);
            body.transform.localScale = new Vector3(0.8f, 1f, 0.4f);

            // Create screen (quad)
            GameObject screen = GameObject.CreatePrimitive(PrimitiveType.Quad);
            screen.name = "Screen";
            screen.transform.SetParent(console.transform);
            screen.transform.localPosition = new Vector3(0, 0.8f, 0.21f);
            screen.transform.localScale = new Vector3(0.7f, 0.5f, 1f);
            Object.DestroyImmediate(screen.GetComponent<MeshCollider>());

            // Create interaction collider
            GameObject interactTrigger = new GameObject("InteractTrigger");
            interactTrigger.transform.SetParent(console.transform);
            interactTrigger.transform.localPosition = new Vector3(0, 0.5f, 0.5f);
            var triggerCollider = interactTrigger.AddComponent<BoxCollider>();
            triggerCollider.isTrigger = true;
            triggerCollider.size = new Vector3(1.5f, 2f, 1f);

            // Create World Space Canvas
            GameObject canvasObj = new GameObject("TerminalCanvas");
            canvasObj.transform.SetParent(console.transform);
            canvasObj.transform.localPosition = new Vector3(0, 0.8f, 0.22f);
            canvasObj.transform.localScale = new Vector3(0.001f, 0.001f, 0.001f);

            var canvas = canvasObj.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;

            var rectTransform = canvasObj.GetComponent<RectTransform>();
            rectTransform.sizeDelta = new Vector2(700, 500);

            // Add CanvasScaler and GraphicRaycaster
            canvasObj.AddComponent<UnityEngine.UI.CanvasScaler>();
            canvasObj.AddComponent<UnityEngine.UI.GraphicRaycaster>();

            // Create screen light
            GameObject lightObj = new GameObject("ScreenLight");
            lightObj.transform.SetParent(console.transform);
            lightObj.transform.localPosition = new Vector3(0, 0.8f, 0.3f);
            var light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.range = 2f;
            light.intensity = 1f;
            light.color = new Color(0.2f, 0.8f, 0.3f);

            // Add audio source
            var audio = console.AddComponent<AudioSource>();
            audio.spatialBlend = 1f;
            audio.minDistance = 1f;
            audio.maxDistance = 5f;

            // Save as prefab
            string prefabPath = $"{PREFABS_PATH}/Console/TerminalConsole.prefab";
            EnsureDirectoryExists(prefabPath);

            PrefabUtility.SaveAsPrefabAsset(console, prefabPath);
            Object.DestroyImmediate(console);

            Debug.Log($"[LabyrinthSetup] Created TerminalConsole prefab at {prefabPath}");
            AssetDatabase.Refresh();
        }

        [MenuItem("Cristal/Phase 6/Create SymbolicGate Prefab")]
        public static void CreateSymbolicGatePrefab()
        {
            CreateFolderStructure();

            // Create root
            GameObject gate = new GameObject("SymbolicGate");

            // Add gate script
            gate.AddComponent<SymbolicGate>();

            // Create frame (two pillars + top)
            GameObject frame = new GameObject("Frame");
            frame.transform.SetParent(gate.transform);

            // Left pillar
            GameObject leftPillar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            leftPillar.name = "LeftPillar";
            leftPillar.transform.SetParent(frame.transform);
            leftPillar.transform.localPosition = new Vector3(-1.5f, 1.5f, 0);
            leftPillar.transform.localScale = new Vector3(0.3f, 3f, 0.3f);

            // Right pillar
            GameObject rightPillar = GameObject.CreatePrimitive(PrimitiveType.Cube);
            rightPillar.name = "RightPillar";
            rightPillar.transform.SetParent(frame.transform);
            rightPillar.transform.localPosition = new Vector3(1.5f, 1.5f, 0);
            rightPillar.transform.localScale = new Vector3(0.3f, 3f, 0.3f);

            // Top
            GameObject top = GameObject.CreatePrimitive(PrimitiveType.Cube);
            top.name = "Top";
            top.transform.SetParent(frame.transform);
            top.transform.localPosition = new Vector3(0, 3.15f, 0);
            top.transform.localScale = new Vector3(3.3f, 0.3f, 0.3f);

            // Create door (moves up when opened)
            GameObject door = GameObject.CreatePrimitive(PrimitiveType.Cube);
            door.name = "Door";
            door.transform.SetParent(gate.transform);
            door.transform.localPosition = new Vector3(0, 1.5f, 0);
            door.transform.localScale = new Vector3(2.7f, 3f, 0.1f);

            // Add light indicator
            GameObject lightObj = new GameObject("GateLight");
            lightObj.transform.SetParent(gate.transform);
            lightObj.transform.localPosition = new Vector3(0, 3.3f, 0.2f);
            var light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.range = 3f;
            light.intensity = 1f;
            light.color = Color.red;

            // Save as prefab
            string prefabPath = $"{PREFABS_PATH}/Environment/Gates/SymbolicGate.prefab";
            EnsureDirectoryExists(prefabPath);

            PrefabUtility.SaveAsPrefabAsset(gate, prefabPath);
            Object.DestroyImmediate(gate);

            Debug.Log($"[LabyrinthSetup] Created SymbolicGate prefab at {prefabPath}");
            AssetDatabase.Refresh();
        }

        [MenuItem("Cristal/Phase 6/Setup Labyrinth Scene")]
        public static void SetupLabyrinthScene()
        {
            // Find or create LabyrinthManager
            var manager = Object.FindFirstObjectByType<LabyrinthManager>();
            if (manager == null)
            {
                GameObject managerObj = new GameObject("LabyrinthManager");
                managerObj.AddComponent<LabyrinthManager>();
                Debug.Log("[LabyrinthSetup] Created LabyrinthManager");
            }

            // Find or create TerminalCore
            var terminal = Object.FindFirstObjectByType<TerminalCore>();
            if (terminal == null)
            {
                GameObject terminalObj = new GameObject("TerminalCore");
                terminalObj.AddComponent<TerminalCore>();
                Debug.Log("[LabyrinthSetup] Created TerminalCore");
            }

            // Create directional light if none exists
            if (Object.FindFirstObjectByType<Light>() == null)
            {
                GameObject lightObj = new GameObject("Directional Light");
                var light = lightObj.AddComponent<Light>();
                light.type = LightType.Directional;
                light.intensity = 0.3f;
                light.color = new Color(0.7f, 0.7f, 0.8f);
                lightObj.transform.rotation = Quaternion.Euler(50f, -30f, 0);
                Debug.Log("[LabyrinthSetup] Created Directional Light");
            }

            // Spawn player if prefab exists
            string playerPrefabPath = $"{PREFABS_PATH}/Player/RitualOperator.prefab";
            var playerPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(playerPrefabPath);
            if (playerPrefab != null)
            {
                var existingPlayer = GameObject.FindGameObjectWithTag("Player");
                if (existingPlayer == null)
                {
                    var player = PrefabUtility.InstantiatePrefab(playerPrefab) as GameObject;
                    player.transform.position = new Vector3(0, 0.1f, 0);
                    Debug.Log("[LabyrinthSetup] Spawned RitualOperator");
                }
            }

            Debug.Log("[LabyrinthSetup] Labyrinth scene setup complete");
        }

        #region Utility Methods

        private static void CreateFolder(string parent, string folderName)
        {
            string fullPath = $"{parent}/{folderName}";
            if (!AssetDatabase.IsValidFolder(fullPath))
            {
                AssetDatabase.CreateFolder(parent, folderName);
            }
        }

        private static void CreateMaterial(string path, Color color, float emission = 0f)
        {
            if (File.Exists(path)) return;

            EnsureDirectoryExists(path);

            var material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.color = color;

            if (emission > 0)
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", color * emission);
            }

            AssetDatabase.CreateAsset(material, path);
        }

        private static void EnsureDirectoryExists(string filePath)
        {
            string directory = Path.GetDirectoryName(filePath);
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
        }

        #endregion
    }
}
#endif

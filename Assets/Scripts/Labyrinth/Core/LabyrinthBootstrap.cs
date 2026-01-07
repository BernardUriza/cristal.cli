using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Bootstrap component that generates the initial labyrinth room on scene load.
    /// Put this on an empty GameObject in the scene and it will create the room at runtime.
    /// 
    /// Why? Because someone left placeholder cubes for months and called it "the floor".
    /// </summary>
    public class LabyrinthBootstrap : MonoBehaviour
    {
        [Header("Initial Room Configuration")]
        [SerializeField] private bool _generateOnStart = true;
        [SerializeField] private Vector3 _roomSize = new Vector3(10f, 4f, 10f);
        [SerializeField] private bool _createDoorway = true;
        [SerializeField] private WallSide _doorwayWall = WallSide.North;
        [SerializeField] private Vector2 _doorwaySize = new Vector2(2.5f, 3f);

        [Header("Materials (optional - will create defaults if null)")]
        [SerializeField] private Material _floorMaterial;
        [SerializeField] private Material _wallMaterial;
        [SerializeField] private Material _ceilingMaterial;

        [Header("Player Setup")]
        [SerializeField] private Transform _playerTransform;
        [SerializeField] private Vector3 _playerSpawnOffset = new Vector3(0, 0.1f, -3f);

        [Header("Console Setup")]
        [SerializeField] private Transform _consoleTransform;
        [SerializeField] private Vector3 _consoleOffset = new Vector3(0, 0, 3f);

        [Header("Cleanup")]
        [SerializeField] private bool _destroyPlaceholders = true;
        [SerializeField] private string[] _placeholderNames = { "Floor", "Cube", "Plane" };

        [Header("Debug")]
        [SerializeField] private bool _debugMode = true;

        private GameObject _generatedRoom;

        private void Start()
        {
            if (_generateOnStart)
            {
                GenerateLabyrinth();
            }
        }

        [ContextMenu("Generate Labyrinth Now")]
        public void GenerateLabyrinth()
        {
            if (_debugMode)
            {
                Debug.Log("[LabyrinthBootstrap] Starting labyrinth generation...");
            }

            // Step 1: Clean up the placeholder garbage
            if (_destroyPlaceholders)
            {
                CleanupPlaceholders();
            }

            // Step 2: Get or create materials
            Material floor = _floorMaterial;
            Material wall = _wallMaterial;
            Material ceiling = _ceilingMaterial;

            if (floor == null || wall == null || ceiling == null)
            {
                var defaults = RuntimeRoomBuilder.CreateDefaultMaterials();
                floor = floor ?? defaults.floor;
                wall = wall ?? defaults.wall;
                ceiling = ceiling ?? defaults.ceiling;
            }

            // Step 3: Generate the room
            if (_createDoorway)
            {
                _generatedRoom = RuntimeRoomBuilder.CreateRoomWithDoorway(
                    "WaitingChamber",
                    _roomSize,
                    Vector3.zero,
                    _doorwayWall,
                    _doorwaySize,
                    floor,
                    wall,
                    ceiling
                );
            }
            else
            {
                _generatedRoom = RuntimeRoomBuilder.CreateRoom(
                    "WaitingChamber",
                    _roomSize,
                    Vector3.zero,
                    floor,
                    wall,
                    ceiling
                );
            }

            // Step 4: Position player
            if (_playerTransform != null)
            {
                _playerTransform.position = _playerSpawnOffset;
                if (_debugMode)
                {
                    Debug.Log($"[LabyrinthBootstrap] Positioned player at {_playerSpawnOffset}");
                }
            }

            // Step 5: Position console
            if (_consoleTransform != null)
            {
                _consoleTransform.position = _consoleOffset;
                // Face the console towards spawn
                _consoleTransform.rotation = Quaternion.Euler(0, 180, 0);
                if (_debugMode)
                {
                    Debug.Log($"[LabyrinthBootstrap] Positioned console at {_consoleOffset}");
                }
            }

            // Step 6: Add room lighting
            CreateRoomLighting();

            if (_debugMode)
            {
                Debug.Log($"[LabyrinthBootstrap] Generated room: {_roomSize.x}x{_roomSize.y}x{_roomSize.z}");
            }
        }

        private void CleanupPlaceholders()
        {
            int cleaned = 0;
            foreach (string name in _placeholderNames)
            {
                // Find all objects with this name at root level
                var rootObjects = UnityEngine.SceneManagement.SceneManager.GetActiveScene().GetRootGameObjects();
                foreach (var obj in rootObjects)
                {
                    if (obj.name == name && obj != this.gameObject)
                    {
                        if (_debugMode)
                        {
                            Debug.Log($"[LabyrinthBootstrap] Destroying placeholder: {obj.name}");
                        }
                        Destroy(obj);
                        cleaned++;
                    }
                }
            }

            if (_debugMode && cleaned > 0)
            {
                Debug.Log($"[LabyrinthBootstrap] Cleaned up {cleaned} placeholder objects");
            }
        }

        private void CreateRoomLighting()
        {
            // Create ambient point light in center of room
            GameObject lightObj = new GameObject("RoomLight_Center");
            lightObj.transform.SetParent(_generatedRoom.transform);
            lightObj.transform.localPosition = new Vector3(0, _roomSize.y - 0.5f, 0);

            Light light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(0.2f, 0.9f, 0.3f); // Terminal green
            light.intensity = 1.5f;
            light.range = Mathf.Max(_roomSize.x, _roomSize.z) * 0.8f;
            light.shadows = LightShadows.Soft;

            // Create secondary accent lights at corners
            CreateCornerLight(new Vector3(-_roomSize.x / 3f, _roomSize.y - 0.3f, -_roomSize.z / 3f), 0.3f);
            CreateCornerLight(new Vector3(_roomSize.x / 3f, _roomSize.y - 0.3f, -_roomSize.z / 3f), 0.3f);
            CreateCornerLight(new Vector3(-_roomSize.x / 3f, _roomSize.y - 0.3f, _roomSize.z / 3f), 0.3f);
            CreateCornerLight(new Vector3(_roomSize.x / 3f, _roomSize.y - 0.3f, _roomSize.z / 3f), 0.3f);
        }

        private void CreateCornerLight(Vector3 localPos, float intensity)
        {
            GameObject lightObj = new GameObject("RoomLight_Corner");
            lightObj.transform.SetParent(_generatedRoom.transform);
            lightObj.transform.localPosition = localPos;

            Light light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(0.1f, 0.8f, 0.2f);
            light.intensity = intensity;
            light.range = 3f;
            light.shadows = LightShadows.None;
        }

        [ContextMenu("Destroy Generated Room")]
        public void DestroyGeneratedRoom()
        {
            if (_generatedRoom != null)
            {
                DestroyImmediate(_generatedRoom);
                _generatedRoom = null;
                Debug.Log("[LabyrinthBootstrap] Destroyed generated room");
            }
        }

#if UNITY_EDITOR
        [ContextMenu("Setup Scene References")]
        public void SetupSceneReferences()
        {
            // Find player
            var player = GameObject.Find("RitualOperator");
            if (player != null)
            {
                _playerTransform = player.transform;
                Debug.Log("[LabyrinthBootstrap] Found player: RitualOperator");
            }

            // Find console
            var console = GameObject.Find("TerminalConsole");
            if (console != null)
            {
                _consoleTransform = console.transform;
                Debug.Log("[LabyrinthBootstrap] Found console: TerminalConsole");
            }

            UnityEditor.EditorUtility.SetDirty(this);
        }
#endif
    }
}

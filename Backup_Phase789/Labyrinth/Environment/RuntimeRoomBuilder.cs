using UnityEngine;
using System.Collections.Generic;
using Cristal.CLI.StateMachine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Runtime room generator that creates proper geometry without ProBuilder dependency.
    /// Supports procedural labyrinth generation from ASCII maps.
    /// </summary>
    public static class RuntimeRoomBuilder
    {
        // Default room dimensions
        private const float DEFAULT_ROOM_WIDTH = 10f;
        private const float DEFAULT_ROOM_HEIGHT = 4f;
        private const float DEFAULT_ROOM_DEPTH = 10f;
        private const float WALL_THICKNESS = 0.3f;
        private static readonly Vector2 DEFAULT_DOOR_SIZE = new Vector2(2.5f, 3f);

        #region ASCII Map Symbols
        
        /// <summary>
        /// Cell types for ASCII map generation.
        /// R = Room, C = Console (room with terminal), G = Gate (locked passage)
        /// . = Empty, X = Solid wall block
        /// </summary>
        public enum CellType
        {
            Empty,      // '.' or ' '
            Room,       // 'R'
            Console,    // 'C'
            Gate,       // 'G'
            Solid       // 'X'
        }

        #endregion

        #region Labyrinth From Map

        /// <summary>
        /// Build an entire labyrinth from an ASCII map.
        /// Example map:
        /// R R G
        /// R C G
        /// R R G
        /// </summary>
        public static LabyrinthBuildResult BuildLabyrinthFromMap(
            string[][] map,
            Vector3 origin = default,
            Vector3? roomSize = null,
            LabyrinthBuildConfig config = null)
        {
            if (map == null || map.Length == 0)
            {
                Debug.LogError("[RuntimeRoomBuilder] Map is null or empty");
                return null;
            }

            config ??= new LabyrinthBuildConfig();
            Vector3 size = roomSize ?? new Vector3(DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_DEPTH);

            var result = new LabyrinthBuildResult
            {
                Root = new GameObject("Labyrinth_Generated"),
                Rooms = new List<GameObject>(),
                Gates = new List<SymbolicGate>(),
                Consoles = new List<GameObject>(),
                MapWidth = map[0].Length,
                MapHeight = map.Length
            };

            result.Root.transform.position = origin;

            // Parse map into cell grid
            int rows = map.Length;
            int cols = map[0].Length;
            var grid = new CellType[rows, cols];

            for (int row = 0; row < rows; row++)
            {
                for (int col = 0; col < map[row].Length && col < cols; col++)
                {
                    grid[row, col] = ParseCellType(map[row][col]);
                }
            }

            // Create materials once
            var (floorMat, wallMat, ceilingMat) = config.UseMaterials 
                ? (config.FloorMaterial, config.WallMaterial, config.CeilingMaterial)
                : CreateDefaultMaterials();

            // Generate rooms
            for (int row = 0; row < rows; row++)
            {
                for (int col = 0; col < cols; col++)
                {
                    var cellType = grid[row, col];
                    if (cellType == CellType.Empty || cellType == CellType.Solid)
                        continue;

                    // Calculate world position (row = Z, col = X)
                    Vector3 cellPos = new Vector3(col * size.x, 0, -row * size.z);

                    // Determine which walls need doorways based on neighbors
                    var doorways = new List<WallSide>();
                    
                    // North neighbor (row - 1)
                    if (row > 0 && IsPassable(grid[row - 1, col]))
                        doorways.Add(WallSide.North);
                    
                    // South neighbor (row + 1)
                    if (row < rows - 1 && IsPassable(grid[row + 1, col]))
                        doorways.Add(WallSide.South);
                    
                    // East neighbor (col + 1)
                    if (col < cols - 1 && IsPassable(grid[row, col + 1]))
                        doorways.Add(WallSide.East);
                    
                    // West neighbor (col - 1)
                    if (col > 0 && IsPassable(grid[row, col - 1]))
                        doorways.Add(WallSide.West);

                    // Create the room
                    string roomId = $"{row}_{col}";
                    GameObject room;

                    if (cellType == CellType.Gate)
                    {
                        // Gate cells are smaller passage rooms with SymbolicGate
                        room = CreateGateRoom(roomId, size, cellPos, doorways, 
                            floorMat, wallMat, ceilingMat, config);
                        
                        var gate = room.GetComponentInChildren<SymbolicGate>();
                        if (gate != null)
                        {
                            result.Gates.Add(gate);
                        }
                    }
                    else
                    {
                        room = CreateRoomWithDoorways(roomId, size, cellPos, doorways.ToArray(),
                            DEFAULT_DOOR_SIZE, floorMat, wallMat, ceilingMat);

                        if (cellType == CellType.Console)
                        {
                            // Add console spawn point
                            var consoleAnchor = CreateConsoleAnchor(room.transform, size);
                            result.Consoles.Add(consoleAnchor);
                        }
                    }

                    room.transform.SetParent(result.Root.transform);
                    result.Rooms.Add(room);

                    // Add SymbolicRoom component for state tracking
                    var symbolicRoom = room.AddComponent<SymbolicRoom>();
                    // Room state can be configured based on position or pattern
                }
            }

            Debug.Log($"[RuntimeRoomBuilder] Generated labyrinth: {result.Rooms.Count} rooms, {result.Gates.Count} gates, {result.Consoles.Count} consoles");
            return result;
        }

        private static CellType ParseCellType(string cell)
        {
            if (string.IsNullOrWhiteSpace(cell))
                return CellType.Empty;

            return cell.Trim().ToUpper() switch
            {
                "R" => CellType.Room,
                "C" => CellType.Console,
                "G" => CellType.Gate,
                "X" => CellType.Solid,
                "." => CellType.Empty,
                _ => CellType.Empty
            };
        }

        private static bool IsPassable(CellType type)
        {
            return type == CellType.Room || type == CellType.Console || type == CellType.Gate;
        }

        #endregion

        #region Room Creation with Multiple Doorways

        /// <summary>
        /// Creates a room with doorways on multiple walls.
        /// </summary>
        public static GameObject CreateRoomWithDoorways(
            string roomName,
            Vector3 size,
            Vector3 position,
            WallSide[] doorwayWalls,
            Vector2 doorSize,
            Material floorMat = null,
            Material wallMat = null,
            Material ceilingMat = null)
        {
            GameObject roomRoot = new GameObject($"Room_{roomName}");
            roomRoot.transform.position = position;

            GameObject geometry = new GameObject("Geometry");
            geometry.transform.SetParent(roomRoot.transform);
            geometry.transform.localPosition = Vector3.zero;

            // Floor & Ceiling
            CreateFloor(geometry.transform, size, floorMat);
            CreateCeiling(geometry.transform, size, ceilingMat);

            // Create each wall, with doorway if needed
            var doorwaySet = new HashSet<WallSide>(doorwayWalls ?? System.Array.Empty<WallSide>());

            foreach (WallSide side in System.Enum.GetValues(typeof(WallSide)))
            {
                if (doorwaySet.Contains(side))
                {
                    CreateDoorwayWall(geometry.transform, side, size, doorSize, WALL_THICKNESS, wallMat);
                }
                else
                {
                    CreateSolidWall(geometry.transform, side, size, WALL_THICKNESS, wallMat);
                }
            }

            // Add room trigger collider
            var triggerObj = new GameObject("RoomTrigger");
            triggerObj.transform.SetParent(roomRoot.transform);
            triggerObj.transform.localPosition = new Vector3(0, size.y / 2f, 0);
            var trigger = triggerObj.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.size = new Vector3(size.x - 0.5f, size.y, size.z - 0.5f);

            return roomRoot;
        }

        private static void CreateSolidWall(Transform parent, WallSide side, Vector3 roomSize, float thickness, Material mat)
        {
            Vector3 scale;
            Vector3 pos;

            switch (side)
            {
                case WallSide.North:
                    scale = new Vector3(roomSize.x, roomSize.y, thickness);
                    pos = new Vector3(0, roomSize.y / 2f, roomSize.z / 2f);
                    break;
                case WallSide.South:
                    scale = new Vector3(roomSize.x, roomSize.y, thickness);
                    pos = new Vector3(0, roomSize.y / 2f, -roomSize.z / 2f);
                    break;
                case WallSide.East:
                    scale = new Vector3(thickness, roomSize.y, roomSize.z);
                    pos = new Vector3(roomSize.x / 2f, roomSize.y / 2f, 0);
                    break;
                case WallSide.West:
                    scale = new Vector3(thickness, roomSize.y, roomSize.z);
                    pos = new Vector3(-roomSize.x / 2f, roomSize.y / 2f, 0);
                    break;
                default:
                    return;
            }

            CreateWall(parent, $"Wall_{side}", scale, pos, mat);
        }

        private static GameObject CreateGateRoom(
            string roomId,
            Vector3 size,
            Vector3 position,
            List<WallSide> doorways,
            Material floorMat,
            Material wallMat,
            Material ceilingMat,
            LabyrinthBuildConfig config)
        {
            // Gate rooms are passage corridors
            var room = CreateRoomWithDoorways(roomId, size, position, doorways.ToArray(),
                DEFAULT_DOOR_SIZE, floorMat, wallMat, ceilingMat);

            // Create the actual gate object in the center
            var gateObj = new GameObject("SymbolicGate");
            gateObj.transform.SetParent(room.transform);
            gateObj.transform.localPosition = new Vector3(0, 0, 0);

            // Add gate component
            var gate = gateObj.AddComponent<SymbolicGate>();

            // Create gate visual (door that blocks passage)
            var doorVisual = GameObject.CreatePrimitive(PrimitiveType.Cube);
            doorVisual.name = "GateDoor";
            doorVisual.transform.SetParent(gateObj.transform);
            doorVisual.transform.localPosition = new Vector3(0, DEFAULT_DOOR_SIZE.y / 2f, 0);
            doorVisual.transform.localScale = new Vector3(DEFAULT_DOOR_SIZE.x, DEFAULT_DOOR_SIZE.y, 0.2f);

            // Configure gate
            WallSide primaryDirection = doorways.Count > 0 ? doorways[0] : WallSide.North;
            gate.Configure(primaryDirection, config.DefaultGateUnlockState, config.GatesOpenOnUnbound);

            // Add gate light indicator
            var lightObj = new GameObject("GateLight");
            lightObj.transform.SetParent(gateObj.transform);
            lightObj.transform.localPosition = new Vector3(0, DEFAULT_DOOR_SIZE.y + 0.5f, 0);
            var light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.range = 4f;
            light.intensity = 1.5f;
            light.color = Color.red;

            return room;
        }

        private static GameObject CreateConsoleAnchor(Transform roomRoot, Vector3 roomSize)
        {
            var anchor = new GameObject("ConsoleSpawnPoint");
            anchor.transform.SetParent(roomRoot);
            anchor.transform.localPosition = new Vector3(0, 0, roomSize.z * 0.3f);
            anchor.transform.localRotation = Quaternion.Euler(0, 180, 0);
            return anchor;
        }

        #endregion

        private static void CreateFloor(Transform parent, Vector3 size, Material mat)
        {
            GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Floor";
            floor.transform.SetParent(parent);
            floor.transform.localPosition = new Vector3(0, -0.05f, 0);
            floor.transform.localScale = new Vector3(size.x, 0.1f, size.z);
            floor.isStatic = true;

            if (mat != null)
            {
                floor.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
        }

        private static void CreateCeiling(Transform parent, Vector3 size, Material mat)
        {
            GameObject ceiling = GameObject.CreatePrimitive(PrimitiveType.Cube);
            ceiling.name = "Ceiling";
            ceiling.transform.SetParent(parent);
            ceiling.transform.localPosition = new Vector3(0, size.y + 0.05f, 0);
            ceiling.transform.localScale = new Vector3(size.x, 0.1f, size.z);
            ceiling.isStatic = true;

            if (mat != null)
            {
                ceiling.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
        }

        private static void CreateWall(Transform parent, string name, Vector3 scale, Vector3 position, Material mat)
        {
            GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wall.name = name;
            wall.transform.SetParent(parent);
            wall.transform.localPosition = position;
            wall.transform.localScale = scale;
            wall.isStatic = true;

            if (mat != null)
            {
                wall.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
        }

        private static void CreateWallOrDoorway(Transform parent, WallSide side, Vector3 roomSize, 
            WallSide doorWall, Vector2 doorSize, Material mat)
        {
            float wallThickness = 0.3f;
            Vector3 wallScale;
            Vector3 wallPos;

            switch (side)
            {
                case WallSide.North:
                    wallScale = new Vector3(roomSize.x, roomSize.y, wallThickness);
                    wallPos = new Vector3(0, roomSize.y / 2f, roomSize.z / 2f);
                    break;
                case WallSide.South:
                    wallScale = new Vector3(roomSize.x, roomSize.y, wallThickness);
                    wallPos = new Vector3(0, roomSize.y / 2f, -roomSize.z / 2f);
                    break;
                case WallSide.East:
                    wallScale = new Vector3(wallThickness, roomSize.y, roomSize.z);
                    wallPos = new Vector3(roomSize.x / 2f, roomSize.y / 2f, 0);
                    break;
                case WallSide.West:
                    wallScale = new Vector3(wallThickness, roomSize.y, roomSize.z);
                    wallPos = new Vector3(-roomSize.x / 2f, roomSize.y / 2f, 0);
                    break;
                default:
                    return;
            }

            if (side == doorWall)
            {
                // Create wall with doorway (3 segments)
                CreateDoorwayWall(parent, side, roomSize, doorSize, wallThickness, mat);
            }
            else
            {
                // Create solid wall
                CreateWall(parent, $"Wall_{side}", wallScale, wallPos, mat);
            }
        }

        private static void CreateDoorwayWall(Transform parent, WallSide side, Vector3 roomSize, 
            Vector2 doorSize, float thickness, Material mat)
        {
            GameObject doorwayContainer = new GameObject($"Wall_{side}_Doorway");
            doorwayContainer.transform.SetParent(parent);
            doorwayContainer.transform.localPosition = Vector3.zero;

            bool isNorthSouth = (side == WallSide.North || side == WallSide.South);
            float wallLength = isNorthSouth ? roomSize.x : roomSize.z;
            float wallHeight = roomSize.y;
            float zPos = isNorthSouth ? (side == WallSide.North ? roomSize.z / 2f : -roomSize.z / 2f) : 0;
            float xPos = isNorthSouth ? 0 : (side == WallSide.East ? roomSize.x / 2f : -roomSize.x / 2f);

            // Left segment
            float leftWidth = (wallLength - doorSize.x) / 2f;
            if (leftWidth > 0.1f)
            {
                GameObject left = GameObject.CreatePrimitive(PrimitiveType.Cube);
                left.name = "Segment_Left";
                left.transform.SetParent(doorwayContainer.transform);
                
                if (isNorthSouth)
                {
                    left.transform.localPosition = new Vector3(-wallLength / 2f + leftWidth / 2f, wallHeight / 2f, zPos);
                    left.transform.localScale = new Vector3(leftWidth, wallHeight, thickness);
                }
                else
                {
                    left.transform.localPosition = new Vector3(xPos, wallHeight / 2f, -wallLength / 2f + leftWidth / 2f);
                    left.transform.localScale = new Vector3(thickness, wallHeight, leftWidth);
                }
                
                left.isStatic = true;
                if (mat != null) left.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }

            // Right segment
            float rightWidth = leftWidth;
            if (rightWidth > 0.1f)
            {
                GameObject right = GameObject.CreatePrimitive(PrimitiveType.Cube);
                right.name = "Segment_Right";
                right.transform.SetParent(doorwayContainer.transform);
                
                if (isNorthSouth)
                {
                    right.transform.localPosition = new Vector3(wallLength / 2f - rightWidth / 2f, wallHeight / 2f, zPos);
                    right.transform.localScale = new Vector3(rightWidth, wallHeight, thickness);
                }
                else
                {
                    right.transform.localPosition = new Vector3(xPos, wallHeight / 2f, wallLength / 2f - rightWidth / 2f);
                    right.transform.localScale = new Vector3(thickness, wallHeight, rightWidth);
                }
                
                right.isStatic = true;
                if (mat != null) right.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }

            // Top segment (above door)
            float topHeight = wallHeight - doorSize.y;
            if (topHeight > 0.1f)
            {
                GameObject top = GameObject.CreatePrimitive(PrimitiveType.Cube);
                top.name = "Segment_Top";
                top.transform.SetParent(doorwayContainer.transform);
                
                if (isNorthSouth)
                {
                    top.transform.localPosition = new Vector3(0, doorSize.y + topHeight / 2f, zPos);
                    top.transform.localScale = new Vector3(doorSize.x, topHeight, thickness);
                }
                else
                {
                    top.transform.localPosition = new Vector3(xPos, doorSize.y + topHeight / 2f, 0);
                    top.transform.localScale = new Vector3(thickness, topHeight, doorSize.x);
                }
                
                top.isStatic = true;
                if (mat != null) top.GetComponent<MeshRenderer>().sharedMaterial = mat;
            }
        }

        /// <summary>
        /// Creates default dark materials for the labyrinth.
        /// </summary>
        public static (Material floor, Material wall, Material ceiling) CreateDefaultMaterials()
        {
            var floor = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            floor.color = new Color(0.15f, 0.15f, 0.2f);
            floor.name = "M_Floor_Runtime";

            var wall = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            wall.color = new Color(0.1f, 0.1f, 0.15f);
            wall.name = "M_Wall_Runtime";

            var ceiling = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            ceiling.color = new Color(0.05f, 0.05f, 0.1f);
            ceiling.name = "M_Ceiling_Runtime";

            return (floor, wall, ceiling);
        }

        #region Legacy Single-Doorway Support

        /// <summary>
        /// Creates a complete room with floor, walls, and ceiling using basic primitives.
        /// No ProBuilder required - works at runtime.
        /// </summary>
        public static GameObject CreateRoom(
            string roomName,
            Vector3 size,
            Vector3 position,
            Material floorMat = null,
            Material wallMat = null,
            Material ceilingMat = null)
        {
            return CreateRoomWithDoorways(roomName, size, position, System.Array.Empty<WallSide>(),
                DEFAULT_DOOR_SIZE, floorMat, wallMat, ceilingMat);
        }

        /// <summary>
        /// Creates a room with a doorway on the specified wall.
        /// Legacy method - prefer CreateRoomWithDoorways for multi-doorway rooms.
        /// </summary>
        public static GameObject CreateRoomWithDoorway(
            string roomName,
            Vector3 size,
            Vector3 position,
            WallSide doorWall,
            Vector2 doorSize,
            Material floorMat = null,
            Material wallMat = null,
            Material ceilingMat = null)
        {
            return CreateRoomWithDoorways(roomName, size, position, new[] { doorWall },
                doorSize, floorMat, wallMat, ceilingMat);
        }

        #endregion
    }

    #region Build Configuration

    /// <summary>
    /// Configuration for labyrinth generation from ASCII maps.
    /// </summary>
    [System.Serializable]
    public class LabyrinthBuildConfig
    {
        /// <summary>Default state that unlocks gates</summary>
        public CristalState DefaultGateUnlockState = CristalState.Remembering;

        /// <summary>Whether gates should open during UNBOUND ritual</summary>
        public bool GatesOpenOnUnbound = true;

        /// <summary>Use custom materials instead of defaults</summary>
        public bool UseMaterials = false;

        public Material FloorMaterial;
        public Material WallMaterial;
        public Material CeilingMaterial;

        /// <summary>Ambient light color for generated rooms</summary>
        public Color AmbientLight = new Color(0.1f, 0.05f, 0.15f);

        /// <summary>Whether to add fog triggers to rooms</summary>
        public bool EnableFog = true;
    }

    /// <summary>
    /// Result from BuildLabyrinthFromMap containing all generated objects.
    /// </summary>
    public class LabyrinthBuildResult
    {
        /// <summary>Root GameObject containing all labyrinth geometry</summary>
        public GameObject Root;

        /// <summary>All room GameObjects</summary>
        public List<GameObject> Rooms;

        /// <summary>All SymbolicGate components</summary>
        public List<SymbolicGate> Gates;

        /// <summary>Console spawn points</summary>
        public List<GameObject> Consoles;

        /// <summary>Grid dimensions</summary>
        public int MapWidth;
        public int MapHeight;

        /// <summary>
        /// Get a room by grid coordinates.
        /// </summary>
        public GameObject GetRoom(int row, int col)
        {
            string targetId = $"Room_{row}_{col}";
            return Rooms?.Find(r => r.name == targetId);
        }

        /// <summary>
        /// Configure all gates to unlock at a specific state.
        /// </summary>
        public void SetAllGatesUnlockState(CristalState state)
        {
            foreach (var gate in Gates)
            {
                if (gate != null)
                {
                    gate.Configure(gate.Direction, state, gate.OpenOnUnboundTriggered);
                }
            }
        }

        /// <summary>
        /// Destroy all generated content.
        /// </summary>
        public void Cleanup()
        {
            if (Root != null)
            {
                Object.Destroy(Root);
            }
            Rooms?.Clear();
            Gates?.Clear();
            Consoles?.Clear();
        }
    }

    #endregion
}

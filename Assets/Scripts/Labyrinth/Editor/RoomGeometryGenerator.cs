#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEngine.ProBuilder;
using UnityEngine.ProBuilder.MeshOperations;
using System.Collections.Generic;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// ProBuilder-based room geometry generator.
    /// Creates rooms programmatically with walls, floor, ceiling, and gate openings.
    /// </summary>
    public static class RoomGeometryGenerator
    {
        private const string GENERATED_ROOMS_PATH = "Assets/Prefabs/Labyrinth/Environment/Rooms";

        /// <summary>
        /// Generate a complete room from RoomData.
        /// </summary>
        public static GameObject GenerateRoom(RoomData roomData, Transform parent = null)
        {
            if (roomData == null)
            {
                Debug.LogError("[RoomGeometryGenerator] RoomData is null!");
                return null;
            }

            // Create root object
            GameObject roomRoot = new GameObject($"Room_{roomData.roomId}");
            if (parent != null)
            {
                roomRoot.transform.SetParent(parent);
            }

            // Create geometry container
            GameObject geometry = new GameObject("Geometry");
            geometry.transform.SetParent(roomRoot.transform);
            geometry.transform.localPosition = Vector3.zero;

            // Generate components
            GenerateFloor(roomData, geometry.transform);
            GenerateCeiling(roomData, geometry.transform);
            GenerateWalls(roomData, geometry.transform);

            // Add room trigger bounds
            AddRoomTrigger(roomData, roomRoot);

            // Add SymbolicRoom component
            var symbolicRoom = roomRoot.AddComponent<SymbolicRoom>();
            SetupSymbolicRoom(symbolicRoom, roomData);

            // Mark as static for optimization
            SetStaticRecursive(geometry);

            Debug.Log($"[RoomGeometryGenerator] Generated room: {roomData.roomId}");
            return roomRoot;
        }

        #region Floor & Ceiling

        private static void GenerateFloor(RoomData data, Transform parent)
        {
            var floor = ShapeGenerator.GeneratePlane(
                PivotLocation.Center,
                data.size.x,
                data.size.z,
                1, 1,
                Axis.Up
            );

            floor.gameObject.name = "Floor";
            floor.transform.SetParent(parent);
            floor.transform.localPosition = Vector3.zero;

            // Apply material
            if (data.floorMaterial != null)
            {
                floor.GetComponent<MeshRenderer>().sharedMaterial = data.floorMaterial;
            }

            // Add collider
            floor.gameObject.AddComponent<MeshCollider>();
        }

        private static void GenerateCeiling(RoomData data, Transform parent)
        {
            var ceiling = ShapeGenerator.GeneratePlane(
                PivotLocation.Center,
                data.size.x,
                data.size.z,
                1, 1,
                Axis.Down // Facing down
            );

            ceiling.gameObject.name = "Ceiling";
            ceiling.transform.SetParent(parent);
            ceiling.transform.localPosition = new Vector3(0, data.size.y, 0);

            // Apply material
            if (data.ceilingMaterial != null)
            {
                ceiling.GetComponent<MeshRenderer>().sharedMaterial = data.ceilingMaterial;
            }
        }

        #endregion

        #region Walls

        private static void GenerateWalls(RoomData data, Transform parent)
        {
            // Create walls container
            GameObject wallsContainer = new GameObject("Walls");
            wallsContainer.transform.SetParent(parent);
            wallsContainer.transform.localPosition = Vector3.zero;

            // Generate each wall
            GenerateWall(data, WallSide.North, wallsContainer.transform);
            GenerateWall(data, WallSide.South, wallsContainer.transform);
            GenerateWall(data, WallSide.East, wallsContainer.transform);
            GenerateWall(data, WallSide.West, wallsContainer.transform);
        }

        private static void GenerateWall(RoomData data, WallSide side, Transform parent)
        {
            // Find gates on this wall
            List<GateDefinition> gatesOnWall = new List<GateDefinition>();
            if (data.gates != null)
            {
                foreach (var gate in data.gates)
                {
                    if (gate.wall == side)
                    {
                        gatesOnWall.Add(gate);
                    }
                }
            }

            // Calculate wall dimensions based on side
            float wallWidth, wallHeight, posX, posZ;
            float rotY;

            switch (side)
            {
                case WallSide.North:
                    wallWidth = data.size.x;
                    wallHeight = data.size.y;
                    posX = 0;
                    posZ = data.size.z / 2f;
                    rotY = 0;
                    break;
                case WallSide.South:
                    wallWidth = data.size.x;
                    wallHeight = data.size.y;
                    posX = 0;
                    posZ = -data.size.z / 2f;
                    rotY = 180;
                    break;
                case WallSide.East:
                    wallWidth = data.size.z;
                    wallHeight = data.size.y;
                    posX = data.size.x / 2f;
                    posZ = 0;
                    rotY = 90;
                    break;
                case WallSide.West:
                    wallWidth = data.size.z;
                    wallHeight = data.size.y;
                    posX = -data.size.x / 2f;
                    posZ = 0;
                    rotY = -90;
                    break;
                default:
                    return;
            }

            if (gatesOnWall.Count == 0)
            {
                // Simple solid wall
                CreateSolidWall(data, side.ToString(), wallWidth, wallHeight, 
                    new Vector3(posX, wallHeight / 2f, posZ), rotY, parent);
            }
            else
            {
                // Wall with gate openings
                CreateWallWithGates(data, side.ToString(), wallWidth, wallHeight,
                    new Vector3(posX, 0, posZ), rotY, gatesOnWall, parent);
            }
        }

        private static void CreateSolidWall(RoomData data, string name, float width, float height,
            Vector3 position, float rotationY, Transform parent)
        {
            var wall = ShapeGenerator.GeneratePlane(
                PivotLocation.Center,
                width,
                height,
                1, 1,
                Axis.Forward
            );

            wall.gameObject.name = $"Wall_{name}";
            wall.transform.SetParent(parent);
            wall.transform.localPosition = position;
            wall.transform.localRotation = Quaternion.Euler(0, rotationY, 0);

            // Apply material
            if (data.wallMaterial != null)
            {
                wall.GetComponent<MeshRenderer>().sharedMaterial = data.wallMaterial;
            }

            // Add collider
            wall.gameObject.AddComponent<MeshCollider>();
        }

        private static void CreateWallWithGates(RoomData data, string name, float wallWidth, float wallHeight,
            Vector3 basePosition, float rotationY, List<GateDefinition> gates, Transform parent)
        {
            // Create wall container
            GameObject wallContainer = new GameObject($"Wall_{name}");
            wallContainer.transform.SetParent(parent);
            wallContainer.transform.localPosition = basePosition;
            wallContainer.transform.localRotation = Quaternion.Euler(0, rotationY, 0);

            // Sort gates by position
            gates.Sort((a, b) => a.offsetAlongWall.CompareTo(b.offsetAlongWall));

            // For each gate, create wall segments around it
            foreach (var gate in gates)
            {
                float gateCenter = gate.offsetAlongWall * (wallWidth / 2f - gate.gateSize.x / 2f);
                float gateLeft = gateCenter - gate.gateSize.x / 2f;
                float gateRight = gateCenter + gate.gateSize.x / 2f;
                float gateTop = gate.gateSize.y;

                // Left segment
                float leftWidth = (wallWidth / 2f) + gateLeft;
                if (leftWidth > 0.1f)
                {
                    CreateWallSegment(data, "Left", leftWidth, wallHeight,
                        new Vector3(-wallWidth / 2f + leftWidth / 2f, wallHeight / 2f, 0),
                        wallContainer.transform);
                }

                // Right segment
                float rightWidth = (wallWidth / 2f) - gateRight;
                if (rightWidth > 0.1f)
                {
                    CreateWallSegment(data, "Right", rightWidth, wallHeight,
                        new Vector3(wallWidth / 2f - rightWidth / 2f, wallHeight / 2f, 0),
                        wallContainer.transform);
                }

                // Top segment (above gate)
                float topHeight = wallHeight - gateTop;
                if (topHeight > 0.1f)
                {
                    CreateWallSegment(data, "Top", gate.gateSize.x, topHeight,
                        new Vector3(gateCenter, gateTop + topHeight / 2f, 0),
                        wallContainer.transform);
                }

                // Create gate frame/trigger
                CreateGateFrame(gate, gateCenter, wallContainer.transform);
            }
        }

        private static void CreateWallSegment(RoomData data, string name, float width, float height,
            Vector3 localPosition, Transform parent)
        {
            var segment = ShapeGenerator.GeneratePlane(
                PivotLocation.Center,
                width,
                height,
                1, 1,
                Axis.Forward
            );

            segment.gameObject.name = $"Segment_{name}";
            segment.transform.SetParent(parent);
            segment.transform.localPosition = localPosition;
            segment.transform.localRotation = Quaternion.identity;

            if (data.wallMaterial != null)
            {
                segment.GetComponent<MeshRenderer>().sharedMaterial = data.wallMaterial;
            }

            segment.gameObject.AddComponent<MeshCollider>();
        }

        private static void CreateGateFrame(GateDefinition gate, float centerX, Transform parent)
        {
            GameObject gateObj = new GameObject($"Gate_{gate.gateId}");
            gateObj.transform.SetParent(parent);
            gateObj.transform.localPosition = new Vector3(centerX, gate.gateSize.y / 2f, 0);

            // Add SymbolicGate component
            var symbolicGate = gateObj.AddComponent<SymbolicGate>();
            // Configuration would be done via SerializedObject in a more complete implementation

            // Add trigger collider for gate interaction
            var trigger = gateObj.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.size = new Vector3(gate.gateSize.x, gate.gateSize.y, 1f);
        }

        #endregion

        #region Room Setup

        private static void AddRoomTrigger(RoomData data, GameObject roomRoot)
        {
            // Create trigger volume for room detection
            GameObject triggerObj = new GameObject("RoomTrigger");
            triggerObj.transform.SetParent(roomRoot.transform);
            triggerObj.transform.localPosition = new Vector3(0, data.size.y / 2f, 0);

            var trigger = triggerObj.AddComponent<BoxCollider>();
            trigger.isTrigger = true;
            trigger.size = data.size * 0.95f; // Slightly smaller than room
        }

        private static void SetupSymbolicRoom(SymbolicRoom room, RoomData data)
        {
            // Use SerializedObject to set private serialized fields
            var so = new SerializedObject(room);

            so.FindProperty("_roomState").intValue = (int)data.associatedState;
            so.FindProperty("_roomName").stringValue = data.displayName;
            so.FindProperty("_roomDescription").stringValue = data.description;
            so.FindProperty("_ambientColor").colorValue = data.ambientColor;
            so.FindProperty("_ambientIntensity").floatValue = data.lightIntensity;
            so.FindProperty("_fogColor").colorValue = data.fogColor;
            so.FindProperty("_fogDensity").floatValue = data.fogDensity;

            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetStaticRecursive(GameObject obj)
        {
            obj.isStatic = true;
            foreach (Transform child in obj.transform)
            {
                SetStaticRecursive(child.gameObject);
            }
        }

        #endregion

        #region Save as Prefab

        public static void SaveRoomAsPrefab(GameObject roomObject, string prefabName)
        {
            // Ensure directory exists
            if (!AssetDatabase.IsValidFolder(GENERATED_ROOMS_PATH))
            {
                AssetDatabase.CreateFolder("Assets/Prefabs/Labyrinth/Environment", "Rooms");
            }

            string prefabPath = $"{GENERATED_ROOMS_PATH}/{prefabName}.prefab";

            // Save prefab
            PrefabUtility.SaveAsPrefabAsset(roomObject, prefabPath);
            Debug.Log($"[RoomGeometryGenerator] Saved prefab: {prefabPath}");
        }

        #endregion
    }
}
#endif

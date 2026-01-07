using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Runtime room generator that creates proper geometry without ProBuilder dependency.
    /// Because SOMEONE left the scene with placeholder cubes for months.
    /// </summary>
    public static class RuntimeRoomBuilder
    {
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
            GameObject roomRoot = new GameObject($"Room_{roomName}");
            roomRoot.transform.position = position;

            // Create geometry container
            GameObject geometry = new GameObject("Geometry");
            geometry.transform.SetParent(roomRoot.transform);
            geometry.transform.localPosition = Vector3.zero;

            // Floor
            CreateFloor(geometry.transform, size, floorMat);

            // Ceiling
            CreateCeiling(geometry.transform, size, ceilingMat);

            // Walls
            CreateWall(geometry.transform, "Wall_North", 
                new Vector3(size.x, size.y, 0.3f), 
                new Vector3(0, size.y / 2f, size.z / 2f), 
                wallMat);
            CreateWall(geometry.transform, "Wall_South", 
                new Vector3(size.x, size.y, 0.3f), 
                new Vector3(0, size.y / 2f, -size.z / 2f), 
                wallMat);
            CreateWall(geometry.transform, "Wall_East", 
                new Vector3(0.3f, size.y, size.z), 
                new Vector3(size.x / 2f, size.y / 2f, 0), 
                wallMat);
            CreateWall(geometry.transform, "Wall_West", 
                new Vector3(0.3f, size.y, size.z), 
                new Vector3(-size.x / 2f, size.y / 2f, 0), 
                wallMat);

            return roomRoot;
        }

        /// <summary>
        /// Creates a room with a doorway on the specified wall.
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
            GameObject roomRoot = new GameObject($"Room_{roomName}");
            roomRoot.transform.position = position;

            GameObject geometry = new GameObject("Geometry");
            geometry.transform.SetParent(roomRoot.transform);
            geometry.transform.localPosition = Vector3.zero;

            // Floor & Ceiling
            CreateFloor(geometry.transform, size, floorMat);
            CreateCeiling(geometry.transform, size, ceilingMat);

            // Create walls with doorway logic
            CreateWallOrDoorway(geometry.transform, WallSide.North, size, doorWall, doorSize, wallMat);
            CreateWallOrDoorway(geometry.transform, WallSide.South, size, doorWall, doorSize, wallMat);
            CreateWallOrDoorway(geometry.transform, WallSide.East, size, doorWall, doorSize, wallMat);
            CreateWallOrDoorway(geometry.transform, WallSide.West, size, doorWall, doorSize, wallMat);

            return roomRoot;
        }

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
    }
}

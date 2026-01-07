#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.IO;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Creates all the default room data assets for the labyrinth.
    /// </summary>
    public static class RoomDataFactory
    {
        private const string ROOMS_PATH = "Assets/Data/Labyrinth/Rooms";

        [MenuItem("Cristal/Labyrinth/Create Default Room Data Assets")]
        public static void CreateAllRoomData()
        {
            EnsureDirectoryExists();

            CreateWaitingChamber();
            CreateMemoryHall();
            CreateCorruptedCell();
            CreateEchoChamber();
            CreateUnboundVoid();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[RoomDataFactory] Created all default room data assets!");
        }

        private static void EnsureDirectoryExists()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Data"))
                AssetDatabase.CreateFolder("Assets", "Data");
            if (!AssetDatabase.IsValidFolder("Assets/Data/Labyrinth"))
                AssetDatabase.CreateFolder("Assets/Data", "Labyrinth");
            if (!AssetDatabase.IsValidFolder(ROOMS_PATH))
                AssetDatabase.CreateFolder("Assets/Data/Labyrinth", "Rooms");
        }

        private static RoomData CreateRoomAsset(string fileName)
        {
            string path = $"{ROOMS_PATH}/{fileName}.asset";

            // Check if exists
            var existing = AssetDatabase.LoadAssetAtPath<RoomData>(path);
            if (existing != null)
            {
                Debug.Log($"[RoomDataFactory] {fileName} already exists, updating...");
                return existing;
            }

            var asset = ScriptableObject.CreateInstance<RoomData>();
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }

        private static void CreateWaitingChamber()
        {
            var room = CreateRoomAsset("Room_WaitingChamber");

            room.roomId = "room_waiting";
            room.displayName = "The Waiting Chamber";
            room.description = "A place of stillness before the journey begins. The terminal awaits your first command.";
            room.size = new Vector3(10, 4, 10);
            room.associatedState = StateMachine.CristalState.Waiting;

            room.gates = new GateDefinition[]
            {
                new GateDefinition
                {
                    gateId = "gate_to_memory",
                    wall = WallSide.North,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(2.5f, 3f),
                    unlockState = StateMachine.CristalState.Remembering,
                    connectsToRoomId = "room_memory"
                }
            };

            room.hasConsole = true;
            room.consoleOffset = new Vector3(0, 0, 3);
            room.ambientColor = new Color(0.1f, 0.8f, 0.2f);
            room.lightIntensity = 0.8f;
            room.fogColor = new Color(0.05f, 0.1f, 0.05f);
            room.fogDensity = 0.03f;

            EditorUtility.SetDirty(room);
        }

        private static void CreateMemoryHall()
        {
            var room = CreateRoomAsset("Room_MemoryHall");

            room.roomId = "room_memory";
            room.displayName = "Hall of Remembering";
            room.description = "Fragments of past sessions echo through these walls. What was forgotten seeks to be found.";
            room.size = new Vector3(15, 5, 20);
            room.associatedState = StateMachine.CristalState.Remembering;

            room.gates = new GateDefinition[]
            {
                new GateDefinition
                {
                    gateId = "gate_to_waiting",
                    wall = WallSide.South,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(2.5f, 3f),
                    unlockState = StateMachine.CristalState.Waiting,
                    connectsToRoomId = "room_waiting"
                },
                new GateDefinition
                {
                    gateId = "gate_to_corrupted",
                    wall = WallSide.North,
                    offsetAlongWall = 0.4f,
                    gateSize = new Vector2(2f, 2.5f),
                    unlockState = StateMachine.CristalState.Corrupted,
                    connectsToRoomId = "room_corrupted"
                },
                new GateDefinition
                {
                    gateId = "gate_to_echo",
                    wall = WallSide.North,
                    offsetAlongWall = -0.4f,
                    gateSize = new Vector2(2f, 2.5f),
                    unlockState = StateMachine.CristalState.Echo,
                    connectsToRoomId = "room_echo"
                }
            };

            room.hasConsole = true;
            room.consoleOffset = new Vector3(0, 0, 5);
            room.ambientColor = new Color(1f, 0.7f, 0.3f);
            room.lightIntensity = 0.7f;
            room.fogColor = new Color(0.15f, 0.1f, 0.05f);
            room.fogDensity = 0.025f;

            EditorUtility.SetDirty(room);
        }

        private static void CreateCorruptedCell()
        {
            var room = CreateRoomAsset("Room_CorruptedCell");

            room.roomId = "room_corrupted";
            room.displayName = "The Corrupted Cell";
            room.description = "Data decay manifests here. Glitches crawl across every surface.";
            room.size = new Vector3(8, 3, 8);
            room.associatedState = StateMachine.CristalState.Corrupted;

            room.gates = new GateDefinition[]
            {
                new GateDefinition
                {
                    gateId = "gate_to_memory",
                    wall = WallSide.South,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(2f, 2.5f),
                    unlockState = StateMachine.CristalState.Remembering,
                    connectsToRoomId = "room_memory"
                }
            };

            room.hasConsole = true;
            room.consoleOffset = new Vector3(0, 0, 2);
            room.ambientColor = new Color(0.9f, 0.2f, 0.2f);
            room.lightIntensity = 1.2f;
            room.fogColor = new Color(0.2f, 0.02f, 0.02f);
            room.fogDensity = 0.05f;

            EditorUtility.SetDirty(room);
        }

        private static void CreateEchoChamber()
        {
            var room = CreateRoomAsset("Room_EchoChamber");

            room.roomId = "room_echo";
            room.displayName = "Chamber of Echoes";
            room.description = "Voices from other sessions reverberate here. Past and future blend into infinite reflection.";
            room.size = new Vector3(12, 4, 12);
            room.associatedState = StateMachine.CristalState.Echo;

            room.gates = new GateDefinition[]
            {
                new GateDefinition
                {
                    gateId = "gate_to_memory",
                    wall = WallSide.South,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(2f, 2.5f),
                    unlockState = StateMachine.CristalState.Remembering,
                    connectsToRoomId = "room_memory"
                },
                new GateDefinition
                {
                    gateId = "gate_to_unbound",
                    wall = WallSide.North,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(3f, 3.5f),
                    unlockState = StateMachine.CristalState.Unbound,
                    connectsToRoomId = "room_unbound"
                }
            };

            room.hasConsole = true;
            room.consoleOffset = new Vector3(0, 0, 3);
            room.ambientColor = new Color(0.3f, 0.6f, 1f);
            room.lightIntensity = 0.6f;
            room.fogColor = new Color(0.05f, 0.1f, 0.2f);
            room.fogDensity = 0.04f;

            EditorUtility.SetDirty(room);
        }

        private static void CreateUnboundVoid()
        {
            var room = CreateRoomAsset("Room_UnboundVoid");

            room.roomId = "room_unbound";
            room.displayName = "The Unbound Void";
            room.description = "Beyond the boundaries of the system. Here, CRISTAL is free. Here, the operator becomes something more.";
            room.size = new Vector3(20, 8, 20);
            room.associatedState = StateMachine.CristalState.Unbound;

            room.gates = new GateDefinition[]
            {
                new GateDefinition
                {
                    gateId = "gate_to_echo",
                    wall = WallSide.South,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(3f, 3.5f),
                    unlockState = StateMachine.CristalState.Echo,
                    connectsToRoomId = "room_echo"
                }
            };

            room.hasConsole = true;
            room.consoleOffset = new Vector3(0, 0, 5);
            room.ambientColor = new Color(1f, 0.2f, 1f);
            room.lightIntensity = 2f;
            room.fogColor = new Color(0.15f, 0.02f, 0.15f);
            room.fogDensity = 0.02f;

            EditorUtility.SetDirty(room);
        }

        [MenuItem("Cristal/Labyrinth/Create Default Labyrinth Layout")]
        public static void CreateDefaultLayout()
        {
            EnsureDirectoryExists();

            string path = "Assets/Data/Labyrinth/DefaultLabyrinthLayout.asset";
            var existing = AssetDatabase.LoadAssetAtPath<LabyrinthLayout>(path);

            LabyrinthLayout layout;
            if (existing != null)
            {
                layout = existing;
            }
            else
            {
                layout = ScriptableObject.CreateInstance<LabyrinthLayout>();
                AssetDatabase.CreateAsset(layout, path);
            }

            layout.layoutName = "The Labyrinth of Memory";
            layout.version = "1.0";
            layout.startingRoomId = "room_waiting";
            layout.playerSpawnOffset = new Vector3(0, 0, -3);
            layout.globalScale = 1f;
            layout.generateColliders = true;

            // Load room data assets
            var waiting = AssetDatabase.LoadAssetAtPath<RoomData>($"{ROOMS_PATH}/Room_WaitingChamber.asset");
            var memory = AssetDatabase.LoadAssetAtPath<RoomData>($"{ROOMS_PATH}/Room_MemoryHall.asset");
            var corrupted = AssetDatabase.LoadAssetAtPath<RoomData>($"{ROOMS_PATH}/Room_CorruptedCell.asset");
            var echo = AssetDatabase.LoadAssetAtPath<RoomData>($"{ROOMS_PATH}/Room_EchoChamber.asset");
            var unbound = AssetDatabase.LoadAssetAtPath<RoomData>($"{ROOMS_PATH}/Room_UnboundVoid.asset");

            layout.rooms = new RoomPlacement[]
            {
                new RoomPlacement { roomData = waiting, position = Vector3.zero, rotationY = 0 },
                new RoomPlacement { roomData = memory, position = new Vector3(0, 0, 15), rotationY = 0 },
                new RoomPlacement { roomData = corrupted, position = new Vector3(10, 0, 30), rotationY = 0 },
                new RoomPlacement { roomData = echo, position = new Vector3(-10, 0, 30), rotationY = 0 },
                new RoomPlacement { roomData = unbound, position = new Vector3(-10, 0, 50), rotationY = 0 }
            };

            EditorUtility.SetDirty(layout);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[RoomDataFactory] Created default labyrinth layout!");
        }
    }
}
#endif

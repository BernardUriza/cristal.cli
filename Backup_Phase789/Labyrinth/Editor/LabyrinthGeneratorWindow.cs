#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Editor window for generating labyrinth geometry.
    /// </summary>
    public class LabyrinthGeneratorWindow : EditorWindow
    {
        private LabyrinthLayout _layout;
        private RoomData _singleRoom;
        private bool _generateInScene = true;
        private bool _savePrefabs = true;

        private Vector2 _scrollPos;

        [MenuItem("Cristal/Labyrinth/Generator Window")]
        public static void ShowWindow()
        {
            var window = GetWindow<LabyrinthGeneratorWindow>("Labyrinth Generator");
            window.minSize = new Vector2(400, 500);
        }

        private void OnGUI()
        {
            _scrollPos = EditorGUILayout.BeginScrollView(_scrollPos);

            GUILayout.Label("Labyrinth Generator", EditorStyles.boldLabel);
            GUILayout.Space(10);

            DrawLayoutSection();
            GUILayout.Space(20);
            DrawSingleRoomSection();
            GUILayout.Space(20);
            DrawQuickGenerateSection();

            EditorGUILayout.EndScrollView();
        }

        #region Layout Generation

        private void DrawLayoutSection()
        {
            EditorGUILayout.LabelField("Full Layout Generation", EditorStyles.boldLabel);
            EditorGUI.indentLevel++;

            _layout = (LabyrinthLayout)EditorGUILayout.ObjectField(
                "Layout Asset", _layout, typeof(LabyrinthLayout), false);

            EditorGUI.indentLevel--;

            EditorGUI.BeginDisabledGroup(_layout == null);
            if (GUILayout.Button("Generate Full Labyrinth", GUILayout.Height(30)))
            {
                GenerateFullLabyrinth();
            }
            EditorGUI.EndDisabledGroup();
        }

        private void GenerateFullLabyrinth()
        {
            if (_layout == null || _layout.rooms == null) return;

            // Create labyrinth root
            GameObject labyrinthRoot = new GameObject($"Labyrinth_{_layout.layoutName}");

            foreach (var roomPlacement in _layout.rooms)
            {
                if (roomPlacement.roomData == null) continue;

                var roomObj = RoomGeometryGenerator.GenerateRoom(roomPlacement.roomData, labyrinthRoot.transform);
                if (roomObj != null)
                {
                    roomObj.transform.localPosition = roomPlacement.position;
                    roomObj.transform.localRotation = Quaternion.Euler(0, roomPlacement.rotationY, 0);

                    if (_savePrefabs)
                    {
                        RoomGeometryGenerator.SaveRoomAsPrefab(roomObj, roomPlacement.roomData.roomId);
                    }
                }
            }

            Selection.activeGameObject = labyrinthRoot;
            Debug.Log($"[LabyrinthGenerator] Generated {_layout.rooms.Length} rooms");
        }

        #endregion

        #region Single Room Generation

        private void DrawSingleRoomSection()
        {
            EditorGUILayout.LabelField("Single Room Generation", EditorStyles.boldLabel);
            EditorGUI.indentLevel++;

            _singleRoom = (RoomData)EditorGUILayout.ObjectField(
                "Room Data", _singleRoom, typeof(RoomData), false);

            _generateInScene = EditorGUILayout.Toggle("Generate in Scene", _generateInScene);
            _savePrefabs = EditorGUILayout.Toggle("Save as Prefab", _savePrefabs);

            EditorGUI.indentLevel--;

            EditorGUI.BeginDisabledGroup(_singleRoom == null);
            if (GUILayout.Button("Generate Room", GUILayout.Height(30)))
            {
                GenerateSingleRoom();
            }
            EditorGUI.EndDisabledGroup();
        }

        private void GenerateSingleRoom()
        {
            if (_singleRoom == null) return;

            var roomObj = RoomGeometryGenerator.GenerateRoom(_singleRoom, null);
            
            if (roomObj != null && _savePrefabs)
            {
                RoomGeometryGenerator.SaveRoomAsPrefab(roomObj, _singleRoom.roomId);
            }

            Selection.activeGameObject = roomObj;
        }

        #endregion

        #region Quick Generate

        private void DrawQuickGenerateSection()
        {
            EditorGUILayout.LabelField("Quick Generate (No Data Assets)", EditorStyles.boldLabel);
            GUILayout.Space(5);

            if (GUILayout.Button("Create Waiting Chamber (10x4x10)", GUILayout.Height(25)))
            {
                QuickGenerateRoom("room_waiting", "The Waiting Chamber",
                    new Vector3(10, 4, 10), StateMachine.CristalState.Waiting,
                    new Color(0.1f, 0.8f, 0.2f));
            }

            if (GUILayout.Button("Create Memory Hall (15x5x20)", GUILayout.Height(25)))
            {
                QuickGenerateRoom("room_memory", "Hall of Remembering",
                    new Vector3(15, 5, 20), StateMachine.CristalState.Remembering,
                    new Color(1f, 0.7f, 0.3f));
            }

            if (GUILayout.Button("Create Corruption Cell (8x3x8)", GUILayout.Height(25)))
            {
                QuickGenerateRoom("room_corrupted", "The Corrupted Cell",
                    new Vector3(8, 3, 8), StateMachine.CristalState.Corrupted,
                    new Color(0.9f, 0.2f, 0.2f));
            }

            if (GUILayout.Button("Create Echo Chamber (12x4x12)", GUILayout.Height(25)))
            {
                QuickGenerateRoom("room_echo", "Chamber of Echoes",
                    new Vector3(12, 4, 12), StateMachine.CristalState.Echo,
                    new Color(0.3f, 0.6f, 1f));
            }

            if (GUILayout.Button("Create Unbound Void (20x8x20)", GUILayout.Height(25)))
            {
                QuickGenerateRoom("room_unbound", "The Unbound Void",
                    new Vector3(20, 8, 20), StateMachine.CristalState.UNBOUND,
                    new Color(1f, 0.2f, 1f));
            }

            GUILayout.Space(10);

            if (GUILayout.Button("Create Test Corridor (5x3x15)", GUILayout.Height(25)))
            {
                QuickGenerateRoom("corridor_test", "Test Corridor",
                    new Vector3(5, 3, 15), StateMachine.CristalState.Waiting,
                    new Color(0.3f, 0.3f, 0.3f));
            }
        }

        private void QuickGenerateRoom(string id, string name, Vector3 size, 
            StateMachine.CristalState state, Color ambientColor)
        {
            // Create temporary RoomData
            var tempData = ScriptableObject.CreateInstance<RoomData>();
            tempData.roomId = id;
            tempData.displayName = name;
            tempData.size = size;
            tempData.associatedState = state;
            tempData.ambientColor = ambientColor;
            tempData.hasConsole = true;
            tempData.consoleOffset = new Vector3(0, 0, size.z * 0.3f);

            // Load or create materials
            tempData.floorMaterial = LoadOrCreateMaterial("M_ProBuilder_Floor", new Color(0.2f, 0.2f, 0.25f));
            tempData.wallMaterial = LoadOrCreateMaterial("M_ProBuilder_Wall", new Color(0.15f, 0.15f, 0.2f));
            tempData.ceilingMaterial = LoadOrCreateMaterial("M_ProBuilder_Ceiling", new Color(0.1f, 0.1f, 0.15f));

            // Add a gate on north wall
            tempData.gates = new GateDefinition[]
            {
                new GateDefinition
                {
                    gateId = $"{id}_gate_north",
                    wall = WallSide.North,
                    offsetAlongWall = 0,
                    gateSize = new Vector2(2.5f, 3f),
                    unlockState = state
                }
            };

            var roomObj = RoomGeometryGenerator.GenerateRoom(tempData, null);
            Selection.activeGameObject = roomObj;

            // Cleanup temp asset
            DestroyImmediate(tempData);
        }

        private Material LoadOrCreateMaterial(string name, Color color)
        {
            string path = $"Assets/Materials/Labyrinth/{name}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);

            if (mat == null)
            {
                // Create new material
                mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                mat.color = color;

                // Ensure directory exists
                if (!AssetDatabase.IsValidFolder("Assets/Materials"))
                {
                    AssetDatabase.CreateFolder("Assets", "Materials");
                }
                if (!AssetDatabase.IsValidFolder("Assets/Materials/Labyrinth"))
                {
                    AssetDatabase.CreateFolder("Assets/Materials", "Labyrinth");
                }

                AssetDatabase.CreateAsset(mat, path);
                AssetDatabase.SaveAssets();
            }

            return mat;
        }

        #endregion
    }
}
#endif

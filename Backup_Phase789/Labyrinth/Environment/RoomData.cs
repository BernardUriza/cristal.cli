using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Data definition for a room in the labyrinth.
    /// Used by the procedural generator.
    /// </summary>
    [CreateAssetMenu(fileName = "RoomData", menuName = "Cristal/Labyrinth/Room Data")]
    public class RoomData : ScriptableObject
    {
        [Header("Identity")]
        public string roomId = "room_01";
        public string displayName = "The Waiting Chamber";
        [TextArea(2, 4)]
        public string description = "A place of stillness before the journey begins.";

        [Header("Dimensions")]
        public Vector3 size = new Vector3(10f, 4f, 10f); // Width, Height, Depth
        public float wallThickness = 0.3f;

        [Header("State Association")]
        public StateMachine.CristalState associatedState = StateMachine.CristalState.Waiting;

        [Header("Gates")]
        public GateDefinition[] gates;

        [Header("Console Placement")]
        public bool hasConsole = true;
        public Vector3 consoleOffset = new Vector3(0, 0, 3f);
        public float consoleRotationY = 0f;

        [Header("Atmosphere")]
        public Color ambientColor = new Color(0.1f, 0.8f, 0.2f);
        public float lightIntensity = 0.8f;
        public Color fogColor = new Color(0.05f, 0.1f, 0.05f);
        public float fogDensity = 0.03f;

        [Header("Visual Style")]
        public Material floorMaterial;
        public Material wallMaterial;
        public Material ceilingMaterial;
    }

    /// <summary>
    /// Definition of a gate/doorway in a room.
    /// </summary>
    [System.Serializable]
    public class GateDefinition
    {
        public string gateId = "gate_01";
        public WallSide wall = WallSide.North;
        public float offsetAlongWall = 0f; // -1 to 1, centered at 0
        public Vector2 gateSize = new Vector2(2f, 3f); // Width, Height
        public StateMachine.CristalState unlockState = StateMachine.CristalState.Waiting;
        public string connectsToRoomId = "";
    }

    /// <summary>
    /// Which wall the gate is on.
    /// </summary>
    public enum WallSide
    {
        North,  // +Z
        South,  // -Z
        East,   // +X
        West    // -X
    }
}

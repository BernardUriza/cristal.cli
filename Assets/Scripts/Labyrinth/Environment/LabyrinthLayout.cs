using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Data definition for the entire labyrinth layout.
    /// </summary>
    [CreateAssetMenu(fileName = "LabyrinthLayout", menuName = "Cristal/Labyrinth/Layout")]
    public class LabyrinthLayout : ScriptableObject
    {
        [Header("Layout Info")]
        public string layoutName = "The Labyrinth of Memory";
        public string version = "1.0";

        [Header("Rooms")]
        public RoomPlacement[] rooms;

        [Header("Starting Point")]
        public string startingRoomId = "room_waiting";
        public Vector3 playerSpawnOffset = new Vector3(0, 0, -3f);

        [Header("Global Settings")]
        public float globalScale = 1f;
        public bool generateColliders = true;
        public bool generateNavMesh = false;
    }

    /// <summary>
    /// Placement of a room in the labyrinth.
    /// </summary>
    [System.Serializable]
    public class RoomPlacement
    {
        public RoomData roomData;
        public Vector3 position = Vector3.zero;
        public float rotationY = 0f;
    }
}

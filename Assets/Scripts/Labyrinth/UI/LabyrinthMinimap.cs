using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Minimap component that provides an overhead view of the labyrinth.
    /// Shows room layout, player position, gate states, and explored areas.
    /// </summary>
    public class LabyrinthMinimap : MonoBehaviour
    {
        [Header("Render Setup")]
        [SerializeField] private RenderTexture _minimapTexture;
        [SerializeField] private Camera _minimapCamera;
        [SerializeField] private RawImage _minimapDisplay;
        [SerializeField] private int _textureSize = 256;

        [Header("Camera")]
        [SerializeField] private float _cameraHeight = 50f;
        [SerializeField] private float _orthoSize = 30f;
        [SerializeField] private bool _followPlayer = true;
        [SerializeField] private Transform _playerTransform;

        [Header("Culling")]
        [SerializeField] private LayerMask _minimapLayers;
        [SerializeField] private string _minimapLayerName = "Minimap";

        [Header("Visual")]
        [SerializeField] private Color _backgroundColor = new Color(0.05f, 0.05f, 0.1f, 0.9f);
        [SerializeField] private Sprite _playerIcon;
        [SerializeField] private Sprite _gateOpenIcon;
        [SerializeField] private Sprite _gateClosedIcon;
        [SerializeField] private Sprite _consoleIcon;

        [Header("Markers")]
        [SerializeField] private Transform _playerMarker;
        [SerializeField] private float _markerRotationOffset = 0f;

        [Header("Fog of War")]
        [SerializeField] private bool _enableFogOfWar = true;
        [SerializeField] private float _revealRadius = 15f;
        [SerializeField] private Material _fogMaterial;

        // Internal state
        private HashSet<Vector2Int> _exploredCells = new HashSet<Vector2Int>();
        private Dictionary<SymbolicGate, Image> _gateMarkers = new Dictionary<SymbolicGate, Image>();
        private LabyrinthBuildResult _labyrinthData;
        private float _cellSize = 10f;
        private RectTransform _markersContainer;
        private bool _initialized;

        #region Unity Lifecycle

        private void Awake()
        {
            Initialize();
        }

        private void LateUpdate()
        {
            if (!_initialized) return;

            UpdateCameraPosition();
            UpdatePlayerMarker();
            UpdateFogOfWar();
        }

        private void OnDestroy()
        {
            Cleanup();
        }

        #endregion

        #region Initialization

        /// <summary>
        /// Initialize the minimap with default settings.
        /// </summary>
        public void Initialize()
        {
            if (_initialized) return;

            // Create render texture if not assigned
            if (_minimapTexture == null)
            {
                _minimapTexture = new RenderTexture(_textureSize, _textureSize, 16)
                {
                    name = "MinimapRT",
                    filterMode = FilterMode.Bilinear
                };
            }

            // Create or configure camera
            if (_minimapCamera == null)
            {
                CreateMinimapCamera();
            }
            else
            {
                ConfigureCamera(_minimapCamera);
            }

            // Connect to display
            if (_minimapDisplay != null)
            {
                _minimapDisplay.texture = _minimapTexture;
            }

            // Find player if not assigned
            if (_playerTransform == null)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null)
                {
                    _playerTransform = player.transform;
                }
            }

            _initialized = true;
            Debug.Log("[LabyrinthMinimap] Initialized");
        }

        /// <summary>
        /// Initialize minimap with labyrinth data from BuildLabyrinthFromMap.
        /// </summary>
        public void InitializeWithLabyrinth(LabyrinthBuildResult labyrinthData, float cellSize = 10f)
        {
            Initialize();

            _labyrinthData = labyrinthData;
            _cellSize = cellSize;

            // Calculate optimal camera size based on labyrinth dimensions
            float labyrinthWidth = labyrinthData.MapWidth * cellSize;
            float labyrinthHeight = labyrinthData.MapHeight * cellSize;
            _orthoSize = Mathf.Max(labyrinthWidth, labyrinthHeight) * 0.6f;

            // Create gate markers
            CreateGateMarkers();

            Debug.Log($"[LabyrinthMinimap] Configured for {labyrinthData.MapWidth}x{labyrinthData.MapHeight} labyrinth");
        }

        private void CreateMinimapCamera()
        {
            var camObj = new GameObject("MinimapCamera");
            camObj.transform.SetParent(transform);
            _minimapCamera = camObj.AddComponent<Camera>();
            ConfigureCamera(_minimapCamera);
        }

        private void ConfigureCamera(Camera cam)
        {
            cam.orthographic = true;
            cam.orthographicSize = _orthoSize;
            cam.nearClipPlane = 0.1f;
            cam.farClipPlane = 100f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = _backgroundColor;
            cam.targetTexture = _minimapTexture;
            cam.cullingMask = _minimapLayers;

            // Position camera above the center
            cam.transform.position = new Vector3(0, _cameraHeight, 0);
            cam.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
        }

        #endregion

        #region Camera Updates

        private void UpdateCameraPosition()
        {
            if (_minimapCamera == null) return;

            if (_followPlayer && _playerTransform != null)
            {
                Vector3 targetPos = _playerTransform.position;
                targetPos.y = _cameraHeight;
                _minimapCamera.transform.position = targetPos;
            }
        }

        private void UpdatePlayerMarker()
        {
            if (_playerMarker == null || _playerTransform == null) return;

            // Rotate marker to match player facing
            float yRotation = _playerTransform.eulerAngles.y + _markerRotationOffset;
            _playerMarker.localRotation = Quaternion.Euler(0, 0, -yRotation);
        }

        #endregion

        #region Fog of War

        private void UpdateFogOfWar()
        {
            if (!_enableFogOfWar || _playerTransform == null) return;

            // Calculate current cell
            Vector2Int currentCell = WorldToCell(_playerTransform.position);

            // Mark nearby cells as explored
            int radius = Mathf.CeilToInt(_revealRadius / _cellSize);
            for (int dx = -radius; dx <= radius; dx++)
            {
                for (int dz = -radius; dz <= radius; dz++)
                {
                    Vector2Int cell = new Vector2Int(currentCell.x + dx, currentCell.y + dz);
                    if (!_exploredCells.Contains(cell))
                    {
                        _exploredCells.Add(cell);
                        OnCellExplored(cell);
                    }
                }
            }
        }

        private Vector2Int WorldToCell(Vector3 worldPos)
        {
            return new Vector2Int(
                Mathf.FloorToInt(worldPos.x / _cellSize),
                Mathf.FloorToInt(-worldPos.z / _cellSize) // Negative Z because row increases going -Z
            );
        }

        private void OnCellExplored(Vector2Int cell)
        {
            // Could update fog shader, reveal room geometry, etc.
            // For now, just tracks explored state
        }

        /// <summary>
        /// Check if a cell has been explored by the player.
        /// </summary>
        public bool IsCellExplored(int row, int col)
        {
            return _exploredCells.Contains(new Vector2Int(col, row));
        }

        /// <summary>
        /// Mark all cells as explored (for debug or special events).
        /// </summary>
        public void RevealAll()
        {
            if (_labyrinthData == null) return;

            for (int row = 0; row < _labyrinthData.MapHeight; row++)
            {
                for (int col = 0; col < _labyrinthData.MapWidth; col++)
                {
                    _exploredCells.Add(new Vector2Int(col, row));
                }
            }

            Debug.Log("[LabyrinthMinimap] All cells revealed");
        }

        #endregion

        #region Gate Markers

        private void CreateGateMarkers()
        {
            if (_labyrinthData?.Gates == null) return;

            // Create container for UI markers
            if (_markersContainer == null && _minimapDisplay != null)
            {
                var containerObj = new GameObject("GateMarkers");
                _markersContainer = containerObj.AddComponent<RectTransform>();
                _markersContainer.SetParent(_minimapDisplay.rectTransform, false);
                _markersContainer.anchorMin = Vector2.zero;
                _markersContainer.anchorMax = Vector2.one;
                _markersContainer.sizeDelta = Vector2.zero;
            }

            foreach (var gate in _labyrinthData.Gates)
            {
                if (gate == null) continue;

                CreateGateMarker(gate);
                gate.OnGateOpened += OnGateOpened;
                gate.OnGateClosed += OnGateClosed;
            }
        }

        private void CreateGateMarker(SymbolicGate gate)
        {
            if (_markersContainer == null || _gateClosedIcon == null) return;

            var markerObj = new GameObject($"GateMarker_{gate.name}");
            markerObj.transform.SetParent(_markersContainer, false);

            var rectTransform = markerObj.AddComponent<RectTransform>();
            rectTransform.sizeDelta = new Vector2(16, 16);

            var image = markerObj.AddComponent<Image>();
            image.sprite = gate.IsOpen ? _gateOpenIcon : _gateClosedIcon;
            image.color = gate.IsOpen ? Color.green : Color.red;

            _gateMarkers[gate] = image;

            // Position will be updated in LateUpdate if following player
            UpdateGateMarkerPosition(gate, rectTransform);
        }

        private void UpdateGateMarkerPosition(SymbolicGate gate, RectTransform markerRect)
        {
            if (_minimapCamera == null || _minimapDisplay == null) return;

            // Convert world position to minimap UV
            Vector3 viewportPos = _minimapCamera.WorldToViewportPoint(gate.transform.position);
            
            // Convert to anchored position within the display
            Vector2 displaySize = _minimapDisplay.rectTransform.rect.size;
            markerRect.anchoredPosition = new Vector2(
                (viewportPos.x - 0.5f) * displaySize.x,
                (viewportPos.y - 0.5f) * displaySize.y
            );
        }

        private void OnGateOpened(SymbolicGate gate)
        {
            if (_gateMarkers.TryGetValue(gate, out var image))
            {
                image.sprite = _gateOpenIcon;
                image.color = Color.green;
            }
        }

        private void OnGateClosed(SymbolicGate gate)
        {
            if (_gateMarkers.TryGetValue(gate, out var image))
            {
                image.sprite = _gateClosedIcon;
                image.color = Color.red;
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Set the player reference for the minimap to follow.
        /// </summary>
        public void SetPlayer(Transform player)
        {
            _playerTransform = player;
        }

        /// <summary>
        /// Toggle whether the minimap follows the player.
        /// </summary>
        public void SetFollowPlayer(bool follow)
        {
            _followPlayer = follow;
        }

        /// <summary>
        /// Set the camera zoom level.
        /// </summary>
        public void SetZoom(float orthoSize)
        {
            _orthoSize = orthoSize;
            if (_minimapCamera != null)
            {
                _minimapCamera.orthographicSize = orthoSize;
            }
        }

        /// <summary>
        /// Center the minimap on a specific world position.
        /// </summary>
        public void CenterOn(Vector3 worldPosition)
        {
            if (_minimapCamera == null) return;

            _followPlayer = false;
            Vector3 camPos = worldPosition;
            camPos.y = _cameraHeight;
            _minimapCamera.transform.position = camPos;
        }

        /// <summary>
        /// Center on a specific room by grid coordinates.
        /// </summary>
        public void CenterOnRoom(int row, int col)
        {
            Vector3 worldPos = new Vector3(col * _cellSize, 0, -row * _cellSize);
            CenterOn(worldPos);
        }

        #endregion

        #region Cleanup

        private void Cleanup()
        {
            // Unsubscribe from gate events
            foreach (var kvp in _gateMarkers)
            {
                if (kvp.Key != null)
                {
                    kvp.Key.OnGateOpened -= OnGateOpened;
                    kvp.Key.OnGateClosed -= OnGateClosed;
                }
            }
            _gateMarkers.Clear();

            // Cleanup render texture
            if (_minimapTexture != null)
            {
                _minimapTexture.Release();
            }
        }

        #endregion

        #region Debug

        private void OnDrawGizmosSelected()
        {
            if (_minimapCamera == null) return;

            // Draw camera frustum
            Gizmos.color = Color.cyan;
            Matrix4x4 oldMatrix = Gizmos.matrix;
            Gizmos.matrix = _minimapCamera.transform.localToWorldMatrix;
            Gizmos.DrawFrustum(Vector3.zero, _minimapCamera.fieldOfView, 
                _minimapCamera.farClipPlane, _minimapCamera.nearClipPlane, 
                _minimapCamera.aspect);
            Gizmos.matrix = oldMatrix;

            // Draw explored cells
            if (_exploredCells.Count > 0)
            {
                Gizmos.color = new Color(0, 1, 0, 0.2f);
                foreach (var cell in _exploredCells)
                {
                    Vector3 center = new Vector3(cell.x * _cellSize, 0.5f, -cell.y * _cellSize);
                    Gizmos.DrawCube(center, new Vector3(_cellSize * 0.9f, 0.1f, _cellSize * 0.9f));
                }
            }
        }

        #endregion
    }
}

using System;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Labyrinth.Dream
{
    /// <summary>
    /// Represents a single room within a dream tunnel.
    /// Handles local effects, narratives, and player detection.
    /// </summary>
    public class DreamRoom : MonoBehaviour
    {
        [Header("Room Configuration")]
        [SerializeField] private int _roomIndex;
        [SerializeField] private DreamRoomType _roomType = DreamRoomType.Corridor;
        [SerializeField] private Vector3 _roomSize = new Vector3(10f, 5f, 10f);

        [Header("Visual Settings")]
        [SerializeField] private Color _roomTint = Color.white;
        [SerializeField] private float _lightIntensity = 0.5f;
        [SerializeField] private Material _wallMaterial;
        [SerializeField] private Material _floorMaterial;

        [Header("Effects")]
        [SerializeField] private ParticleSystem _localParticles;
        [SerializeField] private Light _roomLight;
        [SerializeField] private AudioSource _roomAudio;

        [Header("Narrative")]
        [SerializeField] private Transform _narrativeSpawnPoint;
        [SerializeField] private List<Transform> _wallTextPositions = new List<Transform>();

        // Events
        public event Action<DreamRoom> OnPlayerEntered;
        public event Action<DreamRoom> OnPlayerExited;
        public event Action<DreamRoom> OnRoomActivated;
        public event Action<DreamRoom> OnRoomDeactivated;

        // State
        private bool _isActive;
        private bool _playerInside;
        private DreamTunnel _parentTunnel;
        private List<MeshRenderer> _roomRenderers = new List<MeshRenderer>();
        private MaterialPropertyBlock _propertyBlock;

        // Properties
        public int RoomIndex => _roomIndex;
        public DreamRoomType RoomType => _roomType;
        public bool IsActive => _isActive;
        public bool PlayerInside => _playerInside;
        public Vector3 RoomSize => _roomSize;

        #region Unity Lifecycle

        private void Awake()
        {
            _propertyBlock = new MaterialPropertyBlock();
            CollectRenderers();
        }

        private void Start()
        {
            // Find parent tunnel
            _parentTunnel = GetComponentInParent<DreamTunnel>();
            if (_parentTunnel != null)
            {
                _parentTunnel.RegisterRoom(this);
            }

            // Create narrative spawn point if missing
            if (_narrativeSpawnPoint == null)
            {
                var spawnObj = new GameObject("NarrativeSpawnPoint");
                spawnObj.transform.SetParent(transform);
                spawnObj.transform.localPosition = new Vector3(0, _roomSize.y * 0.5f, 0);
                _narrativeSpawnPoint = spawnObj.transform;
            }
        }

        private void OnDestroy()
        {
            if (_parentTunnel != null)
            {
                _parentTunnel.UnregisterRoom(this);
            }
        }

        #endregion

        #region Initialization

        public void Initialize(int index, DreamConfig config)
        {
            _roomIndex = index;
            _roomTint = Color.Lerp(config.primaryColor, config.secondaryColor, index / (float)config.roomCount);

            ApplyVisuals();
        }

        private void CollectRenderers()
        {
            _roomRenderers.Clear();
            var renderers = GetComponentsInChildren<MeshRenderer>();
            _roomRenderers.AddRange(renderers);
        }

        private void ApplyVisuals()
        {
            foreach (var renderer in _roomRenderers)
            {
                renderer.GetPropertyBlock(_propertyBlock);
                _propertyBlock.SetColor("_Color", _roomTint);
                _propertyBlock.SetColor("_EmissionColor", _roomTint * 0.3f);
                renderer.SetPropertyBlock(_propertyBlock);
            }

            if (_roomLight != null)
            {
                _roomLight.color = _roomTint;
                _roomLight.intensity = _isActive ? _lightIntensity : 0f;
            }
        }

        #endregion

        #region Lifecycle

        public void Enter()
        {
            if (_isActive) return;

            _isActive = true;

            // Enable room effects
            if (_localParticles != null)
            {
                _localParticles.Play();
            }

            if (_roomLight != null)
            {
                _roomLight.enabled = true;
                StartCoroutine(AnimateLightIntensity(0f, _lightIntensity, 1f));
            }

            if (_roomAudio != null && !_roomAudio.isPlaying)
            {
                _roomAudio.Play();
            }

            OnRoomActivated?.Invoke(this);
        }

        public void Exit()
        {
            if (!_isActive) return;

            _isActive = false;

            // Disable room effects
            if (_localParticles != null)
            {
                _localParticles.Stop();
            }

            if (_roomLight != null)
            {
                StartCoroutine(AnimateLightIntensity(_roomLight.intensity, 0f, 0.5f));
            }

            if (_roomAudio != null && _roomAudio.isPlaying)
            {
                _roomAudio.Stop();
            }

            OnRoomDeactivated?.Invoke(this);
        }

        #endregion

        #region Narrative

        public Vector3 GetNarrativeSpawnPoint()
        {
            if (_narrativeSpawnPoint != null)
            {
                return _narrativeSpawnPoint.position;
            }
            return transform.position + Vector3.up * _roomSize.y * 0.4f;
        }

        public Vector3 GetRandomWallTextPosition()
        {
            if (_wallTextPositions.Count > 0)
            {
                int index = UnityEngine.Random.Range(0, _wallTextPositions.Count);
                return _wallTextPositions[index].position;
            }

            // Generate random wall position
            float side = UnityEngine.Random.Range(0, 4);
            Vector3 offset = side switch
            {
                0 => new Vector3(_roomSize.x * 0.5f - 0.1f, UnityEngine.Random.Range(1f, _roomSize.y - 1f), UnityEngine.Random.Range(-_roomSize.z * 0.4f, _roomSize.z * 0.4f)),
                1 => new Vector3(-_roomSize.x * 0.5f + 0.1f, UnityEngine.Random.Range(1f, _roomSize.y - 1f), UnityEngine.Random.Range(-_roomSize.z * 0.4f, _roomSize.z * 0.4f)),
                2 => new Vector3(UnityEngine.Random.Range(-_roomSize.x * 0.4f, _roomSize.x * 0.4f), UnityEngine.Random.Range(1f, _roomSize.y - 1f), _roomSize.z * 0.5f - 0.1f),
                _ => new Vector3(UnityEngine.Random.Range(-_roomSize.x * 0.4f, _roomSize.x * 0.4f), UnityEngine.Random.Range(1f, _roomSize.y - 1f), -_roomSize.z * 0.5f + 0.1f)
            };

            return transform.position + offset;
        }

        #endregion

        #region Player Detection

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                _playerInside = true;
                OnPlayerEntered?.Invoke(this);
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                _playerInside = false;
                OnPlayerExited?.Invoke(this);
            }
        }

        #endregion

        #region Effects

        private System.Collections.IEnumerator AnimateLightIntensity(float from, float to, float duration)
        {
            if (_roomLight == null) yield break;

            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                _roomLight.intensity = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            _roomLight.intensity = to;

            if (to <= 0f)
            {
                _roomLight.enabled = false;
            }
        }

        /// <summary>
        /// Pulse the room's visual effects.
        /// </summary>
        public void Pulse(float intensity = 1f, float duration = 0.5f)
        {
            StartCoroutine(PulseEffect(intensity, duration));
        }

        private System.Collections.IEnumerator PulseEffect(float intensity, float duration)
        {
            float halfDuration = duration * 0.5f;

            // Pulse up
            float elapsed = 0f;
            while (elapsed < halfDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / halfDuration;
                float pulseValue = Mathf.Sin(t * Mathf.PI * 0.5f) * intensity;

                ApplyPulse(pulseValue);
                yield return null;
            }

            // Pulse down
            elapsed = 0f;
            while (elapsed < halfDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / halfDuration;
                float pulseValue = Mathf.Cos(t * Mathf.PI * 0.5f) * intensity;

                ApplyPulse(pulseValue);
                yield return null;
            }

            ApplyPulse(0f);
        }

        private void ApplyPulse(float intensity)
        {
            foreach (var renderer in _roomRenderers)
            {
                renderer.GetPropertyBlock(_propertyBlock);
                _propertyBlock.SetColor("_EmissionColor", _roomTint * (0.3f + intensity));
                renderer.SetPropertyBlock(_propertyBlock);
            }

            if (_roomLight != null && _isActive)
            {
                _roomLight.intensity = _lightIntensity + intensity * 2f;
            }
        }

        #endregion

        #region Wall Inscriptions

        private List<string> _wallInscriptions = new List<string>();

        /// <summary>
        /// Add a wall inscription to this room.
        /// </summary>
        public void AddWallInscription(string text)
        {
            if (string.IsNullOrEmpty(text)) return;

            _wallInscriptions.Add(text);

            // Create visual representation
            CreateWallTextVisual(text);
        }

        private void CreateWallTextVisual(string text)
        {
            // Find available position
            Transform spawnPos = null;
            if (_wallTextPositions.Count > 0)
            {
                int idx = (_wallInscriptions.Count - 1) % _wallTextPositions.Count;
                spawnPos = _wallTextPositions[idx];
            }
            else
            {
                // Use random wall position
                Vector3 pos = transform.position + new Vector3(
                    UnityEngine.Random.Range(-_roomSize.x * 0.4f, _roomSize.x * 0.4f),
                    UnityEngine.Random.Range(_roomSize.y * 0.2f, _roomSize.y * 0.6f),
                    _roomSize.z * 0.5f - 0.1f
                );

                var tempObj = new GameObject("WallTextPos");
                tempObj.transform.SetParent(transform);
                tempObj.transform.position = pos;
                tempObj.transform.rotation = Quaternion.Euler(0, 180, 0);
                spawnPos = tempObj.transform;
            }

            // Create 3D text (would use TextMeshPro in actual implementation)
            var textObj = new GameObject($"WallInscription_{_wallInscriptions.Count}");
            textObj.transform.SetParent(spawnPos);
            textObj.transform.localPosition = Vector3.zero;
            textObj.transform.localRotation = Quaternion.identity;

            // Add TextMesh for basic visibility
            var textMesh = textObj.AddComponent<TextMesh>();
            textMesh.text = text;
            textMesh.characterSize = 0.1f;
            textMesh.fontSize = 48;
            textMesh.color = _roomTint;
            textMesh.anchor = TextAnchor.MiddleCenter;
            textMesh.alignment = TextAlignment.Center;
        }

        /// <summary>
        /// Get room bounds for symbol projection.
        /// </summary>
        public Bounds GetRoomBounds()
        {
            return new Bounds(transform.position, _roomSize);
        }

        /// <summary>
        /// Get all inscriptions in this room.
        /// </summary>
        public IReadOnlyList<string> GetWallInscriptions()
        {
            return _wallInscriptions;
        }

        #endregion

        #region Editor

        private void OnDrawGizmos()
        {
            // Draw room bounds
            Gizmos.color = _isActive ? Color.cyan : Color.gray;
            Gizmos.DrawWireCube(transform.position, _roomSize);

            // Draw narrative spawn point
            if (_narrativeSpawnPoint != null)
            {
                Gizmos.color = Color.yellow;
                Gizmos.DrawWireSphere(_narrativeSpawnPoint.position, 0.3f);
            }
        }

        #endregion
    }

    public enum DreamRoomType
    {
        Corridor,
        Chamber,
        Junction,
        DeadEnd,
        Threshold,
        Core
    }
}

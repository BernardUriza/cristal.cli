using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Labyrinth.Dream
{
    /// <summary>
    /// Represents a single dream tunnel instance with its rooms, narratives, and effects.
    /// </summary>
    public class DreamTunnel : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private DreamConfig _config;
        [SerializeField] private Transform _spawnPoint;
        [SerializeField] private Transform _exitPoint;

        [Header("Room References")]
        [SerializeField] private List<DreamRoom> _rooms = new List<DreamRoom>();
        [SerializeField] private Transform _roomContainer;

        [Header("Effects")]
        [SerializeField] private ParticleSystem _dreamDustParticles;
        [SerializeField] private Light _dreamAmbientLight;
        [SerializeField] private Material _dreamSkyboxMaterial;

        [Header("Narrative")]
        [SerializeField] private List<DreamNarrativeFragment> _narrativeQueue = new List<DreamNarrativeFragment>();
        [SerializeField] private float _narrativeInterval = 8f;

        // Events
        public event Action<DreamTunnel> OnPlayerEntered;
        public event Action<DreamTunnel> OnPlayerExited;
        public event Action<DreamNarrativeFragment> OnNarrativeTriggered;
        public event Action OnActivated;
        public event Action OnDeactivated;

        // State
        private bool _isActive;
        private float _dreamProgress;
        private Coroutine _narrativeCoroutine;
        private int _currentRoomIndex;

        // Properties
        public DreamConfig Config => _config;
        public Transform SpawnPoint => _spawnPoint;
        public Transform ExitPoint => _exitPoint;
        public bool IsActive => _isActive;
        public float DreamProgress => _dreamProgress;
        public int SourceArcanaId => _config?.sourceId ?? -1;
        public IReadOnlyList<DreamRoom> Rooms => _rooms;

        #region Initialization

        public void Initialize(DreamConfig config)
        {
            _config = config;

            // Set up narratives from config
            if (config.narrativeFragments != null)
            {
                foreach (var fragment in config.narrativeFragments)
                {
                    _narrativeQueue.Add(new DreamNarrativeFragment
                    {
                        text = fragment,
                        displayType = NarrativeDisplayType.FloatingText,
                        textColor = config.primaryColor
                    });
                }
            }

            // Setup ambient light
            if (_dreamAmbientLight != null)
            {
                _dreamAmbientLight.color = config.primaryColor;
                _dreamAmbientLight.intensity = 0f;
            }

            // Setup particles
            if (_dreamDustParticles != null)
            {
                var main = _dreamDustParticles.main;
                main.startColor = new ParticleSystem.MinMaxGradient(
                    config.primaryColor * 0.5f,
                    config.secondaryColor
                );
            }
        }

        #endregion

        #region Lifecycle

        public void Activate()
        {
            if (_isActive) return;

            _isActive = true;
            _dreamProgress = 0f;
            _currentRoomIndex = 0;

            // Enable effects
            if (_dreamDustParticles != null)
            {
                _dreamDustParticles.Play();
            }

            // Fade in ambient light
            if (_dreamAmbientLight != null)
            {
                StartCoroutine(FadeLight(_dreamAmbientLight, 0f, 0.8f, 2f));
            }

            // Set fog
            RenderSettings.fog = true;
            RenderSettings.fogDensity = _config.fogDensity;
            RenderSettings.fogColor = Color.Lerp(_config.primaryColor, Color.black, 0.7f);

            // Activate first room
            if (_rooms.Count > 0)
            {
                _rooms[0].Enter();
            }

            OnActivated?.Invoke();
        }

        public void Deactivate()
        {
            if (!_isActive) return;

            _isActive = false;

            // Stop narratives
            if (_narrativeCoroutine != null)
            {
                StopCoroutine(_narrativeCoroutine);
                _narrativeCoroutine = null;
            }

            // Stop effects
            if (_dreamDustParticles != null)
            {
                _dreamDustParticles.Stop();
            }

            // Fade out light
            if (_dreamAmbientLight != null)
            {
                StartCoroutine(FadeLight(_dreamAmbientLight, _dreamAmbientLight.intensity, 0f, 1f));
            }

            // Deactivate all rooms
            foreach (var room in _rooms)
            {
                room.Exit();
            }

            OnDeactivated?.Invoke();
        }

        #endregion

        #region Progress & Updates

        public void UpdateDreamProgress(float progress)
        {
            _dreamProgress = progress;

            // Update effects based on progress
            UpdateDreamEffects(progress);

            // Check for room transitions
            CheckRoomProgression(progress);
        }

        private void UpdateDreamEffects(float progress)
        {
            // Intensify effects near end of dream
            if (_config.isUnbound)
            {
                // Unbound dreams get more intense
                float intensity = Mathf.Lerp(0.1f, _config.distortionIntensity, progress);
                // Apply to distortion shader if available
            }
            else
            {
                // Normal dreams fade out slightly
                float intensity = Mathf.Lerp(_config.distortionIntensity, _config.distortionIntensity * 0.5f, progress);
            }

            // Fog gets denser
            if (RenderSettings.fog)
            {
                RenderSettings.fogDensity = Mathf.Lerp(_config.fogDensity, _config.fogDensity * 1.5f, progress);
            }
        }

        private void CheckRoomProgression(float progress)
        {
            if (_rooms.Count == 0) return;

            int targetRoom = Mathf.FloorToInt(progress * _rooms.Count);
            targetRoom = Mathf.Clamp(targetRoom, 0, _rooms.Count - 1);

            if (targetRoom != _currentRoomIndex)
            {
                TransitionToRoom(targetRoom);
            }
        }

        private void TransitionToRoom(int index)
        {
            if (index < 0 || index >= _rooms.Count) return;

            // Exit current room
            if (_currentRoomIndex >= 0 && _currentRoomIndex < _rooms.Count)
            {
                _rooms[_currentRoomIndex].Exit();
            }

            // Enter new room
            _currentRoomIndex = index;
            _rooms[_currentRoomIndex].Enter();
        }

        #endregion

        #region Narratives

        public IEnumerator PlayNarrativeSequence()
        {
            yield return new WaitForSeconds(3f); // Initial delay

            int fragmentIndex = 0;
            while (_isActive && fragmentIndex < _narrativeQueue.Count)
            {
                var fragment = _narrativeQueue[fragmentIndex];

                // Set position based on current room
                if (_currentRoomIndex >= 0 && _currentRoomIndex < _rooms.Count)
                {
                    fragment.worldPosition = _rooms[_currentRoomIndex].GetNarrativeSpawnPoint();
                }

                OnNarrativeTriggered?.Invoke(fragment);

                fragmentIndex++;
                yield return new WaitForSeconds(_narrativeInterval);
            }
        }

        public void AddNarrativeFragment(DreamNarrativeFragment fragment)
        {
            _narrativeQueue.Add(fragment);
        }

        public void InsertNarrativeNow(DreamNarrativeFragment fragment)
        {
            OnNarrativeTriggered?.Invoke(fragment);
        }

        #endregion

        #region Player Detection

        public void RegisterRoom(DreamRoom room)
        {
            if (!_rooms.Contains(room))
            {
                _rooms.Add(room);
                room.OnPlayerEntered += HandleRoomPlayerEntered;
                room.OnPlayerExited += HandleRoomPlayerExited;
            }
        }

        public void UnregisterRoom(DreamRoom room)
        {
            if (_rooms.Contains(room))
            {
                room.OnPlayerEntered -= HandleRoomPlayerEntered;
                room.OnPlayerExited -= HandleRoomPlayerExited;
                _rooms.Remove(room);
            }
        }

        private void HandleRoomPlayerEntered(DreamRoom room)
        {
            if (room == _rooms[0] && !_isActive)
            {
                // Player entered the first room - entering the dream
                OnPlayerEntered?.Invoke(this);
            }
        }

        private void HandleRoomPlayerExited(DreamRoom room)
        {
            // Check if player is exiting through the exit point
            if (room == _rooms[_rooms.Count - 1])
            {
                OnPlayerExited?.Invoke(this);
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player") && !_isActive)
            {
                OnPlayerEntered?.Invoke(this);
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player") && _isActive)
            {
                // Check if near exit
                if (_exitPoint != null)
                {
                    float distToExit = Vector3.Distance(other.transform.position, _exitPoint.position);
                    if (distToExit < 5f)
                    {
                        OnPlayerExited?.Invoke(this);
                    }
                }
            }
        }

        #endregion

        #region Utility

        private IEnumerator FadeLight(Light light, float from, float to, float duration)
        {
            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                light.intensity = Mathf.Lerp(from, to, elapsed / duration);
                yield return null;
            }
            light.intensity = to;
        }

        #endregion

        #region Editor

        private void OnDrawGizmosSelected()
        {
            // Draw spawn point
            if (_spawnPoint != null)
            {
                Gizmos.color = Color.green;
                Gizmos.DrawWireSphere(_spawnPoint.position, 1f);
                Gizmos.DrawLine(_spawnPoint.position, _spawnPoint.position + _spawnPoint.forward * 2f);
            }

            // Draw exit point
            if (_exitPoint != null)
            {
                Gizmos.color = Color.red;
                Gizmos.DrawWireSphere(_exitPoint.position, 1f);
            }

            // Draw connections between rooms
            Gizmos.color = Color.magenta;
            for (int i = 0; i < _rooms.Count - 1; i++)
            {
                if (_rooms[i] != null && _rooms[i + 1] != null)
                {
                    Gizmos.DrawLine(_rooms[i].transform.position, _rooms[i + 1].transform.position);
                }
            }
        }

        #endregion
    }
}

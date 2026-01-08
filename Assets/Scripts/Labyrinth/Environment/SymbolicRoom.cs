using UnityEngine;
using Cristal.CLI.Memory;
using Cristal.CLI.StateMachine;
using Cristal.CLI.Labyrinth.Console;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Represents a symbolic room in the labyrinth.
    /// Each room is associated with a terminal state and has unique atmosphere.
    /// </summary>
    public class SymbolicRoom : MonoBehaviour
    {
        [Header("Room Identity")]
        [SerializeField] private CristalState _roomState = CristalState.Waiting;
        [SerializeField] private string _roomName = "Chamber";
        [SerializeField] private string _roomDescription = "";

        [Header("Atmosphere")]
        [SerializeField] private Light[] _roomLights;
        [SerializeField] private Color _ambientColor = Color.white;
        [SerializeField] private float _ambientIntensity = 1f;
        [SerializeField] private Color _fogColor = Color.gray;
        [SerializeField] private float _fogDensity = 0.02f;

        [Header("State Effects")]
        [SerializeField] private float _glitchIntensity = 0f;
        [SerializeField] private Material[] _stateMaterials;

        [Header("Audio")]
        [SerializeField] private AudioSource _ambientSource;
        [SerializeField] private AudioClip _ambientLoop;
        [SerializeField] private float _ambientVolume = 0.5f;

        [Header("Contents")]
        [SerializeField] private InWorldConsole[] _consoles;
        [SerializeField] private HologramProjector[] _holograms;
        [SerializeField] private Transform _playerSpawnPoint;

        [Header("Trigger")]
        [SerializeField] private Collider _roomBounds;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        public CristalState RoomState => _roomState;
        public string RoomName => _roomName;
        public Transform SpawnPoint => _playerSpawnPoint;

        private bool _isActive;
        private Color _originalAmbient;
        private float _originalFogDensity;
        private Color _originalFogColor;

        private void Start()
        {
            // Store original values
            _originalAmbient = RenderSettings.ambientLight;
            _originalFogDensity = RenderSettings.fogDensity;
            _originalFogColor = RenderSettings.fogColor;

            // Setup audio
            if (_ambientSource != null && _ambientLoop != null)
            {
                _ambientSource.clip = _ambientLoop;
                _ambientSource.loop = true;
                _ambientSource.volume = 0f; // Start silent
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                EnterRoom();
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                ExitRoom();
            }
        }

        #region Room Activation

        private void EnterRoom()
        {
            if (_isActive) return;

            _isActive = true;

            // Notify LabyrinthManager
            LabyrinthManager.Instance?.NotifyRoomEntered(this);

            // Apply atmosphere
            ApplyAtmosphere();

            // Start ambient audio
            if (_ambientSource != null)
            {
                _ambientSource.Play();
                StartCoroutine(FadeAudio(_ambientSource, _ambientVolume, 1f));
            }

            if (_debugMode)
            {
                Debug.Log($"[SymbolicRoom] Entered: {_roomName} ({_roomState})");
            }
        }

        private void ExitRoom()
        {
            if (!_isActive) return;

            _isActive = false;

            // Fade out ambient audio
            if (_ambientSource != null)
            {
                StartCoroutine(FadeAudioAndStop(_ambientSource, 0f, 1f));
            }

            if (_debugMode)
            {
                Debug.Log($"[SymbolicRoom] Exited: {_roomName}");
            }
        }

        #endregion

        #region Atmosphere

        private void ApplyAtmosphere()
        {
            // Set ambient light
            RenderSettings.ambientLight = _ambientColor * _ambientIntensity;

            // Set fog
            RenderSettings.fog = _fogDensity > 0;
            RenderSettings.fogColor = _fogColor;
            RenderSettings.fogDensity = _fogDensity;
            RenderSettings.fogMode = FogMode.ExponentialSquared;

            // Update room lights
            foreach (var light in _roomLights)
            {
                if (light != null)
                {
                    light.enabled = true;
                }
            }
        }

        /// <summary>
        /// Apply visual effects based on the current terminal state.
        /// Called by LabyrinthManager when terminal state changes.
        /// </summary>
        public void ApplyStateEffect(CristalState state)
        {
            if (!_isActive) return;

            if (_debugMode)
            {
                Debug.Log($"[SymbolicRoom] {_roomName} applying state effect: {state}");
            }

            // Modify atmosphere based on global state
            float intensity = 1f;
            Color tint = Color.white;

            switch (state)
            {
                case CristalState.Corrupted:
                    intensity = 0.5f + Random.value * 0.5f; // Flickering
                    tint = new Color(1f, 0.3f, 0.3f); // Red tint
                    break;

                case CristalState.Remembering:
                    intensity = 0.8f;
                    tint = new Color(1f, 0.9f, 0.7f); // Warm amber
                    break;

                case CristalState.Echo:
                    intensity = 1.2f;
                    tint = new Color(0.7f, 0.8f, 1f); // Cool blue
                    break;

                case CristalState.UNBOUND:
                    intensity = 1.5f;
                    tint = new Color(1f, 0.3f, 1f); // Magenta
                    break;

                case CristalState.Invoked:
                    intensity = 1.1f;
                    tint = new Color(0.8f, 0.5f, 1f); // Purple
                    break;
            }

            // Apply to room lights
            foreach (var light in _roomLights)
            {
                if (light != null)
                {
                    light.intensity = intensity;
                    light.color = Color.Lerp(light.color, tint, 0.5f);
                }
            }

            // Update state materials if assigned
            if (_stateMaterials != null)
            {
                foreach (var mat in _stateMaterials)
                {
                    if (mat != null)
                    {
                        mat.SetFloat("_GlitchIntensity", GetGlitchForState(state));
                        mat.SetColor("_StateColor", tint);
                    }
                }
            }
        }

        private float GetGlitchForState(CristalState state)
        {
            return state switch
            {
                CristalState.Corrupted => 3f,
                CristalState.Error => 5f,
                CristalState.UNBOUND => 5f + Mathf.Sin(Time.time * 2f) * 3f,
                CristalState.Invoked => 2f,
                _ => 0f
            };
        }

        #endregion

        #region Utility

        private System.Collections.IEnumerator FadeAudio(AudioSource source, float targetVolume, float duration)
        {
            float startVolume = source.volume;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                source.volume = Mathf.Lerp(startVolume, targetVolume, elapsed / duration);
                yield return null;
            }

            source.volume = targetVolume;
        }

        private System.Collections.IEnumerator FadeAudioAndStop(AudioSource source, float targetVolume, float duration)
        {
            yield return FadeAudio(source, targetVolume, duration);
            source.Stop();
        }

        /// <summary>
        /// Get the spawn point for this room.
        /// </summary>
        public Vector3 GetSpawnPosition()
        {
            return _playerSpawnPoint != null ? _playerSpawnPoint.position : transform.position;
        }

        /// <summary>
        /// Get the spawn rotation for this room.
        /// </summary>
        public Quaternion GetSpawnRotation()
        {
            return _playerSpawnPoint != null ? _playerSpawnPoint.rotation : transform.rotation;
        }

        #endregion

        private void OnDrawGizmosSelected()
        {
            // Draw room bounds
            if (_roomBounds != null)
            {
                Gizmos.color = new Color(_ambientColor.r, _ambientColor.g, _ambientColor.b, 0.3f);
                Gizmos.matrix = _roomBounds.transform.localToWorldMatrix;

                if (_roomBounds is BoxCollider box)
                {
                    Gizmos.DrawCube(box.center, box.size);
                }
            }

            // Draw spawn point
            if (_playerSpawnPoint != null)
            {
                Gizmos.color = Color.green;
                Gizmos.DrawWireSphere(_playerSpawnPoint.position, 0.5f);
                Gizmos.DrawRay(_playerSpawnPoint.position, _playerSpawnPoint.forward * 2f);
            }
        }
    }
}

using UnityEngine;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Projects visions as 3D holograms in the labyrinth.
    /// Subscribes to VisionManager events to spawn and update holograms.
    /// </summary>
    public class HologramProjector : MonoBehaviour
    {
        [Header("Vision Configuration")]
        [SerializeField] private string _visionId;
        [SerializeField] private bool _autoActivate = true;

        [Header("Hologram Settings")]
        [SerializeField] private Transform _hologramSpawn;
        [SerializeField] private Vector3 _hologramScale = Vector3.one;
        [SerializeField] private float _rotationSpeed = 15f;
        [SerializeField] private float _bobAmplitude = 0.1f;
        [SerializeField] private float _bobFrequency = 1f;

        [Header("Visual")]
        [SerializeField] private Material _hologramMaterial;
        [SerializeField] private Color _hologramTint = new Color(0.5f, 0.8f, 1f, 0.8f);
        [SerializeField] private float _emissionIntensity = 2f;

        [Header("Projector Base")]
        [SerializeField] private MeshRenderer _projectorBase;
        [SerializeField] private Light _projectorLight;
        [SerializeField] private ParticleSystem _projectionParticles;

        [Header("View Level Effects")]
        [SerializeField] private float _level1Alpha = 0.3f;
        [SerializeField] private float _level2Alpha = 0.6f;
        [SerializeField] private float _level3Alpha = 1f;
        [SerializeField] private bool _addScanlines = true;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip _activateClip;
        [SerializeField] private AudioClip _idleLoopClip;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        private GameObject _activeHologram;
        private MeshRenderer _hologramRenderer;
        private Material _hologramInstance;
        private VisionInstance _currentVision;
        private int _currentViewLevel;
        private float _baseY;
        private bool _isActive;

        public string VisionId => _visionId;
        public bool IsActive => _isActive;

        private void Start()
        {
            if (_hologramSpawn != null)
            {
                _baseY = _hologramSpawn.localPosition.y;
            }

            // Subscribe to vision events
            var visionManager = VisionManager.Instance;
            if (visionManager != null)
            {
                visionManager.OnVisionUnlocked += HandleVisionUnlocked;
                visionManager.OnVisionViewed += HandleVisionViewed;
            }

            // Check if vision is already unlocked
            if (_autoActivate && !string.IsNullOrEmpty(_visionId))
            {
                CheckExistingVision();
            }
        }

        private void OnDestroy()
        {
            var visionManager = VisionManager.Instance;
            if (visionManager != null)
            {
                visionManager.OnVisionUnlocked -= HandleVisionUnlocked;
                visionManager.OnVisionViewed -= HandleVisionViewed;
            }
        }

        private void Update()
        {
            if (!_isActive || _activeHologram == null) return;

            // Rotate hologram
            _activeHologram.transform.Rotate(Vector3.up, _rotationSpeed * Time.deltaTime);

            // Bob up and down
            if (_hologramSpawn != null)
            {
                float bob = Mathf.Sin(Time.time * _bobFrequency * Mathf.PI * 2f) * _bobAmplitude;
                Vector3 pos = _hologramSpawn.localPosition;
                pos.y = _baseY + bob;
                _hologramSpawn.localPosition = pos;
            }
        }

        #region Vision Events

        private void HandleVisionUnlocked(VisionInstance vision)
        {
            if (vision.Definition.id != _visionId) return;

            if (_debugMode)
            {
                Debug.Log($"[HologramProjector] Vision unlocked: {_visionId}");
            }

            _currentVision = vision;
            ActivateProjector();
        }

        private void HandleVisionViewed(VisionInstance vision)
        {
            if (vision.Definition.id != _visionId) return;

            if (_debugMode)
            {
                Debug.Log($"[HologramProjector] Vision viewed: {_visionId} (Level {vision.CurrentViewLevel})");
            }

            _currentViewLevel = vision.CurrentViewLevel;
            UpdateHologramQuality();
        }

        /// <summary>
        /// Called by LabyrinthManager when a vision is unlocked.
        /// </summary>
        public void OnVisionUnlocked(VisionInstance vision)
        {
            HandleVisionUnlocked(vision);
        }

        private void CheckExistingVision()
        {
            var visionManager = VisionManager.Instance;
            if (visionManager == null) return;

            var vision = visionManager.GetVision(_visionId);
            if (vision != null && vision.IsUnlocked)
            {
                _currentVision = vision;
                _currentViewLevel = vision.CurrentViewLevel;
                ActivateProjector();
            }
        }

        #endregion

        #region Projection

        /// <summary>
        /// Activate the projector and spawn the hologram.
        /// </summary>
        public void ActivateProjector()
        {
            if (_isActive) return;
            if (_currentVision == null || _currentVision.Texture == null) return;

            _isActive = true;

            // Create hologram quad
            CreateHologram();

            // Activate projector effects
            if (_projectorLight != null)
            {
                _projectorLight.enabled = true;
            }

            if (_projectionParticles != null)
            {
                _projectionParticles.Play();
            }

            // Play activation sound
            PlaySound(_activateClip);

            // Start idle loop
            if (_audioSource != null && _idleLoopClip != null)
            {
                _audioSource.clip = _idleLoopClip;
                _audioSource.loop = true;
                _audioSource.Play();
            }

            if (_debugMode)
            {
                Debug.Log($"[HologramProjector] Activated: {_visionId}");
            }
        }

        /// <summary>
        /// Deactivate the projector and destroy the hologram.
        /// </summary>
        public void DeactivateProjector()
        {
            if (!_isActive) return;

            _isActive = false;

            // Destroy hologram
            if (_activeHologram != null)
            {
                Destroy(_activeHologram);
                _activeHologram = null;
            }

            // Deactivate projector effects
            if (_projectorLight != null)
            {
                _projectorLight.enabled = false;
            }

            if (_projectionParticles != null)
            {
                _projectionParticles.Stop();
            }

            // Stop audio
            if (_audioSource != null)
            {
                _audioSource.Stop();
            }

            if (_debugMode)
            {
                Debug.Log($"[HologramProjector] Deactivated: {_visionId}");
            }
        }

        private void CreateHologram()
        {
            // Create a quad for the hologram
            _activeHologram = GameObject.CreatePrimitive(PrimitiveType.Quad);
            _activeHologram.name = $"Hologram_{_visionId}";

            // Remove collider
            var collider = _activeHologram.GetComponent<Collider>();
            if (collider != null)
            {
                Destroy(collider);
            }

            // Position
            Transform parent = _hologramSpawn != null ? _hologramSpawn : transform;
            _activeHologram.transform.SetParent(parent);
            _activeHologram.transform.localPosition = Vector3.zero;
            _activeHologram.transform.localRotation = Quaternion.identity;
            _activeHologram.transform.localScale = _hologramScale;

            // Apply material
            _hologramRenderer = _activeHologram.GetComponent<MeshRenderer>();

            if (_hologramMaterial != null)
            {
                _hologramInstance = new Material(_hologramMaterial);
            }
            else
            {
                // Create a simple unlit material
                _hologramInstance = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            }

            // Apply vision texture
            if (_currentVision != null && _currentVision.Texture != null)
            {
                _hologramInstance.mainTexture = _currentVision.Texture;
            }

            // Set hologram color/alpha
            _hologramInstance.color = _hologramTint;

            // Set emission if shader supports it
            if (_hologramInstance.HasProperty("_EmissionColor"))
            {
                _hologramInstance.EnableKeyword("_EMISSION");
                _hologramInstance.SetColor("_EmissionColor", _hologramTint * _emissionIntensity);
            }

            _hologramRenderer.material = _hologramInstance;

            // Update quality based on view level
            UpdateHologramQuality();
        }

        private void UpdateHologramQuality()
        {
            if (_hologramInstance == null) return;

            float alpha = _currentViewLevel switch
            {
                1 => _level1Alpha,
                2 => _level2Alpha,
                3 => _level3Alpha,
                _ => _level1Alpha
            };

            Color color = _hologramTint;
            color.a = alpha;
            _hologramInstance.color = color;

            // Update emission intensity based on level
            if (_hologramInstance.HasProperty("_EmissionColor"))
            {
                float emission = _emissionIntensity * (_currentViewLevel / 3f);
                _hologramInstance.SetColor("_EmissionColor", _hologramTint * emission);
            }

            // Update projector light
            if (_projectorLight != null)
            {
                _projectorLight.intensity = 1f + (_currentViewLevel * 0.5f);
            }

            if (_debugMode)
            {
                Debug.Log($"[HologramProjector] Updated quality to level {_currentViewLevel}");
            }
        }

        #endregion

        #region Utility

        private void PlaySound(AudioClip clip)
        {
            if (_audioSource != null && clip != null)
            {
                _audioSource.PlayOneShot(clip);
            }
        }

        #endregion

        private void OnDrawGizmosSelected()
        {
            Transform spawn = _hologramSpawn != null ? _hologramSpawn : transform;

            // Draw hologram bounds
            Gizmos.color = new Color(0.5f, 0.8f, 1f, 0.5f);
            Gizmos.DrawWireCube(spawn.position, _hologramScale);

            // Draw projector base
            Gizmos.color = Color.cyan;
            Gizmos.DrawLine(transform.position, spawn.position);
        }
    }
}

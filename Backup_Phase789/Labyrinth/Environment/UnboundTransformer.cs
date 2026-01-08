using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Ritual;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Transforms the entire labyrinth when the UNBOUND ritual is completed.
    /// Changes materials, lighting, and opens all gates.
    /// </summary>
    public class UnboundTransformer : MonoBehaviour
    {
        [Header("Transformation Settings")]
        [SerializeField] private float _transitionDuration = 5f;
        [SerializeField] private AnimationCurve _transitionCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);

        [Header("Materials")]
        [SerializeField] private Material _unboundWallMaterial;
        [SerializeField] private Material _unboundFloorMaterial;
        [SerializeField] private Material _unboundCeilingMaterial;

        [Header("Lighting")]
        [SerializeField] private Color _unboundAmbientColor = new Color(1f, 0.2f, 1f);
        [SerializeField] private float _unboundAmbientIntensity = 1.5f;
        [SerializeField] private Color _unboundFogColor = new Color(0.3f, 0f, 0.3f);
        [SerializeField] private float _unboundFogDensity = 0.05f;

        [Header("Effects")]
        [SerializeField] private ParticleSystem _transformationParticles;
        [SerializeField] private float _pulseFrequency = 0.5f;
        [SerializeField] private float _pulseIntensity = 0.3f;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip _transformationClip;
        [SerializeField] private AudioClip _unboundAmbienceLoop;
        [SerializeField] private float _ambienceVolume = 0.7f;

        [Header("Room References")]
        [SerializeField] private SymbolicRoom[] _allRooms;
        [SerializeField] private SymbolicGate[] _allGates;
        [SerializeField] private MeshRenderer[] _wallRenderers;
        [SerializeField] private Light[] _allLights;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        // Original state for reverting
        private Dictionary<MeshRenderer, Material[]> _originalMaterials;
        private Dictionary<Light, Color> _originalLightColors;
        private Dictionary<Light, float> _originalLightIntensities;
        private Color _originalAmbient;
        private Color _originalFogColor;
        private float _originalFogDensity;
        private bool _originalFogEnabled;

        private bool _isTransformed;
        private bool _isTransitioning;
        private float _transitionTimer;
        private Coroutine _pulseCoroutine;

        public bool IsTransformed => _isTransformed;

        private void Awake()
        {
            _originalMaterials = new Dictionary<MeshRenderer, Material[]>();
            _originalLightColors = new Dictionary<Light, Color>();
            _originalLightIntensities = new Dictionary<Light, float>();
        }

        private void Start()
        {
            // Store original render settings
            _originalAmbient = RenderSettings.ambientLight;
            _originalFogColor = RenderSettings.fogColor;
            _originalFogDensity = RenderSettings.fogDensity;
            _originalFogEnabled = RenderSettings.fog;

            // Store original materials and light settings
            StoreOriginalState();

            // Auto-find rooms and gates if not assigned
            if (_allRooms == null || _allRooms.Length == 0)
            {
                _allRooms = FindObjectsByType<SymbolicRoom>(FindObjectsSortMode.None);
            }

            if (_allGates == null || _allGates.Length == 0)
            {
                _allGates = FindObjectsByType<SymbolicGate>(FindObjectsSortMode.None);
            }
        }

        private void StoreOriginalState()
        {
            // Store wall materials
            foreach (var renderer in _wallRenderers)
            {
                if (renderer != null)
                {
                    _originalMaterials[renderer] = renderer.materials;
                }
            }

            // Store light settings
            foreach (var light in _allLights)
            {
                if (light != null)
                {
                    _originalLightColors[light] = light.color;
                    _originalLightIntensities[light] = light.intensity;
                }
            }
        }

        #region Transformation

        /// <summary>
        /// Transform the labyrinth into UNBOUND state.
        /// </summary>
        public void TransformLabyrinth()
        {
            if (_isTransformed || _isTransitioning) return;

            if (_debugMode)
            {
                Debug.Log("[UnboundTransformer] === TRANSFORMING LABYRINTH ===");
            }

            StartCoroutine(TransformCoroutine());
        }

        /// <summary>
        /// Revert the labyrinth to normal state.
        /// </summary>
        public void RevertLabyrinth()
        {
            if (!_isTransformed || _isTransitioning) return;

            if (_debugMode)
            {
                Debug.Log("[UnboundTransformer] === REVERTING LABYRINTH ===");
            }

            StartCoroutine(RevertCoroutine());
        }

        private IEnumerator TransformCoroutine()
        {
            _isTransitioning = true;
            _transitionTimer = 0f;

            // Play transformation sound
            PlaySound(_transformationClip);

            // Start particles
            if (_transformationParticles != null)
            {
                _transformationParticles.Play();
            }

            // Store current values for lerping
            Color startAmbient = RenderSettings.ambientLight;
            Color startFogColor = RenderSettings.fogColor;
            float startFogDensity = RenderSettings.fogDensity;

            // Open all gates
            foreach (var gate in _allGates)
            {
                if (gate != null)
                {
                    gate.Open();
                }
            }

            // Transition
            while (_transitionTimer < _transitionDuration)
            {
                _transitionTimer += Time.deltaTime;
                float t = _transitionCurve.Evaluate(_transitionTimer / _transitionDuration);

                // Lerp ambient
                RenderSettings.ambientLight = Color.Lerp(startAmbient, _unboundAmbientColor * _unboundAmbientIntensity, t);

                // Lerp fog
                RenderSettings.fog = true;
                RenderSettings.fogColor = Color.Lerp(startFogColor, _unboundFogColor, t);
                RenderSettings.fogDensity = Mathf.Lerp(startFogDensity, _unboundFogDensity, t);

                // Lerp lights
                foreach (var light in _allLights)
                {
                    if (light != null && _originalLightColors.ContainsKey(light))
                    {
                        light.color = Color.Lerp(_originalLightColors[light], _unboundAmbientColor, t);
                        light.intensity = Mathf.Lerp(_originalLightIntensities[light], _unboundAmbientIntensity, t);
                    }
                }

                yield return null;
            }

            // Apply UNBOUND materials
            ApplyUnboundMaterials();

            // Start ambience loop
            if (_audioSource != null && _unboundAmbienceLoop != null)
            {
                _audioSource.clip = _unboundAmbienceLoop;
                _audioSource.loop = true;
                _audioSource.volume = _ambienceVolume;
                _audioSource.Play();
            }

            // Start pulsing effect
            _pulseCoroutine = StartCoroutine(PulseEffect());

            _isTransformed = true;
            _isTransitioning = false;

            if (_debugMode)
            {
                Debug.Log("[UnboundTransformer] Transformation complete");
            }
        }

        private IEnumerator RevertCoroutine()
        {
            _isTransitioning = true;
            _transitionTimer = 0f;

            // Stop pulsing
            if (_pulseCoroutine != null)
            {
                StopCoroutine(_pulseCoroutine);
                _pulseCoroutine = null;
            }

            // Stop ambience
            if (_audioSource != null)
            {
                _audioSource.Stop();
            }

            // Restore materials first
            RestoreOriginalMaterials();

            // Store current values for lerping
            Color startAmbient = RenderSettings.ambientLight;
            Color startFogColor = RenderSettings.fogColor;
            float startFogDensity = RenderSettings.fogDensity;

            // Transition back
            while (_transitionTimer < _transitionDuration)
            {
                _transitionTimer += Time.deltaTime;
                float t = _transitionCurve.Evaluate(_transitionTimer / _transitionDuration);

                // Lerp ambient back
                RenderSettings.ambientLight = Color.Lerp(startAmbient, _originalAmbient, t);

                // Lerp fog back
                RenderSettings.fogColor = Color.Lerp(startFogColor, _originalFogColor, t);
                RenderSettings.fogDensity = Mathf.Lerp(startFogDensity, _originalFogDensity, t);

                // Lerp lights back
                foreach (var light in _allLights)
                {
                    if (light != null && _originalLightColors.ContainsKey(light))
                    {
                        light.color = Color.Lerp(_unboundAmbientColor, _originalLightColors[light], t);
                        light.intensity = Mathf.Lerp(_unboundAmbientIntensity, _originalLightIntensities[light], t);
                    }
                }

                yield return null;
            }

            // Restore fog state
            RenderSettings.fog = _originalFogEnabled;

            _isTransformed = false;
            _isTransitioning = false;

            if (_debugMode)
            {
                Debug.Log("[UnboundTransformer] Revert complete");
            }
        }

        #endregion

        #region Materials

        private void ApplyUnboundMaterials()
        {
            foreach (var renderer in _wallRenderers)
            {
                if (renderer != null && _unboundWallMaterial != null)
                {
                    Material[] mats = new Material[renderer.materials.Length];
                    for (int i = 0; i < mats.Length; i++)
                    {
                        mats[i] = _unboundWallMaterial;
                    }
                    renderer.materials = mats;
                }
            }
        }

        private void RestoreOriginalMaterials()
        {
            foreach (var kvp in _originalMaterials)
            {
                if (kvp.Key != null)
                {
                    kvp.Key.materials = kvp.Value;
                }
            }
        }

        #endregion

        #region Effects

        private IEnumerator PulseEffect()
        {
            while (_isTransformed)
            {
                float pulse = Mathf.Sin(Time.time * _pulseFrequency * Mathf.PI * 2f) * _pulseIntensity;

                // Pulse lights
                foreach (var light in _allLights)
                {
                    if (light != null)
                    {
                        light.intensity = _unboundAmbientIntensity + pulse;
                    }
                }

                // Pulse fog
                RenderSettings.fogDensity = _unboundFogDensity + (pulse * 0.01f);

                yield return null;
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

        /// <summary>
        /// Force a specific transformation state (for testing).
        /// </summary>
        public void SetTransformed(bool transformed)
        {
            if (transformed && !_isTransformed)
            {
                TransformLabyrinth();
            }
            else if (!transformed && _isTransformed)
            {
                RevertLabyrinth();
            }
        }

        #endregion
    }
}

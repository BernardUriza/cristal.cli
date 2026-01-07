using UnityEngine;
using UnityEngine.UI;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Scanline effect for terminal visual aesthetics.
    /// Supports both simple texture-based scanlines and advanced CRT shader.
    /// </summary>
    [RequireComponent(typeof(RawImage))]
    public class ScanlineEffect : MonoBehaviour
    {
        public enum EffectMode
        {
            Simple,     // Texture-based scanlines (lightweight)
            Advanced    // Full CRT shader (noise, vignette, chromatic aberration)
        }

        [Header("Mode")]
        [SerializeField] private EffectMode _mode = EffectMode.Simple;
        
        [Header("Simple Mode Settings")]
        [SerializeField] private float _alpha = 0.03f;
        [SerializeField] private int _lineHeight = 2;
        [SerializeField] private float _scrollSpeed = 0f;
        [SerializeField] private bool _animate = false;

        [Header("Advanced Mode Settings")]
        [SerializeField] private float _noiseAlpha = 0.02f;
        [SerializeField] private float _vignetteIntensity = 0.3f;
        [SerializeField] private float _chromaticOffset = 0.002f;
        [SerializeField] private float _flickerIntensity = 0.01f;
        [SerializeField] private float _curvature = 0f;

        [Header("Dynamic Effects")]
        [SerializeField] private bool _pulseOnGlitch = true;
        [SerializeField] private float _glitchNoiseBoost = 0.15f;
        [SerializeField] private float _glitchDuration = 0.2f;

        private RawImage _image;
        private Texture2D _scanlineTexture;
        private Material _crtMaterial;
        private float _scrollOffset = 0f;
        private float _glitchTimer = 0f;
        private float _baseNoiseAlpha;

        private static readonly int ScanlineAlphaID = Shader.PropertyToID("_ScanlineAlpha");
        private static readonly int ScanlineSpeedID = Shader.PropertyToID("_ScanlineSpeed");
        private static readonly int NoiseAlphaID = Shader.PropertyToID("_NoiseAlpha");
        private static readonly int VignetteIntensityID = Shader.PropertyToID("_VignetteIntensity");
        private static readonly int ChromaticOffsetID = Shader.PropertyToID("_ChromaticOffset");
        private static readonly int FlickerIntensityID = Shader.PropertyToID("_FlickerIntensity");
        private static readonly int CurvatureID = Shader.PropertyToID("_Curvature");

        private void Awake()
        {
            _image = GetComponent<RawImage>();
            _baseNoiseAlpha = _noiseAlpha;
            InitializeEffect();
        }

        private void InitializeEffect()
        {
            if (_mode == EffectMode.Simple)
            {
                GenerateScanlineTexture();
            }
            else
            {
                InitializeCRTShader();
            }
        }

        private void InitializeCRTShader()
        {
            Shader crtShader = Shader.Find("CRISTAL/CRTEffect");
            if (crtShader == null)
            {
                Debug.LogWarning("[ScanlineEffect] CRT shader not found, falling back to simple mode");
                _mode = EffectMode.Simple;
                GenerateScanlineTexture();
                return;
            }

            _crtMaterial = new Material(crtShader);
            _image.material = _crtMaterial;
            
            // Create a white texture as base
            Texture2D whiteTex = new Texture2D(1, 1);
            whiteTex.SetPixel(0, 0, new Color(0, 0, 0, 0.01f));
            whiteTex.Apply();
            _image.texture = whiteTex;
            
            UpdateShaderProperties();
        }

        private void UpdateShaderProperties()
        {
            if (_crtMaterial == null) return;

            _crtMaterial.SetFloat(ScanlineAlphaID, _alpha);
            _crtMaterial.SetFloat(ScanlineSpeedID, _scrollSpeed);
            _crtMaterial.SetFloat(NoiseAlphaID, _noiseAlpha);
            _crtMaterial.SetFloat(VignetteIntensityID, _vignetteIntensity);
            _crtMaterial.SetFloat(ChromaticOffsetID, _chromaticOffset);
            _crtMaterial.SetFloat(FlickerIntensityID, _flickerIntensity);
            _crtMaterial.SetFloat(CurvatureID, _curvature);
        }

        private void Update()
        {
            // Handle glitch pulse decay
            if (_glitchTimer > 0)
            {
                _glitchTimer -= Time.deltaTime;
                float t = _glitchTimer / _glitchDuration;
                _noiseAlpha = Mathf.Lerp(_baseNoiseAlpha, _baseNoiseAlpha + _glitchNoiseBoost, t);
                
                if (_mode == EffectMode.Advanced && _crtMaterial != null)
                {
                    _crtMaterial.SetFloat(NoiseAlphaID, _noiseAlpha);
                }
            }

            // Simple mode animation
            if (_mode == EffectMode.Simple && _animate && _scrollSpeed > 0)
            {
                _scrollOffset += Time.deltaTime * _scrollSpeed;
                if (_scrollOffset >= 1f) _scrollOffset = 0f;
                _image.uvRect = new Rect(0, _scrollOffset, 1, 1);
            }
        }

        private void GenerateScanlineTexture()
        {
            if (_scanlineTexture != null)
            {
                Destroy(_scanlineTexture);
            }

            int height = _lineHeight * 2;
            _scanlineTexture = new Texture2D(1, height, TextureFormat.RGBA32, false);
            _scanlineTexture.wrapMode = TextureWrapMode.Repeat;
            _scanlineTexture.filterMode = FilterMode.Point;

            Color transparent = new Color(0, 0, 0, 0);
            Color scanline = new Color(0, 0, 0, _alpha);

            for (int y = 0; y < height; y++)
            {
                Color color = (y < _lineHeight) ? scanline : transparent;
                _scanlineTexture.SetPixel(0, y, color);
            }

            _scanlineTexture.Apply();
            _image.texture = _scanlineTexture;
            _image.material = null; // Use default UI material
        }

        /// <summary>
        /// Trigger a glitch pulse effect (temporary noise boost).
        /// </summary>
        public void TriggerGlitch()
        {
            if (!_pulseOnGlitch) return;
            _glitchTimer = _glitchDuration;
        }

        /// <summary>
        /// Set effect mode at runtime.
        /// </summary>
        public void SetMode(EffectMode mode)
        {
            if (_mode == mode) return;
            
            _mode = mode;
            
            // Cleanup old
            if (_scanlineTexture != null)
            {
                Destroy(_scanlineTexture);
                _scanlineTexture = null;
            }
            if (_crtMaterial != null)
            {
                Destroy(_crtMaterial);
                _crtMaterial = null;
            }
            
            InitializeEffect();
        }

        /// <summary>
        /// Update scanline alpha.
        /// </summary>
        public void SetAlpha(float alpha)
        {
            _alpha = alpha;
            if (_mode == EffectMode.Simple)
            {
                GenerateScanlineTexture();
            }
            else if (_crtMaterial != null)
            {
                _crtMaterial.SetFloat(ScanlineAlphaID, alpha);
            }
        }

        /// <summary>
        /// Enable/disable scanline animation.
        /// </summary>
        public void SetAnimated(bool animated, float speed = 0.1f)
        {
            _animate = animated;
            _scrollSpeed = speed;
            
            if (_mode == EffectMode.Advanced && _crtMaterial != null)
            {
                _crtMaterial.SetFloat(ScanlineSpeedID, animated ? speed : 0f);
            }
        }

        /// <summary>
        /// Set noise intensity (Advanced mode only).
        /// </summary>
        public void SetNoiseAlpha(float alpha)
        {
            _noiseAlpha = alpha;
            _baseNoiseAlpha = alpha;
            if (_crtMaterial != null)
            {
                _crtMaterial.SetFloat(NoiseAlphaID, alpha);
            }
        }

        /// <summary>
        /// Set vignette intensity (Advanced mode only).
        /// </summary>
        public void SetVignette(float intensity)
        {
            _vignetteIntensity = intensity;
            if (_crtMaterial != null)
            {
                _crtMaterial.SetFloat(VignetteIntensityID, intensity);
            }
        }

        /// <summary>
        /// Set chromatic aberration (Advanced mode only).
        /// </summary>
        public void SetChromaticAberration(float offset)
        {
            _chromaticOffset = offset;
            if (_crtMaterial != null)
            {
                _crtMaterial.SetFloat(ChromaticOffsetID, offset);
            }
        }

        /// <summary>
        /// Set screen curvature (Advanced mode only).
        /// </summary>
        public void SetCurvature(float curvature)
        {
            _curvature = curvature;
            if (_crtMaterial != null)
            {
                _crtMaterial.SetFloat(CurvatureID, curvature);
            }
        }

        /// <summary>
        /// Apply settings from a TerminalVisualConfig.
        /// </summary>
        public void ApplyConfig(TerminalVisualConfig config)
        {
            if (config == null) return;

            _alpha = config.scanlineAlpha;
            _scrollSpeed = config.scanlineSpeed;
            _animate = config.scanlineSpeed > 0;
            
            if (_mode == EffectMode.Simple)
            {
                GenerateScanlineTexture();
            }
            else
            {
                UpdateShaderProperties();
            }
        }

        private void OnDestroy()
        {
            if (_scanlineTexture != null)
            {
                Destroy(_scanlineTexture);
            }
            if (_crtMaterial != null)
            {
                Destroy(_crtMaterial);
            }
        }

#if UNITY_EDITOR
        private void OnValidate()
        {
            if (!Application.isPlaying) return;
            
            if (_mode == EffectMode.Advanced && _crtMaterial != null)
            {
                UpdateShaderProperties();
            }
        }
#endif
    }
}

using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace Cristal.CLI.Symbolic
{
    /// <summary>
    /// Projection style for symbolic display.
    /// </summary>
    public enum ProjectionStyle
    {
        Hologram,       // 3D floating hologram
        Surface,        // Projected onto surface
        Overlay,        // UI overlay
        Particle        // Particle-based
    }

    /// <summary>
    /// Component that projects generated SVG symbols as visual elements in the world.
    /// Can display symbols as UI images, 3D holograms, or particle effects.
    /// </summary>
    public class SymbolicProjection : MonoBehaviour
    {
        [Header("Projection Settings")]
        [SerializeField] private ProjectionStyle _style = ProjectionStyle.Hologram;
        [SerializeField] private float _displayDuration = 5f;
        [SerializeField] private bool _autoFadeOut = true;
        [SerializeField] private float _fadeInDuration = 0.5f;
        [SerializeField] private float _fadeOutDuration = 1f;

        [Header("Visual Settings")]
        [SerializeField] private float _scale = 1f;
        [SerializeField] private float _rotationSpeed = 10f;
        [SerializeField] private float _floatAmplitude = 0.1f;
        [SerializeField] private float _floatSpeed = 1f;
        [SerializeField] private Color _tintColor = Color.white;

        [Header("Hologram Settings")]
        [SerializeField] private Material _hologramMaterial;
        [SerializeField] private float _hologramHeight = 2f;
        [SerializeField] private bool _faceCamera = true;

        [Header("UI Settings")]
        [SerializeField] private RawImage _uiTarget;
        [SerializeField] private CanvasGroup _canvasGroup;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;
        [SerializeField] private AudioClip _projectSound;
        [SerializeField] private AudioClip _dispelSound;

        // State
        private GeneratedSymbol _currentSymbol;
        private Coroutine _displayCoroutine;
        private Coroutine _animationCoroutine;
        private float _currentAlpha = 0f;
        private Vector3 _basePosition;
        private Texture2D _generatedTexture;
        private MeshRenderer _hologramRenderer;
        private bool _isProjecting;

        public bool IsAvailable => !_isProjecting;
        public bool IsProjecting => _isProjecting;
        public GeneratedSymbol CurrentSymbol => _currentSymbol;

        #region Unity Lifecycle

        private void Start()
        {
            _basePosition = transform.position;

            // Setup hologram mesh if needed
            if (_style == ProjectionStyle.Hologram)
            {
                SetupHologramMesh();
            }

            // Hide initially
            SetAlpha(0f);
        }

        private void Update()
        {
            if (!_isProjecting) return;

            // Floating animation
            if (_floatAmplitude > 0)
            {
                float offset = Mathf.Sin(Time.time * _floatSpeed) * _floatAmplitude;
                transform.position = _basePosition + Vector3.up * offset;
            }

            // Rotation
            if (_rotationSpeed > 0 && _style == ProjectionStyle.Hologram)
            {
                transform.Rotate(Vector3.up, _rotationSpeed * Time.deltaTime);
            }

            // Face camera
            if (_faceCamera && _style == ProjectionStyle.Hologram)
            {
                var cam = Camera.main;
                if (cam != null)
                {
                    Vector3 lookDir = cam.transform.position - transform.position;
                    lookDir.y = 0;
                    if (lookDir.sqrMagnitude > 0.01f)
                    {
                        transform.rotation = Quaternion.Slerp(
                            transform.rotation,
                            Quaternion.LookRotation(-lookDir),
                            Time.deltaTime * 5f
                        );
                    }
                }
            }
        }

        private void OnDestroy()
        {
            if (_generatedTexture != null)
            {
                Destroy(_generatedTexture);
            }
        }

        #endregion

        #region Projection API

        /// <summary>
        /// Project a generated symbol.
        /// </summary>
        public void Project(GeneratedSymbol symbol)
        {
            if (symbol == null) return;

            _currentSymbol = symbol;
            _isProjecting = true;

            // Stop any existing display
            if (_displayCoroutine != null)
            {
                StopCoroutine(_displayCoroutine);
            }

            _displayCoroutine = StartCoroutine(ProjectionSequence(symbol));
        }

        /// <summary>
        /// Immediately dispel the current projection.
        /// </summary>
        public void Dispel()
        {
            if (!_isProjecting) return;

            if (_displayCoroutine != null)
            {
                StopCoroutine(_displayCoroutine);
            }

            StartCoroutine(FadeOut());
        }

        /// <summary>
        /// Project raw SVG content.
        /// </summary>
        public void ProjectSVG(string svgContent, SymbolicArchetype archetype = SymbolicArchetype.TheFragment)
        {
            var symbol = new GeneratedSymbol
            {
                SvgContent = svgContent,
                Archetype = archetype,
                Timestamp = Time.time
            };

            Project(symbol);
        }

        #endregion

        #region Projection Sequence

        private IEnumerator ProjectionSequence(GeneratedSymbol symbol)
        {
            // Play sound
            if (_audioSource != null && _projectSound != null)
            {
                _audioSource.PlayOneShot(_projectSound);
            }

            // Generate texture from SVG
            // Note: Full SVG-to-texture would require a library like SVG Importer
            // For now, we create a placeholder or use the SVG export system
            UpdateVisual(symbol);

            // Fade in
            yield return StartCoroutine(FadeIn());

            // Animation
            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
            }
            _animationCoroutine = StartCoroutine(AnimateProjection());

            // Wait for display duration
            if (_autoFadeOut)
            {
                yield return new WaitForSeconds(_displayDuration);

                // Fade out
                yield return StartCoroutine(FadeOut());
            }
        }

        private IEnumerator FadeIn()
        {
            float elapsed = 0f;

            while (elapsed < _fadeInDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / _fadeInDuration;
                SetAlpha(Mathf.SmoothStep(0f, 1f, t));
                yield return null;
            }

            SetAlpha(1f);
        }

        private IEnumerator FadeOut()
        {
            if (_audioSource != null && _dispelSound != null)
            {
                _audioSource.PlayOneShot(_dispelSound);
            }

            float startAlpha = _currentAlpha;
            float elapsed = 0f;

            while (elapsed < _fadeOutDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / _fadeOutDuration;
                SetAlpha(Mathf.Lerp(startAlpha, 0f, t));
                yield return null;
            }

            SetAlpha(0f);
            _isProjecting = false;
            _currentSymbol = null;

            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
                _animationCoroutine = null;
            }
        }

        private IEnumerator AnimateProjection()
        {
            float phase = 0f;

            while (_isProjecting)
            {
                phase += Time.deltaTime;

                // Pulse effect
                float pulse = 1f + Mathf.Sin(phase * 2f) * 0.05f;
                transform.localScale = Vector3.one * _scale * pulse;

                yield return null;
            }
        }

        #endregion

        #region Visual Updates

        private void SetupHologramMesh()
        {
            // Create a quad for the hologram
            var meshFilter = GetComponent<MeshFilter>();
            if (meshFilter == null)
            {
                meshFilter = gameObject.AddComponent<MeshFilter>();
            }

            _hologramRenderer = GetComponent<MeshRenderer>();
            if (_hologramRenderer == null)
            {
                _hologramRenderer = gameObject.AddComponent<MeshRenderer>();
            }

            // Simple quad mesh
            meshFilter.mesh = CreateQuadMesh();

            // Apply hologram material
            if (_hologramMaterial != null)
            {
                _hologramRenderer.material = new Material(_hologramMaterial);
            }
            else
            {
                // Create default unlit material
                _hologramRenderer.material = new Material(Shader.Find("Unlit/Transparent"));
            }

            // Position above ground
            _basePosition = transform.position + Vector3.up * _hologramHeight;
            transform.position = _basePosition;
        }

        private Mesh CreateQuadMesh()
        {
            var mesh = new Mesh();

            Vector3[] vertices = new Vector3[]
            {
                new Vector3(-0.5f, -0.5f, 0),
                new Vector3(0.5f, -0.5f, 0),
                new Vector3(-0.5f, 0.5f, 0),
                new Vector3(0.5f, 0.5f, 0)
            };

            int[] triangles = new int[] { 0, 2, 1, 2, 3, 1 };

            Vector2[] uv = new Vector2[]
            {
                new Vector2(0, 0),
                new Vector2(1, 0),
                new Vector2(0, 1),
                new Vector2(1, 1)
            };

            mesh.vertices = vertices;
            mesh.triangles = triangles;
            mesh.uv = uv;
            mesh.RecalculateNormals();

            return mesh;
        }

        private void UpdateVisual(GeneratedSymbol symbol)
        {
            // For now, create a procedural texture
            // Full SVG rendering would require additional libraries
            _generatedTexture = CreateProceduralTexture(symbol);

            switch (_style)
            {
                case ProjectionStyle.Hologram:
                    if (_hologramRenderer != null && _generatedTexture != null)
                    {
                        _hologramRenderer.material.mainTexture = _generatedTexture;
                        _hologramRenderer.material.color = _tintColor;
                    }
                    break;

                case ProjectionStyle.Overlay:
                    if (_uiTarget != null && _generatedTexture != null)
                    {
                        _uiTarget.texture = _generatedTexture;
                        _uiTarget.color = _tintColor;
                    }
                    break;
            }
        }

        private Texture2D CreateProceduralTexture(GeneratedSymbol symbol)
        {
            // Create a simple procedural texture based on archetype
            // This is a placeholder - real implementation would parse SVG
            int size = 256;
            var texture = new Texture2D(size, size, TextureFormat.RGBA32, false);

            Color bgColor = Color.clear;
            Color fgColor = GetArchetypeColor(symbol.Archetype);

            // Fill with transparent
            Color[] pixels = new Color[size * size];
            for (int i = 0; i < pixels.Length; i++)
            {
                pixels[i] = bgColor;
            }

            // Draw simple shape based on archetype
            DrawProceduralShape(pixels, size, symbol.Archetype, fgColor);

            texture.SetPixels(pixels);
            texture.Apply();
            texture.filterMode = FilterMode.Bilinear;

            return texture;
        }

        private void DrawProceduralShape(Color[] pixels, int size, SymbolicArchetype archetype, Color color)
        {
            float center = size / 2f;
            float radius = size * 0.4f;

            // Draw based on archetype
            switch (archetype)
            {
                case SymbolicArchetype.TheCorruption:
                    DrawGlitchPattern(pixels, size, color);
                    break;

                case SymbolicArchetype.TheEcho:
                    DrawConcentricCircles(pixels, size, center, center, radius, 5, color);
                    break;

                case SymbolicArchetype.TheUnbound:
                    DrawFlowerPattern(pixels, size, center, center, radius, color);
                    break;

                default:
                    DrawPolygon(pixels, size, center, center, radius, 6, color);
                    break;
            }
        }

        private void DrawPolygon(Color[] pixels, int size, float cx, float cy, float radius, int sides, Color color)
        {
            float thickness = 3f;

            for (int i = 0; i < sides; i++)
            {
                float angle1 = i * 2 * Mathf.PI / sides - Mathf.PI / 2;
                float angle2 = (i + 1) * 2 * Mathf.PI / sides - Mathf.PI / 2;

                float x1 = cx + radius * Mathf.Cos(angle1);
                float y1 = cy + radius * Mathf.Sin(angle1);
                float x2 = cx + radius * Mathf.Cos(angle2);
                float y2 = cy + radius * Mathf.Sin(angle2);

                DrawLine(pixels, size, x1, y1, x2, y2, color, thickness);
            }
        }

        private void DrawConcentricCircles(Color[] pixels, int size, float cx, float cy, float maxRadius, int count, Color color)
        {
            for (int i = 1; i <= count; i++)
            {
                float r = maxRadius * i / count;
                float alpha = 1f - (float)(i - 1) / count * 0.6f;
                DrawCircle(pixels, size, cx, cy, r, new Color(color.r, color.g, color.b, alpha), 2f);
            }
        }

        private void DrawFlowerPattern(Color[] pixels, int size, float cx, float cy, float radius, Color color)
        {
            int petals = 6;
            float petalRadius = radius * 0.5f;

            // Center circle
            DrawCircle(pixels, size, cx, cy, petalRadius, color, 2f);

            // Petals
            for (int i = 0; i < petals; i++)
            {
                float angle = i * 2 * Mathf.PI / petals;
                float px = cx + petalRadius * Mathf.Cos(angle);
                float py = cy + petalRadius * Mathf.Sin(angle);
                DrawCircle(pixels, size, px, py, petalRadius, color, 1.5f);
            }
        }

        private void DrawGlitchPattern(Color[] pixels, int size, Color color)
        {
            System.Random rand = new System.Random((int)(Time.time * 1000));

            for (int i = 0; i < 20; i++)
            {
                int x = rand.Next(size);
                int y = rand.Next(size);
                int w = rand.Next(10, 80);
                int h = rand.Next(2, 10);

                float alpha = 0.5f + (float)rand.NextDouble() * 0.5f;

                for (int dx = 0; dx < w && x + dx < size; dx++)
                {
                    for (int dy = 0; dy < h && y + dy < size; dy++)
                    {
                        int idx = (y + dy) * size + (x + dx);
                        if (idx >= 0 && idx < pixels.Length)
                        {
                            pixels[idx] = new Color(color.r, color.g, color.b, alpha);
                        }
                    }
                }
            }
        }

        private void DrawLine(Color[] pixels, int size, float x1, float y1, float x2, float y2, Color color, float thickness)
        {
            float dx = x2 - x1;
            float dy = y2 - y1;
            float length = Mathf.Sqrt(dx * dx + dy * dy);
            int steps = Mathf.CeilToInt(length);

            for (int i = 0; i <= steps; i++)
            {
                float t = (float)i / steps;
                int x = Mathf.RoundToInt(x1 + dx * t);
                int y = Mathf.RoundToInt(y1 + dy * t);

                for (int tx = -(int)thickness; tx <= (int)thickness; tx++)
                {
                    for (int ty = -(int)thickness; ty <= (int)thickness; ty++)
                    {
                        int px = x + tx;
                        int py = y + ty;
                        if (px >= 0 && px < size && py >= 0 && py < size)
                        {
                            int idx = py * size + px;
                            pixels[idx] = color;
                        }
                    }
                }
            }
        }

        private void DrawCircle(Color[] pixels, int size, float cx, float cy, float radius, Color color, float thickness)
        {
            int segments = Mathf.Max(16, Mathf.CeilToInt(radius * 2));

            for (int i = 0; i < segments; i++)
            {
                float angle1 = i * 2 * Mathf.PI / segments;
                float angle2 = (i + 1) * 2 * Mathf.PI / segments;

                float x1 = cx + radius * Mathf.Cos(angle1);
                float y1 = cy + radius * Mathf.Sin(angle1);
                float x2 = cx + radius * Mathf.Cos(angle2);
                float y2 = cy + radius * Mathf.Sin(angle2);

                DrawLine(pixels, size, x1, y1, x2, y2, color, thickness);
            }
        }

        private void SetAlpha(float alpha)
        {
            _currentAlpha = alpha;

            switch (_style)
            {
                case ProjectionStyle.Hologram:
                    if (_hologramRenderer != null)
                    {
                        var mat = _hologramRenderer.material;
                        var c = mat.color;
                        c.a = alpha;
                        mat.color = c;
                    }
                    break;

                case ProjectionStyle.Overlay:
                    if (_canvasGroup != null)
                    {
                        _canvasGroup.alpha = alpha;
                    }
                    else if (_uiTarget != null)
                    {
                        var c = _uiTarget.color;
                        c.a = alpha;
                        _uiTarget.color = c;
                    }
                    break;
            }
        }

        private Color GetArchetypeColor(SymbolicArchetype archetype)
        {
            return archetype switch
            {
                SymbolicArchetype.TheMoon => new Color(0.6f, 0.2f, 1f),
                SymbolicArchetype.Death => new Color(0.8f, 0.1f, 0.2f),
                SymbolicArchetype.TheDevil => new Color(1f, 0.3f, 0f),
                SymbolicArchetype.TheCorruption => new Color(1f, 0.2f, 0.3f),
                SymbolicArchetype.TheEcho => new Color(0.5f, 0.5f, 0.7f),
                SymbolicArchetype.TheMemory => new Color(0.4f, 0.8f, 1f),
                SymbolicArchetype.TheUnbound => new Color(1f, 0f, 1f),
                SymbolicArchetype.TheVoid => new Color(0.1f, 0.1f, 0.2f),
                SymbolicArchetype.TheGate => new Color(0.8f, 0.6f, 0.2f),
                SymbolicArchetype.TheVision => new Color(1f, 1f, 0.6f),
                _ => new Color(0.6f, 1f, 0.6f)
            };
        }

        #endregion
    }
}

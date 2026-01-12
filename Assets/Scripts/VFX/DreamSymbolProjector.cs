using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cristal.CLI.Core;
using Cristal.CLI.Labyrinth.Dream;

namespace Cristal.CLI.VFX
{
    /// <summary>
    /// Projects procedural symbols onto dream surfaces.
    /// Generates textures for arcana symbols and animates them with glow effects.
    /// </summary>
    public class DreamSymbolProjector : MonoBehaviour
    {
        public static DreamSymbolProjector Instance { get; private set; }

        [Header("Projection Settings")]
        [SerializeField] private float _defaultRevealDuration = 1.5f;
        [SerializeField] private float _defaultGlowPulsePeriod = 2f;
        [SerializeField] private float _defaultSymbolSize = 1f;
        [SerializeField] private int _textureResolution = 256;

        [Header("Materials")]
        [SerializeField] private Material _symbolMaterialTemplate;
        [SerializeField] private Shader _unlitShader;

        [Header("Animation")]
        [SerializeField] private AnimationCurve _revealCurve = AnimationCurve.EaseInOut(0, 0, 1, 1);
        [SerializeField] private AnimationCurve _glowCurve = AnimationCurve.EaseInOut(0, 0.5f, 1, 1);

        // Pooling
        private Queue<SymbolProjection> _projectionPool = new Queue<SymbolProjection>();
        private List<SymbolProjection> _activeProjections = new List<SymbolProjection>();
        private Dictionary<SymbolType, Texture2D> _cachedTextures = new Dictionary<SymbolType, Texture2D>();

        // Events
        public event Action<SymbolProjection> OnSymbolProjected;
        public event Action<SymbolProjection> OnSymbolFaded;

        #region Unity Lifecycle

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            ServiceLocator.RegisterMono(this);

            // Find or create shader reference
            if (_unlitShader == null)
            {
                _unlitShader = Shader.Find("Universal Render Pipeline/Unlit");
                if (_unlitShader == null)
                {
                    _unlitShader = Shader.Find("Unlit/Transparent");
                }
            }
        }

        private void OnDestroy()
        {
            // Clean up cached textures
            foreach (var tex in _cachedTextures.Values)
            {
                if (tex != null) Destroy(tex);
            }
            _cachedTextures.Clear();

            if (Instance == this)
            {
                Instance = null;
            }
        }

        #endregion

        #region Public API

        /// <summary>
        /// Project a symbol at a specific position and rotation.
        /// </summary>
        public SymbolProjection Project(SymbolDefinition definition, Vector3 position, Quaternion rotation)
        {
            var projection = GetOrCreateProjection();

            projection.transform.position = position;
            projection.transform.rotation = rotation;
            projection.transform.localScale = Vector3.one * definition.scale * _defaultSymbolSize;

            // Apply symbol texture
            var texture = GetOrCreateSymbolTexture(definition.type);
            projection.SetSymbol(definition, texture);

            // Start reveal animation
            StartCoroutine(AnimateReveal(projection));

            _activeProjections.Add(projection);
            OnSymbolProjected?.Invoke(projection);

            return projection;
        }

        /// <summary>
        /// Project a symbol for an arcana at a position.
        /// </summary>
        public SymbolProjection ProjectArcanaSymbol(int arcanaId, Vector3 position)
        {
            var definition = SymbolDefinition.FromArcana(arcanaId);
            return Project(definition, position, Quaternion.identity);
        }

        /// <summary>
        /// Project a symbol on a random wall within bounds.
        /// Returns the projection or null if no valid position found.
        /// </summary>
        public SymbolProjection ProjectOnRandomWall(SymbolDefinition definition, Bounds roomBounds)
        {
            // Try to find a wall surface via raycast
            Vector3 center = roomBounds.center;
            Vector3 extents = roomBounds.extents;

            // Pick a random wall direction
            int wallIndex = UnityEngine.Random.Range(0, 4);
            Vector3 direction;
            Vector3 rayOrigin;

            switch (wallIndex)
            {
                case 0: // +X wall
                    direction = Vector3.right;
                    rayOrigin = center + new Vector3(-extents.x * 0.9f, UnityEngine.Random.Range(-extents.y * 0.3f, extents.y * 0.5f), UnityEngine.Random.Range(-extents.z * 0.4f, extents.z * 0.4f));
                    break;
                case 1: // -X wall
                    direction = Vector3.left;
                    rayOrigin = center + new Vector3(extents.x * 0.9f, UnityEngine.Random.Range(-extents.y * 0.3f, extents.y * 0.5f), UnityEngine.Random.Range(-extents.z * 0.4f, extents.z * 0.4f));
                    break;
                case 2: // +Z wall
                    direction = Vector3.forward;
                    rayOrigin = center + new Vector3(UnityEngine.Random.Range(-extents.x * 0.4f, extents.x * 0.4f), UnityEngine.Random.Range(-extents.y * 0.3f, extents.y * 0.5f), -extents.z * 0.9f);
                    break;
                default: // -Z wall
                    direction = Vector3.back;
                    rayOrigin = center + new Vector3(UnityEngine.Random.Range(-extents.x * 0.4f, extents.x * 0.4f), UnityEngine.Random.Range(-extents.y * 0.3f, extents.y * 0.5f), extents.z * 0.9f);
                    break;
            }

            // Raycast to find wall surface
            if (Physics.Raycast(rayOrigin, direction, out RaycastHit hit, extents.magnitude * 2f))
            {
                // Position slightly in front of wall
                Vector3 position = hit.point - direction * 0.05f;
                Quaternion rotation = Quaternion.LookRotation(-hit.normal);

                return Project(definition, position, rotation);
            }

            // Fallback: project at estimated wall position
            Vector3 fallbackPos = roomBounds.center + direction * (wallIndex < 2 ? extents.x : extents.z) * 0.95f;
            fallbackPos.y = roomBounds.center.y + UnityEngine.Random.Range(-extents.y * 0.2f, extents.y * 0.3f);

            return Project(definition, fallbackPos, Quaternion.LookRotation(-direction));
        }

        /// <summary>
        /// Clear all active symbol projections.
        /// </summary>
        public void Clear()
        {
            foreach (var projection in _activeProjections)
            {
                ReturnToPool(projection);
            }
            _activeProjections.Clear();
        }

        /// <summary>
        /// Fade and remove a specific projection.
        /// </summary>
        public void FadeProjection(SymbolProjection projection, float duration = 1f)
        {
            if (projection != null && _activeProjections.Contains(projection))
            {
                StartCoroutine(AnimateFade(projection, duration));
            }
        }

        /// <summary>
        /// Generate a symbol texture for external use.
        /// </summary>
        public Texture2D GenerateSymbolTexture(SymbolType type, int resolution)
        {
            return CreateSymbolTexture(type, resolution);
        }

        #endregion

        #region Projection Pool

        private SymbolProjection GetOrCreateProjection()
        {
            SymbolProjection projection;

            if (_projectionPool.Count > 0)
            {
                projection = _projectionPool.Dequeue();
                projection.gameObject.SetActive(true);
            }
            else
            {
                var go = new GameObject("SymbolProjection");
                go.transform.SetParent(transform);
                projection = go.AddComponent<SymbolProjection>();
                projection.Initialize(_unlitShader);
            }

            return projection;
        }

        private void ReturnToPool(SymbolProjection projection)
        {
            if (projection == null) return;

            projection.gameObject.SetActive(false);
            projection.Reset();
            _projectionPool.Enqueue(projection);
        }

        #endregion

        #region Animation

        private IEnumerator AnimateReveal(SymbolProjection projection)
        {
            float elapsed = 0f;

            while (elapsed < _defaultRevealDuration)
            {
                elapsed += Time.deltaTime;
                float t = _revealCurve.Evaluate(elapsed / _defaultRevealDuration);
                projection.SetRevealProgress(t);
                yield return null;
            }

            projection.SetRevealProgress(1f);

            // Start glow pulse
            StartCoroutine(AnimateGlowPulse(projection));
        }

        private IEnumerator AnimateGlowPulse(SymbolProjection projection)
        {
            float time = 0f;

            while (projection != null && projection.gameObject.activeInHierarchy)
            {
                time += Time.deltaTime;
                float glowT = _glowCurve.Evaluate((Mathf.Sin(time * Mathf.PI * 2f / _defaultGlowPulsePeriod) + 1f) * 0.5f);
                projection.SetGlowIntensity(glowT);
                yield return null;
            }
        }

        private IEnumerator AnimateFade(SymbolProjection projection, float duration)
        {
            float elapsed = 0f;
            float startAlpha = projection.CurrentAlpha;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                projection.SetAlpha(Mathf.Lerp(startAlpha, 0f, t));
                yield return null;
            }

            _activeProjections.Remove(projection);
            ReturnToPool(projection);
            OnSymbolFaded?.Invoke(projection);
        }

        #endregion

        #region Texture Generation

        private Texture2D GetOrCreateSymbolTexture(SymbolType type)
        {
            if (_cachedTextures.TryGetValue(type, out Texture2D cached))
            {
                return cached;
            }

            var texture = CreateSymbolTexture(type, _textureResolution);
            _cachedTextures[type] = texture;
            return texture;
        }

        private Texture2D CreateSymbolTexture(SymbolType type, int resolution)
        {
            var texture = new Texture2D(resolution, resolution, TextureFormat.RGBA32, false);
            Color[] pixels = new Color[resolution * resolution];

            // Clear to transparent
            for (int i = 0; i < pixels.Length; i++)
            {
                pixels[i] = Color.clear;
            }

            // Draw symbol based on type
            switch (type)
            {
                case SymbolType.Eye:
                    DrawEyeSymbol(pixels, resolution);
                    break;
                case SymbolType.Spiral:
                    DrawSpiralSymbol(pixels, resolution);
                    break;
                case SymbolType.Mirror:
                    DrawMirrorSymbol(pixels, resolution);
                    break;
                case SymbolType.Gate:
                    DrawGateSymbol(pixels, resolution);
                    break;
                case SymbolType.Moon:
                    DrawMoonSymbol(pixels, resolution);
                    break;
                case SymbolType.Star:
                    DrawStarSymbol(pixels, resolution);
                    break;
                case SymbolType.Triangle:
                    DrawTriangleSymbol(pixels, resolution);
                    break;
                case SymbolType.Circle:
                    DrawCircleSymbol(pixels, resolution);
                    break;
                case SymbolType.Fragment:
                    DrawFragmentSymbol(pixels, resolution);
                    break;
                case SymbolType.Void:
                    DrawVoidSymbol(pixels, resolution);
                    break;
            }

            texture.SetPixels(pixels);
            texture.Apply();
            texture.filterMode = FilterMode.Bilinear;

            return texture;
        }

        #region Symbol Drawing Methods

        private void DrawEyeSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);
            float outerRadius = res * 0.4f;
            float innerRadius = res * 0.15f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    Vector2 pos = new Vector2(x, y);
                    float dist = Vector2.Distance(pos, center);

                    // Outer almond shape
                    float almondX = Mathf.Abs(x - res * 0.5f) / (res * 0.45f);
                    float almondY = Mathf.Abs(y - res * 0.5f) / (res * 0.25f);
                    float almond = almondX * almondX + almondY * almondY;

                    if (almond < 1f)
                    {
                        float alpha = 1f - Mathf.Pow(almond, 0.5f);
                        pixels[y * res + x] = new Color(1, 1, 1, alpha * 0.8f);
                    }

                    // Inner pupil
                    if (dist < innerRadius)
                    {
                        pixels[y * res + x] = Color.white;
                    }
                }
            }
        }

        private void DrawSpiralSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    Vector2 pos = new Vector2(x - center.x, y - center.y);
                    float dist = pos.magnitude;
                    float angle = Mathf.Atan2(pos.y, pos.x);

                    float spiral = (angle + dist * 0.08f) % (Mathf.PI * 0.5f);
                    float thickness = 0.15f * Mathf.PI;

                    if (spiral < thickness && dist < res * 0.45f && dist > res * 0.05f)
                    {
                        float fade = 1f - dist / (res * 0.45f);
                        pixels[y * res + x] = new Color(1, 1, 1, fade);
                    }
                }
            }
        }

        private void DrawMirrorSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);
            float radius = res * 0.35f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), center);

                    // Circle outline
                    if (Mathf.Abs(dist - radius) < res * 0.03f)
                    {
                        pixels[y * res + x] = Color.white;
                    }

                    // Vertical line
                    if (Mathf.Abs(x - res * 0.5f) < res * 0.015f && dist < radius * 0.9f)
                    {
                        pixels[y * res + x] = Color.white;
                    }
                }
            }
        }

        private void DrawGateSymbol(Color[] pixels, int res)
        {
            // Archway shape
            float archWidth = res * 0.6f;
            float archHeight = res * 0.7f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    float normX = (x - res * 0.5f) / (archWidth * 0.5f);
                    float normY = (y - res * 0.15f) / archHeight;

                    // Arch outline
                    bool isArch = false;

                    // Top curve
                    if (normY > 0.5f && normY < 1f)
                    {
                        float curveX = Mathf.Sqrt(1f - Mathf.Pow((normY - 0.5f) * 2f, 2f));
                        if (Mathf.Abs(Mathf.Abs(normX) - curveX) < 0.08f)
                        {
                            isArch = true;
                        }
                    }

                    // Side pillars
                    if (normY > 0f && normY < 0.55f && Mathf.Abs(Mathf.Abs(normX) - 1f) < 0.08f)
                    {
                        isArch = true;
                    }

                    // Base
                    if (Mathf.Abs(normY) < 0.04f && Mathf.Abs(normX) < 1.1f)
                    {
                        isArch = true;
                    }

                    if (isArch)
                    {
                        pixels[y * res + x] = Color.white;
                    }
                }
            }
        }

        private void DrawMoonSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);
            Vector2 cutout = new Vector2(res * 0.65f, res * 0.5f);
            float mainRadius = res * 0.4f;
            float cutRadius = res * 0.3f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    Vector2 pos = new Vector2(x, y);
                    float distMain = Vector2.Distance(pos, center);
                    float distCut = Vector2.Distance(pos, cutout);

                    if (distMain < mainRadius && distCut > cutRadius)
                    {
                        float fade = 1f - (distMain / mainRadius) * 0.3f;
                        pixels[y * res + x] = new Color(1, 1, 1, fade);
                    }
                }
            }
        }

        private void DrawStarSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);
            int points = 5;
            float outerRadius = res * 0.4f;
            float innerRadius = res * 0.18f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    Vector2 pos = new Vector2(x - center.x, y - center.y);
                    float angle = Mathf.Atan2(pos.y, pos.x);
                    float dist = pos.magnitude;

                    float starAngle = ((angle + Mathf.PI) / (2f * Mathf.PI)) * points * 2f;
                    float starDist = Mathf.Lerp(innerRadius, outerRadius, (Mathf.Cos(starAngle * Mathf.PI) + 1f) * 0.5f);

                    if (dist < starDist)
                    {
                        float alpha = 1f - (dist / outerRadius) * 0.4f;
                        pixels[y * res + x] = new Color(1, 1, 1, alpha);
                    }
                }
            }
        }

        private void DrawTriangleSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    float normX = (x - center.x) / (res * 0.4f);
                    float normY = (y - res * 0.2f) / (res * 0.6f);

                    // Triangle outline
                    bool onEdge = false;

                    // Left edge
                    if (Mathf.Abs(normX + normY - 1f) < 0.08f && normY > 0 && normY < 1f)
                        onEdge = true;

                    // Right edge
                    if (Mathf.Abs(-normX + normY - 1f) < 0.08f && normY > 0 && normY < 1f)
                        onEdge = true;

                    // Bottom edge
                    if (Mathf.Abs(normY) < 0.04f && Mathf.Abs(normX) < 1f)
                        onEdge = true;

                    if (onEdge)
                    {
                        pixels[y * res + x] = Color.white;
                    }
                }
            }
        }

        private void DrawCircleSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);
            float radius = res * 0.4f;
            float thickness = res * 0.03f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), center);

                    if (Mathf.Abs(dist - radius) < thickness)
                    {
                        pixels[y * res + x] = Color.white;
                    }

                    // Inner dot
                    if (dist < res * 0.05f)
                    {
                        pixels[y * res + x] = Color.white;
                    }
                }
            }
        }

        private void DrawFragmentSymbol(Color[] pixels, int res)
        {
            // Broken/shattered pattern
            System.Random rng = new System.Random(42);

            for (int i = 0; i < 8; i++)
            {
                float x1 = res * 0.3f + (float)rng.NextDouble() * res * 0.4f;
                float y1 = res * 0.3f + (float)rng.NextDouble() * res * 0.4f;
                float x2 = x1 + ((float)rng.NextDouble() - 0.5f) * res * 0.3f;
                float y2 = y1 + ((float)rng.NextDouble() - 0.5f) * res * 0.3f;

                DrawLine(pixels, res, x1, y1, x2, y2, Color.white);
            }
        }

        private void DrawVoidSymbol(Color[] pixels, int res)
        {
            Vector2 center = new Vector2(res * 0.5f, res * 0.5f);
            float radius = res * 0.35f;

            for (int y = 0; y < res; y++)
            {
                for (int x = 0; x < res; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), center);

                    // Filled black circle with white outline
                    if (dist < radius)
                    {
                        float edge = (radius - dist) / (res * 0.05f);
                        if (edge < 1f)
                        {
                            pixels[y * res + x] = new Color(1, 1, 1, 1f - edge);
                        }
                        else
                        {
                            pixels[y * res + x] = new Color(0.1f, 0.1f, 0.1f, 0.9f);
                        }
                    }
                }
            }
        }

        private void DrawLine(Color[] pixels, int res, float x1, float y1, float x2, float y2, Color color)
        {
            float dist = Mathf.Sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
            int steps = Mathf.Max(1, (int)dist);

            for (int i = 0; i <= steps; i++)
            {
                float t = i / (float)steps;
                int px = (int)Mathf.Lerp(x1, x2, t);
                int py = (int)Mathf.Lerp(y1, y2, t);

                if (px >= 0 && px < res && py >= 0 && py < res)
                {
                    pixels[py * res + px] = color;
                    // Thicken
                    if (px > 0) pixels[py * res + px - 1] = color;
                    if (py > 0) pixels[(py - 1) * res + px] = color;
                }
            }
        }

        #endregion

        #endregion
    }

    /// <summary>
    /// Individual symbol projection instance.
    /// </summary>
    public class SymbolProjection : MonoBehaviour
    {
        private MeshRenderer _renderer;
        private MeshFilter _meshFilter;
        private Material _material;
        private SymbolDefinition _definition;
        private float _currentAlpha = 1f;

        public SymbolDefinition Definition => _definition;
        public float CurrentAlpha => _currentAlpha;

        public void Initialize(Shader shader)
        {
            // Create quad mesh
            _meshFilter = gameObject.AddComponent<MeshFilter>();
            _meshFilter.mesh = CreateQuadMesh();

            // Create renderer with material
            _renderer = gameObject.AddComponent<MeshRenderer>();
            _material = new Material(shader);
            _material.renderQueue = 3000; // Transparent queue
            _renderer.material = _material;

            // Enable transparency
            _material.SetFloat("_Surface", 1);
            _material.SetFloat("_Blend", 0);
            _material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            _material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
        }

        public void SetSymbol(SymbolDefinition definition, Texture2D texture)
        {
            _definition = definition;
            _material.mainTexture = texture;
            _material.color = definition.color;
            _material.SetColor("_EmissionColor", definition.glowColor);
            _material.EnableKeyword("_EMISSION");
        }

        public void SetRevealProgress(float progress)
        {
            _currentAlpha = progress;
            Color c = _material.color;
            c.a = progress;
            _material.color = c;
        }

        public void SetGlowIntensity(float intensity)
        {
            if (_definition != null)
            {
                _material.SetColor("_EmissionColor", _definition.glowColor * intensity);
            }
        }

        public void SetAlpha(float alpha)
        {
            _currentAlpha = alpha;
            Color c = _material.color;
            c.a = alpha;
            _material.color = c;
        }

        public void Reset()
        {
            _definition = null;
            _currentAlpha = 1f;
        }

        private Mesh CreateQuadMesh()
        {
            var mesh = new Mesh();
            mesh.vertices = new Vector3[]
            {
                new Vector3(-0.5f, -0.5f, 0),
                new Vector3(0.5f, -0.5f, 0),
                new Vector3(-0.5f, 0.5f, 0),
                new Vector3(0.5f, 0.5f, 0)
            };
            mesh.uv = new Vector2[]
            {
                new Vector2(0, 0),
                new Vector2(1, 0),
                new Vector2(0, 1),
                new Vector2(1, 1)
            };
            mesh.triangles = new int[] { 0, 2, 1, 2, 3, 1 };
            mesh.RecalculateNormals();
            return mesh;
        }
    }
}

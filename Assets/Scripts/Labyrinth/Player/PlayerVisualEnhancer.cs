using UnityEngine;

namespace Cristal.CLI.Labyrinth
{
    /// <summary>
    /// Transforms the player visual into something more interesting at runtime.
    /// Adds visual flair to demonstrate dynamic changes.
    /// </summary>
    public class PlayerVisualEnhancer : MonoBehaviour
    {
        [Header("Visual Settings")]
        [SerializeField] private Color _primaryColor = new Color(0.2f, 0.9f, 0.6f, 1f);
        [SerializeField] private Color _secondaryColor = new Color(0.1f, 0.4f, 0.8f, 1f);
        [SerializeField] private float _pulseSpeed = 2f;
        [SerializeField] private float _rotationSpeed = 30f;
        [SerializeField] private float _hoverAmplitude = 0.1f;
        [SerializeField] private float _hoverSpeed = 1.5f;

        [Header("Geometry")]
        [SerializeField] private bool _useOctahedron = true;
        [SerializeField] private int _orbitingSpheres = 3;
        [SerializeField] private float _orbitRadius = 0.8f;
        [SerializeField] private float _orbitSpeed = 60f;

        private Material _mainMaterial;
        private Transform _visualTransform;
        private GameObject[] _orbiters;
        private float _initialY;
        private MeshFilter _meshFilter;

        private void Start()
        {
            Debug.Log("[PlayerVisualEnhancer] Start() called on " + gameObject.name);
            SetupVisual();
        }

        private void SetupVisual()
        {
            Debug.Log("[PlayerVisualEnhancer] SetupVisual() - Position: " + transform.position);
            
            // Find or create visual child
            _visualTransform = transform.Find("PlayerVisual");
            if (_visualTransform == null)
            {
                Debug.Log("[PlayerVisualEnhancer] Creating new PlayerVisual");
                // Create visual if missing
                var visualGO = GameObject.CreatePrimitive(PrimitiveType.Cube);
                visualGO.name = "PlayerVisual";
                visualGO.transform.SetParent(transform);
                visualGO.transform.localPosition = new Vector3(0, 0.9f, 0);
                visualGO.transform.localScale = Vector3.one * 2f; // Make it bigger!
                _visualTransform = visualGO.transform;
                
                // Remove collider from visual
                var col = visualGO.GetComponent<Collider>();
                if (col) Destroy(col);
            }
            else
            {
                Debug.Log("[PlayerVisualEnhancer] Found existing PlayerVisual at " + _visualTransform.position);
            }

            _initialY = _visualTransform.localPosition.y;
            _meshFilter = _visualTransform.GetComponent<MeshFilter>();

            // Create custom mesh if using octahedron
            if (_useOctahedron && _meshFilter != null)
            {
                _meshFilter.mesh = CreateOctahedronMesh();
                _visualTransform.localScale = Vector3.one * 0.7f;
            }

            // Setup emissive material
            var renderer = _visualTransform.GetComponent<MeshRenderer>();
            if (renderer != null)
            {
                _mainMaterial = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                _mainMaterial.SetColor("_BaseColor", _primaryColor);
                _mainMaterial.SetColor("_EmissionColor", _primaryColor * 2f);
                _mainMaterial.EnableKeyword("_EMISSION");
                renderer.material = _mainMaterial;
            }

            // Create orbiting spheres
            CreateOrbiters();
        }

        private void CreateOrbiters()
        {
            _orbiters = new GameObject[_orbitingSpheres];
            
            for (int i = 0; i < _orbitingSpheres; i++)
            {
                var orbiter = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                orbiter.name = $"Orbiter_{i}";
                orbiter.transform.SetParent(transform);
                orbiter.transform.localScale = Vector3.one * 0.15f;
                
                // Remove collider
                var col = orbiter.GetComponent<Collider>();
                if (col) Destroy(col);
                
                // Emissive material for orbiters
                var mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
                var orbiterColor = Color.Lerp(_primaryColor, _secondaryColor, (float)i / _orbitingSpheres);
                mat.SetColor("_BaseColor", orbiterColor);
                mat.SetColor("_EmissionColor", orbiterColor * 3f);
                mat.EnableKeyword("_EMISSION");
                orbiter.GetComponent<MeshRenderer>().material = mat;
                
                _orbiters[i] = orbiter;
            }
        }

        private void Update()
        {
            float time = Time.time;
            
            // Hover effect
            if (_visualTransform != null)
            {
                var pos = _visualTransform.localPosition;
                pos.y = _initialY + Mathf.Sin(time * _hoverSpeed) * _hoverAmplitude;
                _visualTransform.localPosition = pos;
                
                // Slow rotation
                _visualTransform.Rotate(Vector3.up, _rotationSpeed * Time.deltaTime, Space.Self);
            }
            
            // Pulse emission
            if (_mainMaterial != null)
            {
                float pulse = (Mathf.Sin(time * _pulseSpeed) + 1f) * 0.5f;
                Color emissionColor = Color.Lerp(_primaryColor, _secondaryColor, pulse) * (1.5f + pulse);
                _mainMaterial.SetColor("_EmissionColor", emissionColor);
            }
            
            // Orbit the spheres
            UpdateOrbiters(time);
        }

        private void UpdateOrbiters(float time)
        {
            if (_orbiters == null) return;
            
            for (int i = 0; i < _orbiters.Length; i++)
            {
                if (_orbiters[i] == null) continue;
                
                float angle = (time * _orbitSpeed + i * (360f / _orbiters.Length)) * Mathf.Deg2Rad;
                float verticalOffset = Mathf.Sin(time * 2f + i) * 0.2f;
                
                Vector3 orbitPos = new Vector3(
                    Mathf.Cos(angle) * _orbitRadius,
                    0.9f + verticalOffset,
                    Mathf.Sin(angle) * _orbitRadius
                );
                
                _orbiters[i].transform.localPosition = orbitPos;
            }
        }

        private Mesh CreateOctahedronMesh()
        {
            Mesh mesh = new Mesh();
            mesh.name = "Octahedron";

            // Vertices - 6 points (top, bottom, 4 middle)
            Vector3[] vertices = new Vector3[]
            {
                new Vector3(0, 1, 0),   // Top
                new Vector3(0, -1, 0),  // Bottom
                new Vector3(1, 0, 0),   // Right
                new Vector3(-1, 0, 0),  // Left
                new Vector3(0, 0, 1),   // Front
                new Vector3(0, 0, -1)   // Back
            };

            // Triangles - 8 faces
            int[] triangles = new int[]
            {
                // Top faces
                0, 4, 2,  // Top-Front-Right
                0, 2, 5,  // Top-Right-Back
                0, 5, 3,  // Top-Back-Left
                0, 3, 4,  // Top-Left-Front
                // Bottom faces
                1, 2, 4,  // Bottom-Right-Front
                1, 5, 2,  // Bottom-Back-Right
                1, 3, 5,  // Bottom-Left-Back
                1, 4, 3   // Bottom-Front-Left
            };

            mesh.vertices = vertices;
            mesh.triangles = triangles;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();

            return mesh;
        }
    }
}

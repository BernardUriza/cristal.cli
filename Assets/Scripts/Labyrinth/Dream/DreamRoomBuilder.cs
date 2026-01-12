using System.Collections.Generic;
using UnityEngine;

namespace Cristal.CLI.Labyrinth.Dream
{
    /// <summary>
    /// Builds procedural dream tunnel geometry at runtime.
    /// Extends RuntimeRoomBuilder patterns for dream-specific effects.
    /// </summary>
    public static class DreamRoomBuilder
    {
        private static readonly float WALL_THICKNESS = 0.15f;
        private static readonly float DEFAULT_ROOM_HEIGHT = 6f;

        #region Dream Tunnel Creation

        /// <summary>
        /// Create a complete dream tunnel with rooms and effects.
        /// </summary>
        public static DreamTunnel CreateDreamTunnel(DreamConfig config, Vector3 position)
        {
            // Create root object
            var tunnelObj = new GameObject($"DreamTunnel_{config.themeName}");
            tunnelObj.transform.position = position;
            tunnelObj.layer = LayerMask.NameToLayer("Dream");

            var tunnel = tunnelObj.AddComponent<DreamTunnel>();

            // Create room container
            var roomContainer = new GameObject("Rooms");
            roomContainer.transform.SetParent(tunnelObj.transform);
            roomContainer.transform.localPosition = Vector3.zero;

            // Generate room layout
            var roomLayouts = GenerateRoomLayouts(config);

            // Create rooms
            Vector3 currentPosition = Vector3.zero;
            DreamRoom previousRoom = null;

            for (int i = 0; i < roomLayouts.Count; i++)
            {
                var layout = roomLayouts[i];
                var room = CreateDreamRoom(i, layout, config, roomContainer.transform, currentPosition);
                tunnel.RegisterRoom(room);

                // Create connection to previous room
                if (previousRoom != null)
                {
                    CreateRoomConnection(previousRoom, room, config);
                }

                // Update position for next room
                currentPosition += layout.exitDirection * (layout.size.z + 4f);
                previousRoom = room;
            }

            // Create spawn point at first room
            var spawnPoint = new GameObject("SpawnPoint");
            spawnPoint.transform.SetParent(tunnelObj.transform);
            spawnPoint.transform.localPosition = new Vector3(0, 1f, 2f);

            // Create exit point at last room
            var exitPoint = new GameObject("ExitPoint");
            exitPoint.transform.SetParent(previousRoom?.transform ?? tunnelObj.transform);
            exitPoint.transform.localPosition = new Vector3(0, 1f, previousRoom?.RoomSize.z * 0.5f ?? 5f);

            // Create effects container
            CreateTunnelEffects(tunnel, config);

            // Initialize tunnel
            tunnel.Initialize(config);

            return tunnel;
        }

        #endregion

        #region Room Layout Generation

        private static List<DreamRoomLayout> GenerateRoomLayouts(DreamConfig config)
        {
            var layouts = new List<DreamRoomLayout>();

            for (int i = 0; i < config.roomCount; i++)
            {
                float progress = i / (float)(config.roomCount - 1);

                var layout = new DreamRoomLayout
                {
                    roomType = DetermineRoomType(i, config.roomCount, config),
                    size = CalculateRoomSize(i, config),
                    exitDirection = DetermineExitDirection(i, config),
                    hasNarrative = Random.value > 0.5f,
                    specialFeature = DetermineSpecialFeature(progress, config)
                };

                layouts.Add(layout);
            }

            return layouts;
        }

        private static DreamRoomType DetermineRoomType(int index, int totalRooms, DreamConfig config)
        {
            if (index == 0) return DreamRoomType.Threshold;
            if (index == totalRooms - 1) return DreamRoomType.Core;

            float rand = Random.value;
            if (config.isUnbound)
            {
                // Unbound dreams have more chaotic layouts
                if (rand < 0.3f) return DreamRoomType.Junction;
                if (rand < 0.5f) return DreamRoomType.Chamber;
            }

            if (rand < 0.6f) return DreamRoomType.Corridor;
            if (rand < 0.85f) return DreamRoomType.Chamber;
            return DreamRoomType.Junction;
        }

        private static Vector3 CalculateRoomSize(int index, DreamConfig config)
        {
            float baseWidth = Random.Range(8f, 16f);
            float baseDepth = Random.Range(10f, 20f);
            float height = DEFAULT_ROOM_HEIGHT;

            if (config.isUnbound)
            {
                // Unbound rooms get more extreme
                baseWidth *= Random.Range(0.7f, 1.5f);
                baseDepth *= Random.Range(0.7f, 1.5f);
                height *= Random.Range(0.8f, 2f);
            }

            // Core room is larger
            if (index == config.roomCount - 1)
            {
                baseWidth *= 1.5f;
                baseDepth *= 1.5f;
            }

            return new Vector3(baseWidth, height, baseDepth);
        }

        private static Vector3 DetermineExitDirection(int index, DreamConfig config)
        {
            // Base direction is forward
            Vector3 direction = Vector3.forward;

            if (config.isUnbound)
            {
                // Unbound can have weird angles
                float angle = Random.Range(-30f, 30f);
                direction = Quaternion.Euler(0, angle, 0) * direction;
            }

            return direction.normalized;
        }

        private static DreamSpecialFeature DetermineSpecialFeature(float progress, DreamConfig config)
        {
            if (config.isUnbound && progress > 0.8f)
            {
                return DreamSpecialFeature.VoidMirror;
            }

            float rand = Random.value;
            if (rand < 0.2f) return DreamSpecialFeature.FloatingSymbols;
            if (rand < 0.35f) return DreamSpecialFeature.ReflectivePool;
            if (rand < 0.45f) return DreamSpecialFeature.BreathingWalls;

            return DreamSpecialFeature.None;
        }

        #endregion

        #region Room Creation

        private static DreamRoom CreateDreamRoom(int index, DreamRoomLayout layout, DreamConfig config, Transform parent, Vector3 position)
        {
            var roomObj = new GameObject($"DreamRoom_{index}_{layout.roomType}");
            roomObj.transform.SetParent(parent);
            roomObj.transform.localPosition = position;

            var room = roomObj.AddComponent<DreamRoom>();

            // Create geometry
            CreateRoomGeometry(roomObj, layout, config);

            // Create trigger volume
            CreateRoomTrigger(roomObj, layout.size);

            // Create room light
            CreateRoomLight(roomObj, layout.size, config);

            // Create particles
            CreateRoomParticles(roomObj, layout.size, config);

            // Create special features
            if (layout.specialFeature != DreamSpecialFeature.None)
            {
                CreateSpecialFeature(roomObj, layout, config);
            }

            // Initialize room
            room.Initialize(index, config);

            return room;
        }

        private static void CreateRoomGeometry(GameObject roomObj, DreamRoomLayout layout, DreamConfig config)
        {
            var geoContainer = new GameObject("Geometry");
            geoContainer.transform.SetParent(roomObj.transform);
            geoContainer.transform.localPosition = Vector3.zero;

            // Floor
            var floor = CreateDreamQuad("Floor", layout.size.x, layout.size.z, config);
            floor.transform.SetParent(geoContainer.transform);
            floor.transform.localPosition = Vector3.zero;
            floor.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

            // Ceiling
            var ceiling = CreateDreamQuad("Ceiling", layout.size.x, layout.size.z, config);
            ceiling.transform.SetParent(geoContainer.transform);
            ceiling.transform.localPosition = new Vector3(0, layout.size.y, 0);
            ceiling.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);

            // Walls
            // Left wall
            var leftWall = CreateDreamQuad("WallLeft", layout.size.z, layout.size.y, config);
            leftWall.transform.SetParent(geoContainer.transform);
            leftWall.transform.localPosition = new Vector3(-layout.size.x * 0.5f, layout.size.y * 0.5f, 0);
            leftWall.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);

            // Right wall
            var rightWall = CreateDreamQuad("WallRight", layout.size.z, layout.size.y, config);
            rightWall.transform.SetParent(geoContainer.transform);
            rightWall.transform.localPosition = new Vector3(layout.size.x * 0.5f, layout.size.y * 0.5f, 0);
            rightWall.transform.localRotation = Quaternion.Euler(0f, -90f, 0f);

            // Back wall
            var backWall = CreateDreamQuad("WallBack", layout.size.x, layout.size.y, config);
            backWall.transform.SetParent(geoContainer.transform);
            backWall.transform.localPosition = new Vector3(0, layout.size.y * 0.5f, -layout.size.z * 0.5f);
            backWall.transform.localRotation = Quaternion.Euler(0f, 0f, 0f);

            // Front wall (with doorway)
            CreateWallWithDoorway(geoContainer.transform, layout, config);
        }

        private static GameObject CreateDreamQuad(string name, float width, float height, DreamConfig config)
        {
            var quad = GameObject.CreatePrimitive(PrimitiveType.Quad);
            quad.name = name;
            quad.transform.localScale = new Vector3(width, height, 1f);

            // Remove collider from rendering mesh
            Object.Destroy(quad.GetComponent<Collider>());

            // Apply dream material
            var renderer = quad.GetComponent<MeshRenderer>();
            renderer.material = CreateDreamMaterial(config);

            return quad;
        }

        private static void CreateWallWithDoorway(Transform parent, DreamRoomLayout layout, DreamConfig config)
        {
            float doorWidth = 3f;
            float doorHeight = layout.size.y * 0.8f;
            float wallWidth = layout.size.x;
            float wallHeight = layout.size.y;

            // Left section
            float leftWidth = (wallWidth - doorWidth) * 0.5f;
            if (leftWidth > 0.1f)
            {
                var leftSection = CreateDreamQuad("WallFront_L", leftWidth, wallHeight, config);
                leftSection.transform.SetParent(parent);
                leftSection.transform.localPosition = new Vector3(
                    -wallWidth * 0.5f + leftWidth * 0.5f,
                    wallHeight * 0.5f,
                    layout.size.z * 0.5f
                );
                leftSection.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            }

            // Right section
            float rightWidth = (wallWidth - doorWidth) * 0.5f;
            if (rightWidth > 0.1f)
            {
                var rightSection = CreateDreamQuad("WallFront_R", rightWidth, wallHeight, config);
                rightSection.transform.SetParent(parent);
                rightSection.transform.localPosition = new Vector3(
                    wallWidth * 0.5f - rightWidth * 0.5f,
                    wallHeight * 0.5f,
                    layout.size.z * 0.5f
                );
                rightSection.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            }

            // Top section above door
            float topHeight = wallHeight - doorHeight;
            if (topHeight > 0.1f)
            {
                var topSection = CreateDreamQuad("WallFront_T", doorWidth, topHeight, config);
                topSection.transform.SetParent(parent);
                topSection.transform.localPosition = new Vector3(
                    0,
                    doorHeight + topHeight * 0.5f,
                    layout.size.z * 0.5f
                );
                topSection.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            }
        }

        private static Material CreateDreamMaterial(DreamConfig config)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null)
            {
                shader = Shader.Find("Standard");
            }

            var material = new Material(shader);
            material.color = Color.Lerp(config.primaryColor, Color.black, 0.5f);
            material.SetColor("_EmissionColor", config.primaryColor * 0.2f);
            material.EnableKeyword("_EMISSION");

            return material;
        }

        #endregion

        #region Room Components

        private static void CreateRoomTrigger(GameObject roomObj, Vector3 size)
        {
            var triggerObj = new GameObject("Trigger");
            triggerObj.transform.SetParent(roomObj.transform);
            triggerObj.transform.localPosition = new Vector3(0, size.y * 0.5f, 0);

            var collider = triggerObj.AddComponent<BoxCollider>();
            collider.size = size;
            collider.isTrigger = true;
        }

        private static void CreateRoomLight(GameObject roomObj, Vector3 size, DreamConfig config)
        {
            var lightObj = new GameObject("RoomLight");
            lightObj.transform.SetParent(roomObj.transform);
            lightObj.transform.localPosition = new Vector3(0, size.y - 0.5f, 0);

            var light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = config.primaryColor;
            light.intensity = 0.5f;
            light.range = Mathf.Max(size.x, size.z) * 1.5f;
            light.shadows = LightShadows.Soft;
            light.enabled = false; // Enabled when room is active
        }

        private static void CreateRoomParticles(GameObject roomObj, Vector3 size, DreamConfig config)
        {
            var particleObj = new GameObject("DreamDust");
            particleObj.transform.SetParent(roomObj.transform);
            particleObj.transform.localPosition = new Vector3(0, size.y * 0.5f, 0);

            var particles = particleObj.AddComponent<ParticleSystem>();
            var main = particles.main;
            main.startColor = new ParticleSystem.MinMaxGradient(
                config.primaryColor * 0.3f,
                config.secondaryColor * 0.5f
            );
            main.startSize = new ParticleSystem.MinMaxCurve(0.05f, 0.2f);
            main.startLifetime = new ParticleSystem.MinMaxCurve(3f, 8f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(0.1f, 0.3f);
            main.maxParticles = 100;
            main.loop = true;
            main.playOnAwake = false;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            var emission = particles.emission;
            emission.rateOverTime = 5f;

            var shape = particles.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = size * 0.9f;

            var renderer = particles.GetComponent<ParticleSystemRenderer>();
            renderer.material = new Material(Shader.Find("Particles/Standard Unlit"));
            renderer.material.color = Color.white;
        }

        #endregion

        #region Room Connections

        private static void CreateRoomConnection(DreamRoom from, DreamRoom to, DreamConfig config)
        {
            // Calculate connection points
            Vector3 fromExit = from.transform.position + from.transform.forward * from.RoomSize.z * 0.5f;
            Vector3 toEntry = to.transform.position - to.transform.forward * to.RoomSize.z * 0.5f;

            // Create corridor between rooms
            Vector3 midPoint = (fromExit + toEntry) * 0.5f;
            float distance = Vector3.Distance(fromExit, toEntry);

            if (distance < 0.1f) return;

            var corridorObj = new GameObject("Corridor");
            corridorObj.transform.SetParent(from.transform.parent);
            corridorObj.transform.position = midPoint;
            corridorObj.transform.LookAt(toEntry);

            // Create corridor geometry
            var floor = CreateDreamQuad("Floor", 3f, distance, config);
            floor.transform.SetParent(corridorObj.transform);
            floor.transform.localPosition = new Vector3(0, 0, 0);
            floor.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);

            var ceiling = CreateDreamQuad("Ceiling", 3f, distance, config);
            ceiling.transform.SetParent(corridorObj.transform);
            ceiling.transform.localPosition = new Vector3(0, DEFAULT_ROOM_HEIGHT, 0);
            ceiling.transform.localRotation = Quaternion.Euler(-90f, 0f, 0f);

            var leftWall = CreateDreamQuad("WallLeft", distance, DEFAULT_ROOM_HEIGHT, config);
            leftWall.transform.SetParent(corridorObj.transform);
            leftWall.transform.localPosition = new Vector3(-1.5f, DEFAULT_ROOM_HEIGHT * 0.5f, 0);
            leftWall.transform.localRotation = Quaternion.Euler(0f, 90f, 0f);

            var rightWall = CreateDreamQuad("WallRight", distance, DEFAULT_ROOM_HEIGHT, config);
            rightWall.transform.SetParent(corridorObj.transform);
            rightWall.transform.localPosition = new Vector3(1.5f, DEFAULT_ROOM_HEIGHT * 0.5f, 0);
            rightWall.transform.localRotation = Quaternion.Euler(0f, -90f, 0f);
        }

        #endregion

        #region Special Features

        private static void CreateSpecialFeature(GameObject roomObj, DreamRoomLayout layout, DreamConfig config)
        {
            switch (layout.specialFeature)
            {
                case DreamSpecialFeature.FloatingSymbols:
                    CreateFloatingSymbols(roomObj, layout.size, config);
                    break;
                case DreamSpecialFeature.ReflectivePool:
                    CreateReflectivePool(roomObj, layout.size, config);
                    break;
                case DreamSpecialFeature.BreathingWalls:
                    CreateBreathingWalls(roomObj, layout.size, config);
                    break;
                case DreamSpecialFeature.VoidMirror:
                    CreateVoidMirror(roomObj, layout.size, config);
                    break;
            }
        }

        private static void CreateFloatingSymbols(GameObject roomObj, Vector3 size, DreamConfig config)
        {
            var symbolsContainer = new GameObject("FloatingSymbols");
            symbolsContainer.transform.SetParent(roomObj.transform);
            symbolsContainer.transform.localPosition = Vector3.zero;

            // Create floating arcana symbols
            int symbolCount = Random.Range(3, 7);
            for (int i = 0; i < symbolCount; i++)
            {
                var symbolObj = CreateFloatingSymbol(config);
                symbolObj.transform.SetParent(symbolsContainer.transform);
                symbolObj.transform.localPosition = new Vector3(
                    Random.Range(-size.x * 0.4f, size.x * 0.4f),
                    Random.Range(size.y * 0.3f, size.y * 0.8f),
                    Random.Range(-size.z * 0.4f, size.z * 0.4f)
                );

                // Add floating animation
                var floater = symbolObj.AddComponent<FloatingObject>();
                floater.Initialize(Random.Range(0.5f, 1.5f), Random.Range(0.2f, 0.5f));
            }
        }

        private static GameObject CreateFloatingSymbol(DreamConfig config)
        {
            var symbol = GameObject.CreatePrimitive(PrimitiveType.Quad);
            symbol.name = "Symbol";
            symbol.transform.localScale = Vector3.one * Random.Range(0.3f, 0.8f);

            Object.Destroy(symbol.GetComponent<Collider>());

            var renderer = symbol.GetComponent<MeshRenderer>();
            renderer.material = new Material(Shader.Find("Universal Render Pipeline/Unlit"));
            renderer.material.color = config.primaryColor;
            renderer.material.SetFloat("_Surface", 1); // Transparent

            return symbol;
        }

        private static void CreateReflectivePool(GameObject roomObj, Vector3 size, DreamConfig config)
        {
            var poolObj = GameObject.CreatePrimitive(PrimitiveType.Quad);
            poolObj.name = "ReflectivePool";
            poolObj.transform.SetParent(roomObj.transform);
            poolObj.transform.localPosition = new Vector3(0, 0.01f, 0);
            poolObj.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            poolObj.transform.localScale = new Vector3(size.x * 0.6f, size.z * 0.6f, 1f);

            Object.Destroy(poolObj.GetComponent<Collider>());

            var renderer = poolObj.GetComponent<MeshRenderer>();
            renderer.material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            renderer.material.color = new Color(0.1f, 0.1f, 0.2f, 0.8f);
            renderer.material.SetFloat("_Smoothness", 0.95f);
            renderer.material.SetFloat("_Metallic", 0.9f);
        }

        private static void CreateBreathingWalls(GameObject roomObj, Vector3 size, DreamConfig config)
        {
            var breathing = roomObj.AddComponent<BreathingWallsEffect>();
            breathing.Initialize(0.05f, 2f);
        }

        private static void CreateVoidMirror(GameObject roomObj, Vector3 size, DreamConfig config)
        {
            var mirrorObj = GameObject.CreatePrimitive(PrimitiveType.Quad);
            mirrorObj.name = "VoidMirror";
            mirrorObj.transform.SetParent(roomObj.transform);
            mirrorObj.transform.localPosition = new Vector3(0, size.y * 0.5f, size.z * 0.45f);
            mirrorObj.transform.localRotation = Quaternion.Euler(0f, 180f, 0f);
            mirrorObj.transform.localScale = new Vector3(size.x * 0.4f, size.y * 0.6f, 1f);

            Object.Destroy(mirrorObj.GetComponent<Collider>());

            var renderer = mirrorObj.GetComponent<MeshRenderer>();
            renderer.material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            renderer.material.color = Color.black;
            renderer.material.SetColor("_EmissionColor", config.primaryColor * 0.5f);
            renderer.material.EnableKeyword("_EMISSION");
            renderer.material.SetFloat("_Smoothness", 1f);
            renderer.material.SetFloat("_Metallic", 1f);
        }

        #endregion

        #region Tunnel Effects

        private static void CreateTunnelEffects(DreamTunnel tunnel, DreamConfig config)
        {
            var effectsContainer = new GameObject("Effects");
            effectsContainer.transform.SetParent(tunnel.transform);
            effectsContainer.transform.localPosition = Vector3.zero;

            // Global dream dust
            CreateGlobalDreamDust(effectsContainer.transform, config);

            // Ambient light
            CreateAmbientLight(effectsContainer.transform, config);
        }

        private static void CreateGlobalDreamDust(Transform parent, DreamConfig config)
        {
            var dustObj = new GameObject("GlobalDreamDust");
            dustObj.transform.SetParent(parent);
            dustObj.transform.localPosition = Vector3.zero;

            var particles = dustObj.AddComponent<ParticleSystem>();
            var main = particles.main;
            main.startColor = config.primaryColor * 0.5f;
            main.startSize = new ParticleSystem.MinMaxCurve(0.02f, 0.1f);
            main.startLifetime = 10f;
            main.maxParticles = 500;
            main.loop = true;
            main.playOnAwake = false;

            var emission = particles.emission;
            emission.rateOverTime = 20f;

            var shape = particles.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(100f, 20f, 100f);
        }

        private static void CreateAmbientLight(Transform parent, DreamConfig config)
        {
            var lightObj = new GameObject("AmbientLight");
            lightObj.transform.SetParent(parent);
            lightObj.transform.localPosition = new Vector3(0, 20f, 0);

            var light = lightObj.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = config.primaryColor;
            light.intensity = 0f; // Started disabled
            light.shadows = LightShadows.Soft;
        }

        #endregion
    }

    #region Helper Types

    public class DreamRoomLayout
    {
        public DreamRoomType roomType;
        public Vector3 size;
        public Vector3 exitDirection = Vector3.forward;
        public bool hasNarrative;
        public DreamSpecialFeature specialFeature;
    }

    public enum DreamSpecialFeature
    {
        None,
        FloatingSymbols,
        ReflectivePool,
        BreathingWalls,
        VoidMirror
    }

    #endregion

    #region Effect Components

    /// <summary>
    /// Makes an object float up and down smoothly.
    /// </summary>
    public class FloatingObject : MonoBehaviour
    {
        private float _frequency;
        private float _amplitude;
        private Vector3 _startPosition;
        private float _timeOffset;

        public void Initialize(float frequency, float amplitude)
        {
            _frequency = frequency;
            _amplitude = amplitude;
            _startPosition = transform.localPosition;
            _timeOffset = UnityEngine.Random.Range(0f, Mathf.PI * 2f);
        }

        private void Update()
        {
            float yOffset = Mathf.Sin((Time.time + _timeOffset) * _frequency) * _amplitude;
            transform.localPosition = _startPosition + Vector3.up * yOffset;

            // Also rotate slowly
            transform.Rotate(Vector3.up, Time.deltaTime * 20f);
        }
    }

    /// <summary>
    /// Creates a breathing effect on room walls.
    /// </summary>
    public class BreathingWallsEffect : MonoBehaviour
    {
        private float _intensity;
        private float _frequency;
        private List<Transform> _walls = new List<Transform>();
        private Dictionary<Transform, Vector3> _originalScales = new Dictionary<Transform, Vector3>();

        public void Initialize(float intensity, float frequency)
        {
            _intensity = intensity;
            _frequency = frequency;

            // Collect wall transforms
            var geometry = transform.Find("Geometry");
            if (geometry != null)
            {
                foreach (Transform child in geometry)
                {
                    if (child.name.Contains("Wall"))
                    {
                        _walls.Add(child);
                        _originalScales[child] = child.localScale;
                    }
                }
            }
        }

        private void Update()
        {
            float breathe = Mathf.Sin(Time.time * _frequency) * _intensity;

            foreach (var wall in _walls)
            {
                if (_originalScales.TryGetValue(wall, out Vector3 originalScale))
                {
                    wall.localScale = originalScale * (1f + breathe);
                }
            }
        }
    }

    #endregion
}

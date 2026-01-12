using UnityEngine;
using UnityEditor;
using System.IO;

namespace Cristal.CLI.Labyrinth.Player.Editor
{
    /// <summary>
    /// Unity Editor utility to create AvatarData assets for all downloaded Mixamo characters.
    /// Menu: CRISTAL > Create Avatar Database
    /// </summary>
    public static class AvatarDataCreator
    {
        private const string MODELS_PATH = "Assets/Models/Characters";
        private const string MIXAMO_SOURCE_PATH = "Mixamo";
        private const string AVATARS_RESOURCE_PATH = "Assets/Resources/Avatars";
        private const string PREFABS_PATH = "Assets/Prefabs/Labyrinth/Player/Avatars";

        [MenuItem("CRISTAL/Create Avatar Database")]
        public static void CreateAvatarDatabase()
        {
            // Ensure directories exist
            EnsureDirectoryExists(MODELS_PATH);
            EnsureDirectoryExists(AVATARS_RESOURCE_PATH);
            EnsureDirectoryExists(PREFABS_PATH);

            // Import FBX files from Mixamo/ to Assets/Models/Characters/
            ImportMixamoModels();

            AssetDatabase.Refresh();
            AssetDatabase.SaveAssets();

            // Define avatar configs
            var avatarConfigs = new[]
            {
                new AvatarConfig
                {
                    id = "vampire_lusth",
                    displayName = "El Nosferatu",
                    fbxName = "Vampire A Lusth",
                    archetype = AvatarArchetype.TheEldritch,
                    description = "Vampiro ancestral, testigo de épocas olvidadas",
                    flavorText = "\"La inmortalidad no es un regalo. Es una condena a recordar todo lo que has perdido.\"",
                    themeColor = new Color(0.6f, 0.1f, 0.2f) // Rojo sangre
                },
                new AvatarConfig
                {
                    id = "demon_wiezzorek",
                    displayName = "El Atormentado",
                    fbxName = "Demon T Wiezzorek",
                    archetype = AvatarArchetype.TheEldritch,
                    description = "Demonio que cuestiona su propia naturaleza",
                    flavorText = "\"¿Soy malvado porque así nací, o porque así me nombraron?\"",
                    themeColor = new Color(0.8f, 0.3f, 0.1f) // Naranja infernal
                },
                new AvatarConfig
                {
                    id = "skeletonzombie",
                    displayName = "El Descompuesto",
                    fbxName = "Skeletonzombie T Avelange",
                    archetype = AvatarArchetype.TheHollow,
                    description = "Ni vivo ni muerto, atrapado entre estados",
                    flavorText = "\"La carne se pudre, los huesos permanecen. ¿Qué queda del 'yo'?\"",
                    themeColor = new Color(0.4f, 0.5f, 0.3f) // Verde necrosis
                },
                new AvatarConfig
                {
                    id = "zombiegirl",
                    displayName = "La Infectada",
                    fbxName = "Zombiegirl W Kurniawan",
                    archetype = AvatarArchetype.TheCorrupted,
                    description = "Consciencia fragmentada en cuerpo corrupto",
                    flavorText = "\"¿Cuánto de 'yo' queda cuando mi carne ya no me pertenece?\"",
                    themeColor = new Color(0.3f, 0.5f, 0.4f) // Verde pálido
                },
                new AvatarConfig
                {
                    id = "prisoner",
                    displayName = "El Encarcelado",
                    fbxName = "Prisoner B Styperek",
                    archetype = AvatarArchetype.TheForsaken,
                    description = "Prisionero que ha olvidado su crimen",
                    flavorText = "\"Llevo tanto tiempo aquí que olvidé si merecía estar encerrado.\"",
                    themeColor = new Color(0.3f, 0.3f, 0.3f) // Gris celda
                },
                new AvatarConfig
                {
                    id = "mutant",
                    displayName = "El Mutante",
                    fbxName = "Mutant",
                    archetype = AvatarArchetype.TheCorrupted,
                    description = "Forma alterada por fuerzas desconocidas",
                    flavorText = "\"Mi cuerpo cambió. Mi mente se adaptó. ¿Soy evolución o error?\"",
                    themeColor = new Color(0.6f, 0.5f, 0.2f) // Amarillo radiactivo
                }
            };

            int created = 0;
            foreach (var config in avatarConfigs)
            {
                if (CreateAvatarAsset(config))
                {
                    created++;
                }
            }

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log($"[AvatarDataCreator] Created {created}/{avatarConfigs.Length} avatar assets");
            EditorUtility.DisplayDialog("Avatar Database Created",
                $"Successfully created {created} avatar assets in {AVATARS_RESOURCE_PATH}",
                "OK");
        }

        private static bool CreateAvatarAsset(AvatarConfig config)
        {
            // Find FBX model
            string fbxPath = $"{MODELS_PATH}/{config.fbxName}.fbx";
            GameObject fbxModel = AssetDatabase.LoadAssetAtPath<GameObject>(fbxPath);

            if (fbxModel == null)
            {
                Debug.LogWarning($"[AvatarDataCreator] FBX not found: {fbxPath}");
                return false;
            }

            // Create or load prefab
            string prefabPath = $"{PREFABS_PATH}/{config.id}.prefab";
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(prefabPath);

            if (prefab == null)
            {
                // Create prefab from FBX
                prefab = PrefabUtility.SaveAsPrefabAsset(fbxModel, prefabPath);
                Debug.Log($"[AvatarDataCreator] Created prefab: {prefabPath}");
            }

            // Create AvatarData asset
            string avatarDataPath = $"{AVATARS_RESOURCE_PATH}/{config.id}.asset";
            AvatarData avatarData = AssetDatabase.LoadAssetAtPath<AvatarData>(avatarDataPath);

            if (avatarData == null)
            {
                avatarData = ScriptableObject.CreateInstance<AvatarData>();
                AssetDatabase.CreateAsset(avatarData, avatarDataPath);
            }

            // Configure AvatarData via SerializedObject (to avoid direct field access)
            SerializedObject so = new SerializedObject(avatarData);
            so.FindProperty("_avatarId").stringValue = config.id;
            so.FindProperty("_displayName").stringValue = config.displayName;
            so.FindProperty("_description").stringValue = config.description;
            so.FindProperty("_flavorText").stringValue = config.flavorText;
            so.FindProperty("_archetype").enumValueIndex = (int)config.archetype;
            so.FindProperty("_modelPrefab").objectReferenceValue = prefab;
            so.FindProperty("_themeColor").colorValue = config.themeColor;
            so.ApplyModifiedProperties();

            EditorUtility.SetDirty(avatarData);

            Debug.Log($"[AvatarDataCreator] Created/Updated: {avatarDataPath}");
            return true;
        }

        private static void EnsureDirectoryExists(string path)
        {
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
                Debug.Log($"[AvatarDataCreator] Created directory: {path}");
            }
        }

        private static void ImportMixamoModels()
        {
            if (!Directory.Exists(MIXAMO_SOURCE_PATH))
            {
                Debug.LogWarning($"[AvatarDataCreator] Mixamo source folder not found: {MIXAMO_SOURCE_PATH}");
                return;
            }

            string[] fbxFiles = Directory.GetFiles(MIXAMO_SOURCE_PATH, "*.fbx");
            if (fbxFiles.Length == 0)
            {
                Debug.LogWarning("[AvatarDataCreator] No FBX files found in Mixamo folder");
                return;
            }

            int copied = 0;
            foreach (string sourcePath in fbxFiles)
            {
                string fileName = Path.GetFileName(sourcePath);
                string destPath = Path.Combine(MODELS_PATH, fileName);

                if (!File.Exists(destPath))
                {
                    File.Copy(sourcePath, destPath);
                    copied++;
                    Debug.Log($"[AvatarDataCreator] Copied: {fileName}");
                }
            }

            if (copied > 0)
            {
                Debug.Log($"[AvatarDataCreator] Imported {copied} FBX models from Mixamo");
            }
        }

        private struct AvatarConfig
        {
            public string id;
            public string displayName;
            public string fbxName;
            public AvatarArchetype archetype;
            public string description;
            public string flavorText;
            public Color themeColor;
        }
    }
}

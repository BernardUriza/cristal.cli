using UnityEngine;
using UnityEditor;
using System.IO;

namespace Cristal.CLI.Editor
{
    public static class CreateHologramMaterial
    {
        [MenuItem("CRISTAL/Avatar/Create Hologram Material")]
        public static void CreateMaterial()
        {
            // Find the shader
            Shader hologramShader = Shader.Find("CRISTAL/HologramAvatar");

            if (hologramShader == null)
            {
                Debug.LogError("[CRISTAL] Shader 'CRISTAL/HologramAvatar' not found. Make sure HologramAvatar.shader exists.");
                return;
            }

            // Create material
            Material mat = new Material(hologramShader);
            mat.name = "HologramAvatar";

            // Set default values for terminal aesthetic
            mat.SetColor("_MainColor", new Color(0f, 0.9f, 0.7f, 0.6f));      // Cyan-green
            mat.SetColor("_RimColor", new Color(0f, 1f, 0.5f, 1f));           // Bright green rim
            mat.SetFloat("_RimPower", 2.5f);
            mat.SetFloat("_ScanlineSpeed", 1.5f);
            mat.SetFloat("_ScanlineCount", 100f);
            mat.SetFloat("_ScanlineAlpha", 0.25f);
            mat.SetFloat("_GlitchIntensity", 0.05f);
            mat.SetFloat("_FlickerSpeed", 8f);
            mat.SetFloat("_WireframeWidth", 0.01f);
            mat.SetFloat("_Alpha", 0.75f);

            // Ensure directory exists
            string dir = "Assets/Materials/Labyrinth/Avatar";
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            // Save material
            string path = $"{dir}/HologramAvatar.mat";
            AssetDatabase.CreateAsset(mat, path);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // Select in project
            Selection.activeObject = mat;
            EditorGUIUtility.PingObject(mat);

            Debug.Log($"[CRISTAL] Hologram material created at: {path}");
            Debug.Log("[CRISTAL] To apply: Drag the material onto your avatar, or select avatar and assign in SkinnedMeshRenderer.");
        }

        [MenuItem("CRISTAL/Avatar/Apply Hologram to Selected")]
        public static void ApplyToSelected()
        {
            GameObject selected = Selection.activeGameObject;
            if (selected == null)
            {
                Debug.LogError("[CRISTAL] No GameObject selected. Select your avatar first.");
                return;
            }

            // Find or create material
            Material mat = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/Labyrinth/Avatar/HologramAvatar.mat");
            if (mat == null)
            {
                Debug.Log("[CRISTAL] Material not found, creating...");
                CreateMaterial();
                mat = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/Labyrinth/Avatar/HologramAvatar.mat");
            }

            if (mat == null)
            {
                Debug.LogError("[CRISTAL] Could not create or find HologramAvatar material.");
                return;
            }

            // Apply to all renderers
            int count = 0;

            // SkinnedMeshRenderer (for avatars)
            foreach (var smr in selected.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                Material[] mats = new Material[smr.sharedMaterials.Length];
                for (int i = 0; i < mats.Length; i++)
                {
                    mats[i] = mat;
                }
                smr.sharedMaterials = mats;
                count++;
                EditorUtility.SetDirty(smr);
            }

            // MeshRenderer (for static parts)
            foreach (var mr in selected.GetComponentsInChildren<MeshRenderer>(true))
            {
                Material[] mats = new Material[mr.sharedMaterials.Length];
                for (int i = 0; i < mats.Length; i++)
                {
                    mats[i] = mat;
                }
                mr.sharedMaterials = mats;
                count++;
                EditorUtility.SetDirty(mr);
            }

            if (count > 0)
            {
                Debug.Log($"[CRISTAL] Applied hologram material to {count} renderer(s) on '{selected.name}'");

                // If it's a prefab instance, mark for saving
                if (PrefabUtility.IsPartOfPrefabInstance(selected))
                {
                    PrefabUtility.RecordPrefabInstancePropertyModifications(selected);
                }
            }
            else
            {
                Debug.LogWarning("[CRISTAL] No renderers found on selected object.");
            }
        }
    }
}

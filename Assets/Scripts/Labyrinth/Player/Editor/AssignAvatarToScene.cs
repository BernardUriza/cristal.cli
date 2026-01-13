#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class AssignAvatarToScene
    {
        [MenuItem("CRISTAL/Player/Assign Avatar to Scene Player")]
        public static void AssignAvatarInScene()
        {
            // Find RitualOperator in scene
            var player = GameObject.Find("RitualOperator");
            if (player == null)
            {
                Debug.LogError("[AssignAvatar] RitualOperator not found in scene!");
                return;
            }

            var animator = player.GetComponent<Animator>();
            if (animator == null)
            {
                Debug.LogError("[AssignAvatar] No Animator component on RitualOperator!");
                return;
            }

            // Load avatar from Prisoner B Styperek
            string fbxPath = "Assets/Models/Characters/Prisoner B Styperek.fbx";
            Debug.Log($"[AssignAvatar] Loading avatar from: {fbxPath}");

            var assets = AssetDatabase.LoadAllAssetsAtPath(fbxPath);
            Debug.Log($"[AssignAvatar] Found {assets.Length} assets in FBX");

            Avatar foundAvatar = null;
            foreach (var asset in assets)
            {
                Debug.Log($"[AssignAvatar] Asset: {asset.name} - Type: {asset.GetType().Name}");
                if (asset is Avatar)
                {
                    foundAvatar = asset as Avatar;
                    Debug.Log($"[AssignAvatar] Found Avatar: {foundAvatar.name}");
                    break;
                }
            }

            if (foundAvatar != null)
            {
                animator.avatar = foundAvatar;
                EditorUtility.SetDirty(animator);
                EditorUtility.SetDirty(player);

                Debug.Log($"[AssignAvatar] ✓ Avatar assigned: {foundAvatar.name}");
                Debug.Log($"[AssignAvatar] ✓ Avatar valid: {foundAvatar.isValid}");
                Debug.Log($"[AssignAvatar] ✓ Avatar human: {foundAvatar.isHuman}");
                Debug.Log($"[AssignAvatar] ✓ Animator isHuman: {animator.isHuman}");
                Debug.Log($"[AssignAvatar] ✓ Controller: {animator.runtimeAnimatorController?.name ?? "null"}");

                // Mark scene as dirty to save changes
                UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                    UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
                );

                Debug.Log("[AssignAvatar] ✓ Scene marked dirty - avatar will persist");
            }
            else
            {
                Debug.LogError("[AssignAvatar] No Avatar found in FBX! The model may not be configured as Humanoid.");
                Debug.LogError("[AssignAvatar] Check the FBX import settings: Rig > Animation Type should be Humanoid");
            }
        }
    }
}
#endif

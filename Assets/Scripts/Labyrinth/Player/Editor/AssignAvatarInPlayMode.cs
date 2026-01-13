#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class AssignAvatarInPlayMode
    {
        [MenuItem("CRISTAL/Player/Assign Avatar Now (Play Mode)")]
        public static void AssignAvatar()
        {
            if (!EditorApplication.isPlaying)
            {
                Debug.LogWarning("[AssignAvatar] Must be in Play Mode!");
                return;
            }

            var player = GameObject.Find("RitualOperator");
            if (player == null)
            {
                Debug.LogError("[AssignAvatar] RitualOperator not found!");
                return;
            }

            var animator = player.GetComponent<Animator>();
            if (animator == null)
            {
                Debug.LogError("[AssignAvatar] No Animator component!");
                return;
            }

            // Try to load avatar from Prisoner B Styperek
            string fbxPath = "Assets/Models/Characters/Prisoner B Styperek.fbx";
            var assets = AssetDatabase.LoadAllAssetsAtPath(fbxPath);

            Avatar avatar = null;
            foreach (var asset in assets)
            {
                if (asset is Avatar)
                {
                    avatar = asset as Avatar;
                    break;
                }
            }

            if (avatar != null)
            {
                animator.avatar = avatar;
                Debug.Log($"[AssignAvatar] ✓ Avatar assigned: {avatar.name}");
                Debug.Log($"[AssignAvatar] ✓ isHuman: {animator.isHuman}");
                Debug.Log($"[AssignAvatar] ✓ Controller: {animator.runtimeAnimatorController.name}");

                // Test animation by setting Speed
                animator.SetFloat("Speed", 0f);
                Debug.Log("[AssignAvatar] ✓ Set Speed = 0 (Idle)");
            }
            else
            {
                Debug.LogError("[AssignAvatar] No avatar found in FBX!");
            }
        }
    }
}
#endif

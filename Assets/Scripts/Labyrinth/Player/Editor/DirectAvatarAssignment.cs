#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.Linq;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class DirectAvatarAssignment
    {
        [MenuItem("CRISTAL/Player/Direct Avatar Assignment")]
        public static void AssignNow()
        {
            Debug.Log("=== DIRECT AVATAR ASSIGNMENT START ===");

            // Find RitualOperator
            var player = GameObject.Find("RitualOperator");
            if (player == null)
            {
                Debug.LogError("RitualOperator not found!");
                return;
            }
            Debug.Log($"Found: {player.name}");

            // Get Animator
            var animator = player.GetComponent<Animator>();
            if (animator == null)
            {
                Debug.LogError("No Animator!");
                return;
            }
            Debug.Log($"Animator exists, current avatar: {(animator.avatar ? animator.avatar.name : "null")}");

            // Load FBX and find avatar
            string fbxPath = "Assets/Models/Characters/Prisoner B Styperek.fbx";
            var allAssets = AssetDatabase.LoadAllAssetsAtPath(fbxPath);
            Debug.Log($"Loaded {allAssets.Length} assets from FBX");

            var avatar = allAssets.OfType<Avatar>().FirstOrDefault();
            if (avatar == null)
            {
                Debug.LogError("NO AVATAR FOUND IN FBX!");
                Debug.LogError("Assets found:");
                foreach (var a in allAssets)
                {
                    Debug.LogError($"  - {a.name} ({a.GetType().Name})");
                }
                return;
            }

            Debug.Log($"Found avatar: {avatar.name}, isValid: {avatar.isValid}, isHuman: {avatar.isHuman}");

            // Assign
            animator.avatar = avatar;
            EditorUtility.SetDirty(animator);
            EditorUtility.SetDirty(player);

            Debug.Log("✓✓✓ AVATAR ASSIGNED ✓✓✓");
            Debug.Log($"Animator.isHuman: {animator.isHuman}");
            Debug.Log($"Controller: {animator.runtimeAnimatorController?.name}");

            // Save scene
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
            );
            Debug.Log("Scene marked dirty");

            Debug.Log("=== DIRECT AVATAR ASSIGNMENT COMPLETE ===");
        }
    }
}
#endif

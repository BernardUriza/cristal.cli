#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using System.Linq;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class SetupYBotAvatar
    {
        [MenuItem("CRISTAL/Player/Setup Y Bot Avatar")]
        public static void SetupAvatar()
        {
            Debug.Log("=== SETUP Y BOT AVATAR START ===");

            // Find RitualOperator
            var player = GameObject.Find("RitualOperator");
            if (player == null)
            {
                Debug.LogError("[YBot] RitualOperator not found in scene!");
                return;
            }
            Debug.Log($"[YBot] Found: {player.name}");

            // Get Animator
            var animator = player.GetComponent<Animator>();
            if (animator == null)
            {
                Debug.LogError("[YBot] No Animator component!");
                return;
            }

            // Load avatar from Y Bot
            string fbxPath = "Assets/Models/Characters/Y Bot.fbx";
            Debug.Log($"[YBot] Loading avatar from: {fbxPath}");

            var allAssets = AssetDatabase.LoadAllAssetsAtPath(fbxPath);
            Debug.Log($"[YBot] Loaded {allAssets.Length} assets from FBX");

            var avatar = allAssets.OfType<Avatar>().FirstOrDefault();
            if (avatar == null)
            {
                Debug.LogError("[YBot] NO AVATAR FOUND IN FBX!");
                Debug.LogError("[YBot] Assets found:");
                foreach (var a in allAssets)
                {
                    Debug.LogError($"  - {a.name} ({a.GetType().Name})");
                }
                return;
            }

            Debug.Log($"[YBot] Found avatar: {avatar.name}");
            Debug.Log($"[YBot] Avatar valid: {avatar.isValid}");
            Debug.Log($"[YBot] Avatar human: {avatar.isHuman}");

            // Assign avatar
            animator.avatar = avatar;
            EditorUtility.SetDirty(animator);
            EditorUtility.SetDirty(player);

            Debug.Log("[YBot] ✓✓✓ AVATAR ASSIGNED ✓✓✓");
            Debug.Log($"[YBot] Animator.isHuman: {animator.isHuman}");
            Debug.Log($"[YBot] Controller: {animator.runtimeAnimatorController?.name}");

            // Now replace the visual model
            var playerVisual = player.transform.Find("PlayerVisual");
            if (playerVisual != null)
            {
                // Deactivate old visual
                playerVisual.gameObject.SetActive(false);
                Debug.Log("[YBot] Deactivated old PlayerVisual");
            }

            // Find Prisoner B Styperek and disable it
            var prisonerB = player.transform.Find("Prisoner B Styperek");
            if (prisonerB != null)
            {
                prisonerB.gameObject.SetActive(false);
                Debug.Log("[YBot] Deactivated Prisoner B Styperek");
            }

            // Add Y Bot as child
            var yBotPrefab = AssetDatabase.LoadMainAssetAtPath(fbxPath);
            if (yBotPrefab != null)
            {
                var yBotInstance = PrefabUtility.InstantiatePrefab(yBotPrefab, player.transform) as GameObject;
                if (yBotInstance != null)
                {
                    yBotInstance.name = "Y Bot Visual";
                    yBotInstance.transform.localPosition = new Vector3(0, -0.9f, 0);
                    yBotInstance.transform.localRotation = Quaternion.identity;
                    yBotInstance.transform.localScale = Vector3.one;

                    Debug.Log("[YBot] ✓ Y Bot visual added to scene");
                    EditorUtility.SetDirty(yBotInstance);
                }
            }

            // Mark scene dirty
            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEditor.SceneManagement.EditorSceneManager.GetActiveScene()
            );

            Debug.Log("[YBot] ✓ Scene marked dirty");
            Debug.Log("=== SETUP Y BOT AVATAR COMPLETE ===");
        }
    }
}
#endif

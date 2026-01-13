#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class TestAnimationSetup
    {
        [MenuItem("CRISTAL/Player/Test Animation in Play Mode")]
        public static void TestInPlayMode()
        {
            // Find player in scene
            var player = GameObject.Find("RitualOperator");
            if (player == null)
            {
                Debug.LogError("[TestAnimation] RitualOperator not found in scene!");
                return;
            }

            // Get Animator
            var animator = player.GetComponent<Animator>();
            if (animator == null)
            {
                Debug.LogError("[TestAnimation] No Animator on RitualOperator!");
                return;
            }

            // Load the avatar from Prisoner B Styperek model
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
                Debug.Log($"[TestAnimation] Assigned avatar: {avatar.name}");
            }
            else
            {
                Debug.LogWarning("[TestAnimation] No avatar found in FBX!");
            }

            // Verify controller
            if (animator.runtimeAnimatorController == null)
            {
                Debug.LogError("[TestAnimation] No AnimatorController assigned!");
            }
            else
            {
                Debug.Log($"[TestAnimation] Controller: {animator.runtimeAnimatorController.name}");
            }

            // Enter play mode
            EditorApplication.isPlaying = true;

            // Set initial Speed values to test animations
            EditorApplication.playModeStateChanged += OnPlayModeChanged;
        }

        private static void OnPlayModeChanged(PlayModeStateChange state)
        {
            if (state == PlayModeStateChange.EnteredPlayMode)
            {
                var player = GameObject.FindGameObjectWithTag("Player");
                if (player != null)
                {
                    var animator = player.GetComponent<Animator>();
                    if (animator != null)
                    {
                        Debug.Log("[TestAnimation] In Play Mode - Testing animations");

                        // Test idle (Speed = 0)
                        animator.SetFloat("Speed", 0f);
                        Debug.Log("[TestAnimation] Set Speed = 0 (Idle)");

                        // Schedule walk test
                        EditorApplication.delayCall += () =>
                        {
                            if (EditorApplication.isPlaying && animator != null)
                            {
                                animator.SetFloat("Speed", 0.5f);
                                Debug.Log("[TestAnimation] Set Speed = 0.5 (Walk)");

                                // Schedule run test
                                EditorApplication.delayCall += () =>
                                {
                                    if (EditorApplication.isPlaying && animator != null)
                                    {
                                        animator.SetFloat("Speed", 1f);
                                        Debug.Log("[TestAnimation] Set Speed = 1.0 (Run)");
                                    }
                                };
                            }
                        };
                    }
                }

                // Unsubscribe
                EditorApplication.playModeStateChanged -= OnPlayModeChanged;
            }
        }
    }
}
#endif

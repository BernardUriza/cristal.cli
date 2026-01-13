#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;
using System.Linq;

namespace Cristal.CLI.Labyrinth.Editor
{
    public static class SetupExistingAnimatorController
    {
        private const string CONTROLLER_PATH = "Assets/Animations/RitualOperator/RitualOperatorController.controller";
        private const string ANIMATION_FOLDER = "Assets/Animation/Player";

        [MenuItem("CRISTAL/Player/Setup Existing Controller with Animations")]
        public static void SetupController()
        {
            // Load existing controller
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(CONTROLLER_PATH);
            if (controller == null)
            {
                EditorUtility.DisplayDialog("Error",
                    $"Could not find controller at: {CONTROLLER_PATH}",
                    "OK");
                return;
            }

            // Find animation clips
            AnimationClip idle = FindAnimation("BreathingIdle");
            AnimationClip walk = FindAnimation("Walking");
            AnimationClip run = FindAnimation("Running");

            if (idle == null || walk == null || run == null)
            {
                string missing = "";
                if (idle == null) missing += "BreathingIdle.fbx\n";
                if (walk == null) missing += "Walking.fbx\n";
                if (run == null) missing += "Running.fbx\n";

                EditorUtility.DisplayDialog("Missing Animations",
                    $"Could not find the following animations in {ANIMATION_FOLDER}:\n{missing}\n" +
                    "Make sure the FBX files are imported.",
                    "OK");
                return;
            }

            // Get root state machine
            var rootStateMachine = controller.layers[0].stateMachine;

            // Clear existing states if any
            foreach (var state in rootStateMachine.states)
            {
                rootStateMachine.RemoveState(state.state);
            }

            // Create locomotion blend tree
            var blendTree = new BlendTree
            {
                name = "Locomotion",
                blendType = BlendTreeType.Simple1D,
                blendParameter = "Speed",
                useAutomaticThresholds = false
            };

            // Add animations to blend tree
            blendTree.AddChild(idle, 0f);    // Idle at Speed = 0
            blendTree.AddChild(walk, 0.5f);  // Walk at Speed = 0.5
            blendTree.AddChild(run, 1f);     // Run at Speed = 1.0

            // Create locomotion state
            var locomotionState = rootStateMachine.AddState("Locomotion", new Vector3(200, 0, 0));
            locomotionState.motion = blendTree;

            // Set as default state
            rootStateMachine.defaultState = locomotionState;

            // Add blend tree to controller asset
            AssetDatabase.AddObjectToAsset(blendTree, controller);

            // Save
            EditorUtility.SetDirty(controller);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // Select the controller
            Selection.activeObject = controller;
            EditorGUIUtility.PingObject(controller);

            Debug.Log($"[SetupController] Successfully configured {CONTROLLER_PATH}");
            Debug.Log($"[SetupController] Blend tree created with:");
            Debug.Log($"  - Idle: {idle.name} (threshold 0)");
            Debug.Log($"  - Walk: {walk.name} (threshold 0.5)");
            Debug.Log($"  - Run: {run.name} (threshold 1.0)");

            EditorUtility.DisplayDialog("Success",
                "Animator Controller configured successfully!\n\n" +
                "Blend tree created with:\n" +
                $"  - {idle.name} (Speed = 0)\n" +
                $"  - {walk.name} (Speed = 0.5)\n" +
                $"  - {run.name} (Speed = 1.0)",
                "OK");
        }

        private static AnimationClip FindAnimation(string fileName)
        {
            // Search for FBX asset by name
            string[] guids = AssetDatabase.FindAssets($"{fileName} t:Model", new[] { ANIMATION_FOLDER });

            foreach (string guid in guids)
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                if (path.Contains(fileName) && path.EndsWith(".fbx"))
                {
                    // Load all assets from FBX
                    var assets = AssetDatabase.LoadAllAssetsAtPath(path);
                    var clip = assets.OfType<AnimationClip>().FirstOrDefault(c => !c.name.Contains("__preview"));
                    if (clip != null)
                    {
                        Debug.Log($"[SetupController] Found animation: {clip.name} at {path}");
                        return clip;
                    }
                }
            }

            Debug.LogWarning($"[SetupController] Could not find animation: {fileName}");
            return null;
        }
    }
}
#endif

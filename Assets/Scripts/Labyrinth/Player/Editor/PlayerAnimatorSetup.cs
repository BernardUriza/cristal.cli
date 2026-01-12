#if UNITY_EDITOR
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;
using System.IO;

namespace Cristal.CLI.Labyrinth.Editor
{
    /// <summary>
    /// Editor utility for creating and configuring the Player Animator Controller.
    /// Creates a locomotion blend tree compatible with Mixamo animations.
    /// </summary>
    public static class PlayerAnimatorSetup
    {
        private const string CONTROLLER_PATH = "Assets/Animation/Player/PlayerAnimatorController.controller";
        private const string ANIMATION_FOLDER = "Assets/Animation/Player";

        [MenuItem("CRISTAL/Player/Create Animator Controller")]
        public static void CreateAnimatorController()
        {
            // Ensure folder exists
            EnsureFolderExists(ANIMATION_FOLDER);

            // Check if controller already exists
            var existingController = AssetDatabase.LoadAssetAtPath<AnimatorController>(CONTROLLER_PATH);
            if (existingController != null)
            {
                if (!EditorUtility.DisplayDialog(
                    "Overwrite Controller?",
                    "An Animator Controller already exists at this path. Overwrite?",
                    "Overwrite", "Cancel"))
                {
                    return;
                }
                AssetDatabase.DeleteAsset(CONTROLLER_PATH);
            }

            // Create new controller
            var controller = AnimatorController.CreateAnimatorControllerAtPath(CONTROLLER_PATH);

            // Add parameters
            AddParameters(controller);

            // Setup layers
            SetupBaseLayers(controller);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // Select the created asset
            Selection.activeObject = controller;
            EditorGUIUtility.PingObject(controller);

            Debug.Log($"[PlayerAnimatorSetup] Created Animator Controller at: {CONTROLLER_PATH}");
            Debug.Log("[PlayerAnimatorSetup] Import your Mixamo animations and assign them to the blend tree.");
        }

        [MenuItem("CRISTAL/Player/Setup Player with Animator")]
        public static void SetupPlayerWithAnimator()
        {
            // Find player in scene
            var player = GameObject.FindGameObjectWithTag("Player");
            if (player == null)
            {
                EditorUtility.DisplayDialog("No Player Found",
                    "Could not find a GameObject with 'Player' tag in the scene.",
                    "OK");
                return;
            }

            // Check for Animator
            var animator = player.GetComponentInChildren<Animator>();
            if (animator == null)
            {
                EditorUtility.DisplayDialog("No Animator Found",
                    "The player does not have an Animator component. Add an avatar model first.",
                    "OK");
                return;
            }

            // Load controller
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(CONTROLLER_PATH);
            if (controller == null)
            {
                if (EditorUtility.DisplayDialog("No Controller Found",
                    "Animator Controller not found. Create one now?",
                    "Create", "Cancel"))
                {
                    CreateAnimatorController();
                    controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(CONTROLLER_PATH);
                }
            }

            if (controller != null)
            {
                animator.runtimeAnimatorController = controller;
                EditorUtility.SetDirty(animator);
                Debug.Log("[PlayerAnimatorSetup] Assigned Animator Controller to player.");
            }

            // Ensure PlayerAnimator component exists
            var playerAnimator = player.GetComponent<PlayerAnimator>();
            if (playerAnimator == null)
            {
                playerAnimator = player.AddComponent<PlayerAnimator>();
                Debug.Log("[PlayerAnimatorSetup] Added PlayerAnimator component.");
            }

            EditorUtility.SetDirty(player);
        }

        private static void AddParameters(AnimatorController controller)
        {
            // Locomotion
            controller.AddParameter("Speed", AnimatorControllerParameterType.Float);
            controller.AddParameter("MotionSpeed", AnimatorControllerParameterType.Float);

            // Ground state
            controller.AddParameter("IsGrounded", AnimatorControllerParameterType.Bool);
            controller.AddParameter("FreeFall", AnimatorControllerParameterType.Bool);

            // Actions
            controller.AddParameter("Jump", AnimatorControllerParameterType.Trigger);
            controller.AddParameter("Land", AnimatorControllerParameterType.Trigger);

            // Modifiers
            controller.AddParameter("IsCrouching", AnimatorControllerParameterType.Bool);
        }

        private static void SetupBaseLayers(AnimatorController controller)
        {
            var rootStateMachine = controller.layers[0].stateMachine;

            // Create states
            var locomotionState = CreateLocomotionBlendTree(controller, rootStateMachine);
            var jumpState = rootStateMachine.AddState("Jump", new Vector3(400, 0, 0));
            var fallState = rootStateMachine.AddState("Fall", new Vector3(400, 100, 0));
            var landState = rootStateMachine.AddState("Land", new Vector3(200, 100, 0));

            // Set default state
            rootStateMachine.defaultState = locomotionState;

            // Create transitions

            // Locomotion -> Jump (on trigger)
            var toJump = locomotionState.AddTransition(jumpState);
            toJump.AddCondition(AnimatorConditionMode.If, 0, "Jump");
            toJump.hasExitTime = false;
            toJump.duration = 0.1f;

            // Jump -> Fall (after exit time)
            var jumpToFall = jumpState.AddTransition(fallState);
            jumpToFall.hasExitTime = true;
            jumpToFall.exitTime = 0.9f;
            jumpToFall.duration = 0.1f;
            jumpToFall.AddCondition(AnimatorConditionMode.IfNot, 0, "IsGrounded");

            // Jump -> Land (if grounded before exit)
            var jumpToLand = jumpState.AddTransition(landState);
            jumpToLand.hasExitTime = false;
            jumpToLand.duration = 0.1f;
            jumpToLand.AddCondition(AnimatorConditionMode.If, 0, "IsGrounded");

            // Fall -> Land (when grounded)
            var fallToLand = fallState.AddTransition(landState);
            fallToLand.hasExitTime = false;
            fallToLand.duration = 0.1f;
            fallToLand.AddCondition(AnimatorConditionMode.If, 0, "IsGrounded");

            // Locomotion -> Fall (if not grounded and FreeFall)
            var toFall = locomotionState.AddTransition(fallState);
            toFall.hasExitTime = false;
            toFall.duration = 0.2f;
            toFall.AddCondition(AnimatorConditionMode.IfNot, 0, "IsGrounded");
            toFall.AddCondition(AnimatorConditionMode.If, 0, "FreeFall");

            // Land -> Locomotion (after exit time)
            var landToLoco = landState.AddTransition(locomotionState);
            landToLoco.hasExitTime = true;
            landToLoco.exitTime = 0.8f;
            landToLoco.duration = 0.15f;
        }

        private static AnimatorState CreateLocomotionBlendTree(AnimatorController controller, AnimatorStateMachine stateMachine)
        {
            // Create blend tree
            var blendTree = new BlendTree
            {
                name = "Locomotion",
                blendType = BlendTreeType.Simple1D,
                blendParameter = "Speed",
                useAutomaticThresholds = false
            };

            // Add motion fields (will be null until animations are imported)
            // Threshold: 0 = Idle, 0.5 = Walk, 1 = Run
            blendTree.AddChild(null, 0f);    // Idle
            blendTree.AddChild(null, 0.5f);  // Walk
            blendTree.AddChild(null, 1f);    // Run

            // Create state with blend tree
            var locomotionState = stateMachine.AddState("Locomotion", new Vector3(200, 0, 0));
            locomotionState.motion = blendTree;

            // Add blend tree to controller asset
            AssetDatabase.AddObjectToAsset(blendTree, controller);

            return locomotionState;
        }

        private static void EnsureFolderExists(string path)
        {
            if (!AssetDatabase.IsValidFolder(path))
            {
                string[] folders = path.Split('/');
                string currentPath = folders[0];

                for (int i = 1; i < folders.Length; i++)
                {
                    string newPath = currentPath + "/" + folders[i];
                    if (!AssetDatabase.IsValidFolder(newPath))
                    {
                        AssetDatabase.CreateFolder(currentPath, folders[i]);
                    }
                    currentPath = newPath;
                }
            }
        }

        [MenuItem("CRISTAL/Player/Import Animation Guide")]
        public static void ShowImportGuide()
        {
            string guide = @"=== MIXAMO ANIMATION IMPORT GUIDE ===

1. GO TO MIXAMO.COM
   - Sign in with Adobe account
   - Search for 'Y Bot' character
   - Download as FBX (Unity)

2. DOWNLOAD ANIMATIONS
   Required clips:
   - Idle (search: 'idle')
   - Walking (search: 'walking')
   - Running (search: 'running')
   - Jump (search: 'jump')
   - Falling (search: 'falling idle')
   - Landing (search: 'hard landing')

   Settings for each:
   - Format: FBX for Unity
   - Skin: Without Skin (except Y Bot)
   - Frames per Second: 30
   - Keyframe Reduction: none

3. IMPORT TO UNITY
   - Drag FBX files to Assets/Animation/Player/
   - Select Y Bot FBX:
     - Rig tab: Animation Type = Humanoid
     - Click Apply
   - Select animation FBX files:
     - Rig tab: Animation Type = Humanoid
     - Animation tab: Loop Time = true (for Idle, Walk, Run)
     - Click Apply

4. CONFIGURE BLEND TREE
   - Open PlayerAnimatorController
   - Select 'Locomotion' state
   - In Inspector, expand Blend Tree
   - Assign animations:
     - Motion 0 (threshold 0): Idle
     - Motion 1 (threshold 0.5): Walking
     - Motion 2 (threshold 1): Running
   - Assign Jump, Fall, Land states

5. SETUP PLAYER
   - Add Y Bot as child of Player GameObject
   - Use CRISTAL > Player > Setup Player with Animator
";

            EditorUtility.DisplayDialog("Mixamo Import Guide", guide, "OK");
            Debug.Log(guide);
        }
    }
}
#endif

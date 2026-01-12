using UnityEngine;
using Cristal.CLI.Core;

namespace Cristal.CLI.Labyrinth.Player
{
    /// <summary>
    /// Handles runtime avatar model swapping for the player.
    /// Instantiates/destroys model GameObjects and maintains animator references.
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public class AvatarSwitcher : MonoBehaviour
    {
        [Header("Model Container")]
        [SerializeField] private Transform _modelRoot;
        [SerializeField] private Vector3 _modelOffset = Vector3.zero;
        [SerializeField] private Vector3 _modelRotation = Vector3.zero;

        [Header("Animation")]
        [SerializeField] private RuntimeAnimatorController _defaultAnimatorController;
        [SerializeField] private Avatar _defaultAvatar;

        [Header("Audio")]
        [SerializeField] private AudioSource _audioSource;

        [Header("Debug")]
        [SerializeField] private bool _debugMode = false;

        private Animator _animator;
        private GameObject _currentModelInstance;
        private AvatarManager _avatarManager;

        public GameObject CurrentModel => _currentModelInstance;

        private void Awake()
        {
            _animator = GetComponent<Animator>();

            if (_modelRoot == null)
            {
                _modelRoot = transform;
                CristalLog.Warning("AvatarSwitcher", "No model root assigned, using self");
            }
        }

        private void Start()
        {
            _avatarManager = ServiceLocator.Get<AvatarManager>();

            if (_avatarManager != null)
            {
                _avatarManager.OnAvatarChanged += OnAvatarChanged;

                // Apply current avatar if already selected
                if (_avatarManager.CurrentAvatar != null)
                {
                    ApplyAvatar(_avatarManager.CurrentAvatar);
                }
            }
            else
            {
                CristalLog.Error("AvatarSwitcher", "AvatarManager not found in ServiceLocator");
            }
        }

        private void OnDestroy()
        {
            if (_avatarManager != null)
            {
                _avatarManager.OnAvatarChanged -= OnAvatarChanged;
            }
        }

        private void OnAvatarChanged(AvatarData newAvatar)
        {
            ApplyAvatar(newAvatar);
        }

        private void ApplyAvatar(AvatarData avatarData)
        {
            if (avatarData == null)
            {
                CristalLog.Warning("AvatarSwitcher", "Cannot apply null avatar");
                return;
            }

            if (avatarData.ModelPrefab == null)
            {
                CristalLog.Warning("AvatarSwitcher", $"Avatar '{avatarData.DisplayName}' has no model prefab assigned");
                return;
            }

            // Destroy current model
            if (_currentModelInstance != null)
            {
                if (_debugMode)
                {
                    CristalLog.Info("AvatarSwitcher", $"Destroying previous model: {_currentModelInstance.name}");
                }
                Destroy(_currentModelInstance);
                _currentModelInstance = null;
            }

            // Instantiate new model
            _currentModelInstance = Instantiate(avatarData.ModelPrefab, _modelRoot);
            _currentModelInstance.name = $"Model_{avatarData.AvatarId}";

            // Apply offset and rotation
            _currentModelInstance.transform.localPosition = _modelOffset;
            _currentModelInstance.transform.localRotation = Quaternion.Euler(_modelRotation);

            // Configure animator
            ConfigureAnimator(_currentModelInstance);

            // Apply material override if specified
            if (avatarData.OverrideMaterial != null)
            {
                ApplyMaterialOverride(_currentModelInstance, avatarData.OverrideMaterial);
            }

            // Play selection sound
            if (_audioSource != null && avatarData.SelectionSound != null)
            {
                _audioSource.PlayOneShot(avatarData.SelectionSound);
            }

            CristalLog.Info("AvatarSwitcher", $"Avatar applied: {avatarData.DisplayName}");
        }

        private void ConfigureAnimator(GameObject modelInstance)
        {
            // Always use player's animator, just get Avatar from model FBX
            if (_defaultAnimatorController != null)
            {
                _animator.runtimeAnimatorController = _defaultAnimatorController;
            }

            // Try to get Avatar (humanoid rig) from model
            Avatar modelAvatar = null;

            // Check if model has Animator with Avatar
            var modelAnimator = modelInstance.GetComponent<Animator>();
            if (modelAnimator != null)
            {
                if (modelAnimator.avatar != null && modelAnimator.avatar.isHuman)
                {
                    modelAvatar = modelAnimator.avatar;
                }
                // Disable model's animator - we use player's animator
                modelAnimator.enabled = false;
            }

            // If no Animator on model, try to find Avatar asset from FBX
            if (modelAvatar == null)
            {
                // Get SkinnedMeshRenderer to find avatar
                var skinnedMesh = modelInstance.GetComponentInChildren<SkinnedMeshRenderer>();
                if (skinnedMesh != null && skinnedMesh.rootBone != null)
                {
                    // Avatar might be on root bone's GameObject
                    var rootAnimator = skinnedMesh.rootBone.GetComponentInParent<Animator>();
                    if (rootAnimator != null && rootAnimator.avatar != null && rootAnimator.avatar.isHuman)
                    {
                        modelAvatar = rootAnimator.avatar;
                    }
                }
            }

            // Apply avatar to player's animator
            if (modelAvatar != null)
            {
                _animator.avatar = modelAvatar;
                if (_debugMode)
                {
                    CristalLog.Info("AvatarSwitcher", $"Avatar configured: {modelAvatar.name}");
                }
            }
            else if (_defaultAvatar != null)
            {
                _animator.avatar = _defaultAvatar;
                if (_debugMode)
                {
                    CristalLog.Warning("AvatarSwitcher", "Using default avatar (model has no humanoid rig)");
                }
            }
            else
            {
                CristalLog.Warning("AvatarSwitcher", "No Avatar found - animations may not work correctly");
            }
        }

        private void ApplyMaterialOverride(GameObject modelInstance, Material overrideMaterial)
        {
            var renderers = modelInstance.GetComponentsInChildren<SkinnedMeshRenderer>();
            foreach (var renderer in renderers)
            {
                var materials = new Material[renderer.sharedMaterials.Length];
                for (int i = 0; i < materials.Length; i++)
                {
                    materials[i] = overrideMaterial;
                }
                renderer.sharedMaterials = materials;
            }

            if (_debugMode)
            {
                CristalLog.Info("AvatarSwitcher", $"Applied material override to {renderers.Length} renderers");
            }
        }

        public void ForceRefresh()
        {
            if (_avatarManager != null && _avatarManager.CurrentAvatar != null)
            {
                ApplyAvatar(_avatarManager.CurrentAvatar);
            }
        }
    }
}

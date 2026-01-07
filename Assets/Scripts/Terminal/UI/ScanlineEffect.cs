using UnityEngine;
using UnityEngine.UI;

namespace Cristal.CLI.Terminal.UI
{
    /// <summary>
    /// Scanline effect for terminal visual aesthetics.
    /// Adds CRT-style scanline overlay to the terminal.
    /// </summary>
    [RequireComponent(typeof(RawImage))]
    public class ScanlineEffect : MonoBehaviour
    {
        [Header("Settings")]
        [SerializeField] private float _alpha = 0.03f;
        [SerializeField] private int _lineHeight = 2;
        [SerializeField] private float _scrollSpeed = 0f;
        [SerializeField] private bool _animate = false;

        private RawImage _image;
        private Texture2D _scanlineTexture;
        private float _scrollOffset = 0f;

        private void Awake()
        {
            _image = GetComponent<RawImage>();
            GenerateScanlineTexture();
        }

        private void Update()
        {
            if (_animate && _scrollSpeed > 0)
            {
                _scrollOffset += Time.deltaTime * _scrollSpeed;
                if (_scrollOffset >= 1f) _scrollOffset = 0f;
                _image.uvRect = new Rect(0, _scrollOffset, 1, 1);
            }
        }

        private void GenerateScanlineTexture()
        {
            int height = _lineHeight * 2;
            _scanlineTexture = new Texture2D(1, height, TextureFormat.RGBA32, false);
            _scanlineTexture.wrapMode = TextureWrapMode.Repeat;
            _scanlineTexture.filterMode = FilterMode.Point;

            Color transparent = new Color(0, 0, 0, 0);
            Color scanline = new Color(0, 0, 0, _alpha);

            for (int y = 0; y < height; y++)
            {
                Color color = (y < _lineHeight) ? scanline : transparent;
                _scanlineTexture.SetPixel(0, y, color);
            }

            _scanlineTexture.Apply();
            _image.texture = _scanlineTexture;
        }

        /// <summary>
        /// Update scanline alpha.
        /// </summary>
        public void SetAlpha(float alpha)
        {
            _alpha = alpha;
            GenerateScanlineTexture();
        }

        /// <summary>
        /// Enable/disable scanline animation.
        /// </summary>
        public void SetAnimated(bool animated, float speed = 0.1f)
        {
            _animate = animated;
            _scrollSpeed = speed;
        }

        private void OnDestroy()
        {
            if (_scanlineTexture != null)
            {
                Destroy(_scanlineTexture);
            }
        }
    }
}

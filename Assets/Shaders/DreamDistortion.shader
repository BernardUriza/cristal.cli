Shader "Cristal/DreamDistortion"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _DistortionTex ("Distortion Texture", 2D) = "bump" {}
        _DistortionStrength ("Distortion Strength", Range(0, 0.5)) = 0.1
        _DistortionSpeed ("Distortion Speed", Range(0, 2)) = 0.5
        _ChromaticAberration ("Chromatic Aberration", Range(0, 0.1)) = 0.02
        _VignetteStrength ("Vignette Strength", Range(0, 1)) = 0.5
        _VignetteColor ("Vignette Color", Color) = (0.1, 0.05, 0.15, 1)
        _DreamTint ("Dream Tint", Color) = (0.8, 0.7, 1, 1)
        _DreamIntensity ("Dream Intensity", Range(0, 1)) = 1
        _TimeScale ("Time Scale", Range(0, 2)) = 1
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        LOD 100

        Pass
        {
            Name "DreamDistortion"
            
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
            };

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);
            TEXTURE2D(_DistortionTex);
            SAMPLER(sampler_DistortionTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float _DistortionStrength;
                float _DistortionSpeed;
                float _ChromaticAberration;
                float _VignetteStrength;
                float4 _VignetteColor;
                float4 _DreamTint;
                float _DreamIntensity;
                float _TimeScale;
            CBUFFER_END

            Varyings vert(Attributes input)
            {
                Varyings output;
                output.positionCS = TransformObjectToHClip(input.positionOS.xyz);
                output.uv = TRANSFORM_TEX(input.uv, _MainTex);
                return output;
            }

            float4 frag(Varyings input) : SV_Target
            {
                float2 uv = input.uv;
                float time = _Time.y * _DistortionSpeed * _TimeScale;
                
                // Sample distortion texture with animation
                float2 distortUV = uv + float2(time * 0.1, time * 0.05);
                float2 distortion = SAMPLE_TEXTURE2D(_DistortionTex, sampler_DistortionTex, distortUV).rg;
                distortion = (distortion - 0.5) * 2.0 * _DistortionStrength * _DreamIntensity;
                
                // Apply wavy distortion
                float wave = sin(uv.y * 10.0 + time) * 0.01 * _DreamIntensity;
                distortion.x += wave;
                
                // Sample with chromatic aberration
                float2 uvR = uv + distortion + float2(_ChromaticAberration * _DreamIntensity, 0);
                float2 uvG = uv + distortion;
                float2 uvB = uv + distortion - float2(_ChromaticAberration * _DreamIntensity, 0);
                
                float r = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uvR).r;
                float g = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uvG).g;
                float b = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uvB).b;
                
                float4 color = float4(r, g, b, 1);
                
                // Apply dream tint
                color.rgb = lerp(color.rgb, color.rgb * _DreamTint.rgb, _DreamIntensity);
                
                // Vignette
                float2 vignetteUV = uv * (1.0 - uv);
                float vignette = vignetteUV.x * vignetteUV.y * 15.0;
                vignette = saturate(pow(vignette, _VignetteStrength));
                color.rgb = lerp(_VignetteColor.rgb, color.rgb, vignette);
                
                return color;
            }
            ENDHLSL
        }
    }
    FallBack "Hidden/Universal Render Pipeline/FallbackError"
}

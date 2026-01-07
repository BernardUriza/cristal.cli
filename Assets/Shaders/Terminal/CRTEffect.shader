Shader "CRISTAL/CRTEffect"
{
    Properties
    {
        [MainTexture] _MainTex ("Texture", 2D) = "white" {}
        
        [Header(Scanlines)]
        _ScanlineAlpha ("Scanline Alpha", Range(0, 0.5)) = 0.05
        _ScanlineCount ("Scanline Count", Float) = 400
        _ScanlineSpeed ("Scanline Scroll Speed", Float) = 0.0
        
        [Header(Noise)]
        _NoiseAlpha ("Noise Alpha", Range(0, 0.3)) = 0.02
        _NoiseSpeed ("Noise Speed", Float) = 10.0
        
        [Header(Vignette)]
        _VignetteIntensity ("Vignette Intensity", Range(0, 1)) = 0.3
        _VignetteRadius ("Vignette Radius", Range(0, 2)) = 0.8
        
        [Header(Chromatic Aberration)]
        _ChromaticOffset ("Chromatic Offset", Range(0, 0.01)) = 0.002
        
        [Header(Curvature)]
        _Curvature ("Screen Curvature", Range(0, 0.1)) = 0.0
        
        [Header(Flicker)]
        _FlickerIntensity ("Flicker Intensity", Range(0, 0.1)) = 0.01
        _FlickerSpeed ("Flicker Speed", Float) = 15.0
    }
    
    SubShader
    {
        Tags 
        { 
            "RenderType" = "Transparent"
            "Queue" = "Overlay"
            "RenderPipeline" = "UniversalPipeline"
        }
        
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite Off
        Cull Off
        
        Pass
        {
            Name "CRTEffect"
            
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
            
            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float _ScanlineAlpha;
                float _ScanlineCount;
                float _ScanlineSpeed;
                float _NoiseAlpha;
                float _NoiseSpeed;
                float _VignetteIntensity;
                float _VignetteRadius;
                float _ChromaticOffset;
                float _Curvature;
                float _FlickerIntensity;
                float _FlickerSpeed;
            CBUFFER_END
            
            // Hash function for noise
            float hash(float2 p)
            {
                float3 p3 = frac(float3(p.xyx) * 0.1031);
                p3 += dot(p3, p3.yzx + 33.33);
                return frac((p3.x + p3.y) * p3.z);
            }
            
            // Simplex-ish noise
            float noise(float2 p)
            {
                float2 i = floor(p);
                float2 f = frac(p);
                f = f * f * (3.0 - 2.0 * f);
                
                float a = hash(i);
                float b = hash(i + float2(1.0, 0.0));
                float c = hash(i + float2(0.0, 1.0));
                float d = hash(i + float2(1.0, 1.0));
                
                return lerp(lerp(a, b, f.x), lerp(c, d, f.x), f.y);
            }
            
            // Apply barrel distortion
            float2 curveUV(float2 uv, float curvature)
            {
                uv = uv * 2.0 - 1.0;
                float2 offset = abs(uv.yx) / float2(6.0, 4.0);
                uv = uv + uv * offset * offset * curvature;
                uv = uv * 0.5 + 0.5;
                return uv;
            }
            
            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                OUT.positionCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _MainTex);
                return OUT;
            }
            
            half4 frag(Varyings IN) : SV_Target
            {
                float2 uv = IN.uv;
                
                // Apply curvature
                if (_Curvature > 0)
                {
                    uv = curveUV(uv, _Curvature);
                    
                    // Discard pixels outside screen
                    if (uv.x < 0 || uv.x > 1 || uv.y < 0 || uv.y > 1)
                    {
                        return half4(0, 0, 0, 1);
                    }
                }
                
                // Chromatic aberration
                half r = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv + float2(_ChromaticOffset, 0)).r;
                half g = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv).g;
                half b = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv - float2(_ChromaticOffset, 0)).b;
                half a = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv).a;
                
                half4 col = half4(r, g, b, a);
                
                // Scanlines
                float scanline = sin((uv.y + _Time.y * _ScanlineSpeed) * _ScanlineCount * 3.14159) * 0.5 + 0.5;
                col.rgb -= scanline * _ScanlineAlpha;
                
                // Noise
                float n = noise(uv * 500.0 + _Time.y * _NoiseSpeed);
                col.rgb += (n - 0.5) * _NoiseAlpha;
                
                // Flicker
                float flicker = sin(_Time.y * _FlickerSpeed) * _FlickerIntensity;
                col.rgb += flicker;
                
                // Vignette
                float2 center = uv - 0.5;
                float vignette = 1.0 - dot(center, center) * _VignetteIntensity / _VignetteRadius;
                col.rgb *= saturate(vignette);
                
                return col;
            }
            ENDHLSL
        }
    }
    
    FallBack "Hidden/Universal Render Pipeline/FallbackError"
}

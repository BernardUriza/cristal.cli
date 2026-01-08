Shader "Cristal/BreathingWall"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Base Color", Color) = (0.2, 0.1, 0.3, 1)
        _EmissionColor ("Emission Color", Color) = (0.5, 0.3, 0.7, 1)
        _EmissionStrength ("Emission Strength", Range(0, 2)) = 0.5
        _BreathSpeed ("Breath Speed", Range(0.1, 3)) = 1
        _BreathAmplitude ("Breath Amplitude", Range(0, 0.5)) = 0.1
        _PulseColor ("Pulse Color", Color) = (1, 0.5, 1, 1)
        _PulseStrength ("Pulse Strength", Range(0, 1)) = 0
        _NoiseScale ("Noise Scale", Range(1, 20)) = 5
        _NoiseSpeed ("Noise Speed", Range(0, 2)) = 0.5
    }

    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        LOD 100

        Pass
        {
            Name "BreathingWall"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 positionWS : TEXCOORD1;
                float3 normalWS : TEXCOORD2;
            };

            TEXTURE2D(_MainTex);
            SAMPLER(sampler_MainTex);

            CBUFFER_START(UnityPerMaterial)
                float4 _MainTex_ST;
                float4 _Color;
                float4 _EmissionColor;
                float _EmissionStrength;
                float _BreathSpeed;
                float _BreathAmplitude;
                float4 _PulseColor;
                float _PulseStrength;
                float _NoiseScale;
                float _NoiseSpeed;
            CBUFFER_END

            // Simple noise function
            float hash(float2 p)
            {
                return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
            }

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

            Varyings vert(Attributes input)
            {
                Varyings output;
                
                float3 posOS = input.positionOS.xyz;
                
                // Breathing displacement
                float breath = sin(_Time.y * _BreathSpeed) * 0.5 + 0.5;
                float noiseVal = noise(input.uv * _NoiseScale + _Time.y * _NoiseSpeed);
                float displacement = breath * _BreathAmplitude * noiseVal;
                
                posOS += input.normalOS * displacement;
                
                output.positionCS = TransformObjectToHClip(posOS);
                output.positionWS = TransformObjectToWorld(posOS);
                output.normalWS = TransformObjectToWorldNormal(input.normalOS);
                output.uv = TRANSFORM_TEX(input.uv, _MainTex);
                
                return output;
            }

            float4 frag(Varyings input) : SV_Target
            {
                float4 texColor = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv);
                float4 baseColor = texColor * _Color;
                
                // Breathing emission
                float breath = sin(_Time.y * _BreathSpeed) * 0.5 + 0.5;
                float noiseVal = noise(input.uv * _NoiseScale + _Time.y * _NoiseSpeed);
                
                float3 emission = _EmissionColor.rgb * _EmissionStrength * (breath * 0.5 + 0.5);
                emission += noiseVal * _EmissionColor.rgb * 0.2;
                
                // Pulse overlay
                emission += _PulseColor.rgb * _PulseStrength * sin(_Time.y * 3.0) * 0.5 + 0.5;
                
                // Simple lighting
                float3 lightDir = normalize(float3(1, 1, -1));
                float NdotL = saturate(dot(input.normalWS, lightDir));
                
                float3 finalColor = baseColor.rgb * (NdotL * 0.5 + 0.5) + emission;
                
                return float4(finalColor, 1);
            }
            ENDHLSL
        }
    }
    FallBack "Universal Render Pipeline/Lit"
}

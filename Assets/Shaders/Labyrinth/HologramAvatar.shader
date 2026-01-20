Shader "CRISTAL/HologramAvatar"
{
    Properties
    {
        _MainColor ("Main Color", Color) = (0, 1, 0.8, 0.7)
        _RimColor ("Rim Color", Color) = (0, 1, 0.5, 1)
        _RimPower ("Rim Power", Range(0.5, 8.0)) = 3.0
        _ScanlineSpeed ("Scanline Speed", Range(0, 10)) = 2.0
        _ScanlineCount ("Scanline Count", Range(10, 200)) = 80
        _ScanlineAlpha ("Scanline Alpha", Range(0, 1)) = 0.3
        _GlitchIntensity ("Glitch Intensity", Range(0, 1)) = 0.1
        _FlickerSpeed ("Flicker Speed", Range(0, 20)) = 5.0
        _WireframeWidth ("Wireframe Width", Range(0, 0.1)) = 0.02
        _Alpha ("Overall Alpha", Range(0, 1)) = 0.8
    }

    SubShader
    {
        Tags
        {
            "RenderType" = "Transparent"
            "Queue" = "Transparent"
            "RenderPipeline" = "UniversalPipeline"
        }

        Pass
        {
            Name "Hologram"
            Tags { "LightMode" = "UniversalForward" }

            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Back

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
                float2 uv : TEXCOORD0;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float3 normalWS : TEXCOORD0;
                float3 viewDirWS : TEXCOORD1;
                float3 positionWS : TEXCOORD2;
                float2 uv : TEXCOORD3;
            };

            CBUFFER_START(UnityPerMaterial)
                float4 _MainColor;
                float4 _RimColor;
                float _RimPower;
                float _ScanlineSpeed;
                float _ScanlineCount;
                float _ScanlineAlpha;
                float _GlitchIntensity;
                float _FlickerSpeed;
                float _WireframeWidth;
                float _Alpha;
            CBUFFER_END

            float rand(float2 co)
            {
                return frac(sin(dot(co.xy, float2(12.9898, 78.233))) * 43758.5453);
            }

            Varyings vert(Attributes IN)
            {
                Varyings OUT;

                // Glitch vertex displacement
                float glitch = rand(float2(_Time.y, IN.positionOS.y)) * _GlitchIntensity;
                float3 displaced = IN.positionOS.xyz;
                displaced.x += glitch * sin(_Time.y * 20.0) * 0.1;

                OUT.positionWS = TransformObjectToWorld(displaced);
                OUT.positionCS = TransformWorldToHClip(OUT.positionWS);
                OUT.normalWS = TransformObjectToWorldNormal(IN.normalOS);
                OUT.viewDirWS = GetWorldSpaceViewDir(OUT.positionWS);
                OUT.uv = IN.uv;

                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                // Rim lighting (fresnel)
                float3 normalWS = normalize(IN.normalWS);
                float3 viewDirWS = normalize(IN.viewDirWS);
                float rim = 1.0 - saturate(dot(viewDirWS, normalWS));
                rim = pow(rim, _RimPower);

                // Scanlines
                float scanline = sin((IN.positionWS.y + _Time.y * _ScanlineSpeed) * _ScanlineCount);
                scanline = scanline * 0.5 + 0.5;
                scanline = lerp(1.0, scanline, _ScanlineAlpha);

                // Flicker
                float flicker = sin(_Time.y * _FlickerSpeed) * 0.5 + 0.5;
                flicker = lerp(0.8, 1.0, flicker);

                // Random glitch flicker
                float glitchFlicker = step(0.98, rand(float2(_Time.y * 0.1, 0)));
                flicker *= lerp(1.0, 0.3, glitchFlicker * _GlitchIntensity);

                // Combine colors
                float3 mainColor = _MainColor.rgb;
                float3 rimColor = _RimColor.rgb * rim;
                float3 finalColor = mainColor + rimColor;

                // Apply effects
                finalColor *= scanline;
                finalColor *= flicker;

                // Alpha
                float alpha = _Alpha * _MainColor.a;
                alpha *= (0.5 + rim * 0.5); // More transparent in center
                alpha *= scanline;
                alpha *= flicker;

                return half4(finalColor, saturate(alpha));
            }
            ENDHLSL
        }

        // Wireframe edge pass
        Pass
        {
            Name "Wireframe"
            Tags { "LightMode" = "SRPDefaultUnlit" }

            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Front

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag

            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float3 normalOS : NORMAL;
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
            };

            CBUFFER_START(UnityPerMaterial)
                float4 _MainColor;
                float4 _RimColor;
                float _RimPower;
                float _ScanlineSpeed;
                float _ScanlineCount;
                float _ScanlineAlpha;
                float _GlitchIntensity;
                float _FlickerSpeed;
                float _WireframeWidth;
                float _Alpha;
            CBUFFER_END

            Varyings vert(Attributes IN)
            {
                Varyings OUT;
                float3 expandedPos = IN.positionOS.xyz + IN.normalOS * _WireframeWidth;
                OUT.positionCS = TransformObjectToHClip(expandedPos);
                return OUT;
            }

            half4 frag(Varyings IN) : SV_Target
            {
                return half4(_RimColor.rgb, _Alpha * 0.8);
            }
            ENDHLSL
        }
    }

    FallBack "Universal Render Pipeline/Lit"
}

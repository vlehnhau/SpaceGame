#version 300 es
precision highp float;

uniform vec3 uEyeWorldPos;
uniform sampler2D uNoiseMap;

uniform float uDisplacementFactor;
uniform float uDisplacementExponent;

in vec3 vFragmentPos;

out vec4 fColor;

const int MAX_STEPS = 200;
const float BAILOUT_DIST = 10.0f;
const float MIN_DIST = 0.0001f;

const vec3 SUNLIGHT_DIR = vec3(0.2f, 0.6f, 0.5f);

const float PI = 3.14159265358;

float sdSphereWithNoise(vec3 p, float s, out float displacement) {
    float sdfSphereVal = length(p) - s;

    vec3 unitP = p / s;
    // displacement = noise(unitP.x, unitP.y, unitP.z);

    vec2 uv = vec2(atan(unitP.x, unitP.z) / PI, unitP.y) * 0.5 + 0.5;

    displacement = texture(uNoiseMap, uv).r;
    
    // displacement *= smoothstep(10.0, 1.0, abs(unitP.y));
    displacement *= uDisplacementFactor;
    displacement = pow(displacement, uDisplacementExponent);
    
    return sdfSphereVal - displacement;
}

float sdf(vec3 pos) {
    float displacement;
    return sdSphereWithNoise(pos, 0.5f, displacement);
}


vec3 calcSDFNormal(in vec3 p) {
    const float eps = 0.0001f; // or some other value
    const vec2 h = vec2(eps, 0);
    return normalize(vec3(sdf(p + h.xyy) - sdf(p - h.xyy), 
                          sdf(p + h.yxy) - sdf(p - h.yxy), 
                          sdf(p + h.yyx) - sdf(p - h.yyx)));
}

void main() {
    vec3 color;
    int steps = 0;

    // the computation distance should not exceed uBailout
    vec3 stepDirection = normalize(vFragmentPos);
    vec3 currentPos = uEyeWorldPos;
    float displacement = 0.0;
    while(true) {
        steps++;

        float nearestDist = sdSphereWithNoise(currentPos, 0.5f, displacement);

        currentPos += stepDirection * nearestDist;

        if(steps > MAX_STEPS || nearestDist >= BAILOUT_DIST) {
            color = vec3(0.0f);
            break;
        }

        if(nearestDist <= MIN_DIST) {
            vec3 normal = calcSDFNormal(currentPos);

            float diffuse = clamp(dot(normal, SUNLIGHT_DIR), 0.0f, 1.0f);
            float ambient = 0.5f + 0.5f * dot(normal, SUNLIGHT_DIR);
            // color = vec3(0.2f, 0.3f, 0.4f) * ambient + vec3(0.8f, 0.7f, 0.6f) * diffuse;

            float normalizedDisplacement = displacement / (pow(1.0 * uDisplacementFactor, uDisplacementExponent));

            if (normalizedDisplacement <= 0.001) {
                color = vec3(0.0, 0.0, 1.0);
            }
            else if (normalizedDisplacement <= 0.1) {
                color = vec3(0.0, 1.0, 0.0);
            }
            else if (normalizedDisplacement <= 0.3) {
                color = vec3(0.4, 0.4, 0.4);
            }
            else {
                color = vec3(1.0);
            }

            color = color * (ambient + diffuse);

            break;
        }
    }

    fColor = vec4(color, 1.0f);
}

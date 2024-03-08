#version 300 es
precision highp float;

uniform vec3 uEyeWorldPos;
uniform sampler2D uNoiseMap;

uniform float uDisplacementFactor;
uniform float uDisplacementExponent;

in vec3 vFragmentPos;

out vec4 fColor;

const int MAX_STEPS = 100;
const float BAILOUT_DIST = 10.0f;
const float MIN_DIST = 0.0001f;

const vec3 SUNLIGHT_DIR = normalize(vec3(0.2f, 0.6f, 0.5f));
const float SPHERE_RADIUS = 0.5f;

// Variables configuring the look of the ocean
const float OCEAN_DEPTH = 0.02f;
const float OCEAN_DEPTH_FACTOR = 80.0;
const float OCEAN_ALPHA_FACTOR = 420.0;
const vec3 LIGHT_OCEAN_COLOR = vec3(0.0f, 0.55f, 0.97f);
const vec3 DEEP_OCEAN_COLOR  = vec3(0.04f, 0.01f, 0.27f);

const float PI = 3.14159265358f;
const float INFINITY = 69696969696969696969696969.0;

vec3 calcTerrainPosAtUV(vec2 uv) {
    float azimut = (uv.y - 0.5) * PI;
    float polarAngle = (uv.y - 0.5) * PI * 2.0;

    vec3 pos = vec3(cos(azimut) * sin(polarAngle),
                    sin(azimut),
                    cos(azimut) * cos(polarAngle));

    return pos * pow(texture(uNoiseMap, uv).r * uDisplacementFactor, uDisplacementExponent);
}

void sdSPhereWithNoiseNormal(vec2 uv, out vec3 normal) {
    vec2 texelSize = 1.0f / vec2(textureSize(uNoiseMap, 0));

    vec3 uDiff = calcTerrainPosAtUV(uv + vec2(texelSize.x, 0.0)) - calcTerrainPosAtUV(uv - vec2(texelSize.x, 0.0));
    vec3 vDiff = calcTerrainPosAtUV(uv + vec2(0.0, texelSize.y)) - calcTerrainPosAtUV(uv - vec2(0.0, texelSize.y));

    if (uDiff == vec3(0.0) || vDiff == vec3(0.0))
        normal = vec3(0.0);
    else
        normal = cross(normalize(uDiff), normalize(vDiff));
}

float sdSphereWithNoise(vec3 p, float s, out float terrainDisplacement, out vec3 normal) {
    float sdfSphereVal = length(p) - s;

    // The current position on a unit sphere
    vec3 unitP = p / s;
    vec2 uv = vec2(atan(unitP.x, unitP.z) / PI, unitP.y) * 0.5 + 0.5;

    terrainDisplacement = texture(uNoiseMap, uv).r;
    
    terrainDisplacement *= uDisplacementFactor;
    terrainDisplacement = pow(terrainDisplacement, uDisplacementExponent);

    sdSPhereWithNoiseNormal(uv, normal);
    if (normal == vec3(0.0))
        normal = unitP;
    
    return sdfSphereVal - terrainDisplacement;
}

float sdf(vec3 pos, out float terrainDisplacement, out vec3 normal) {
    return sdSphereWithNoise(pos, SPHERE_RADIUS, terrainDisplacement, normal);
}


// vec3 calcSDFNormal(in vec3 p) {
//     const float eps = 0.00001f; // or some other value
//     const vec2 h = vec2(eps, 0);
//     float terrainDisplacement;
//     return normalize(vec3(sdf(p + h.xyy, terrainDisplacement) - sdf(p - h.xyy, terrainDisplacement), 
//                           sdf(p + h.yxy, terrainDisplacement) - sdf(p - h.yxy, terrainDisplacement), 
//                           sdf(p + h.yyx, terrainDisplacement) - sdf(p - h.yyx, terrainDisplacement)));
// }

void calcTerrainColor(vec3 currentPos, vec3 normal, float terrainDisplacement, out vec3 color) {
    float diffuse = clamp(dot(normal, SUNLIGHT_DIR), 0.0f, 1.0f);
    float ambient = 0.5f + 0.5f * dot(normal, SUNLIGHT_DIR);
    vec3 halfwaySpecVec = SUNLIGHT_DIR + normalize(currentPos - uEyeWorldPos);
    halfwaySpecVec = normalize(halfwaySpecVec);
    float specular = pow(max(dot(halfwaySpecVec, normal), 0.0), 32.0);

    vec3 upDir = normalize(currentPos);
    float steepness = 1.0 - dot(normal, upDir);
    steepness = clamp(steepness / 0.6, 0.0, 1.0);
    // float steepness = terrainDisplacement / (pow(uDisplacementFactor, uDisplacementExponent));

    if (steepness <= 0.5) {
        color = vec3(0.42f, 0.77f, 0.11f);
    }
    else if (steepness <= 0.75) {
        color = vec3(0.33f, 0.28f, 0.28f);
    }
    else {
        color = vec3(1.0);
    }

    color = color * (ambient + diffuse + specular);

    color = normal;
}

// From https://youtu.be/lctXaT9pxA0?si=YdBNYSMocZimnVDZ&t=951
// rayDir has to be normalized
vec2 raySphereIntersection(vec3 center, float radius, vec3 rayOrigin, vec3 rayDir) {
    vec3 offset = rayOrigin - center;
    float b = 2.0 * dot(offset, rayDir);
    float c = dot(offset, offset) - radius * radius;

    float discriminant = b * b - 4.0 * c;

    if (discriminant > 0.0) {
        float s = sqrt(discriminant);
        float dstToSphereNear = max(0.0, -(b + s) / (2.0));
        float dstToSphereFar = (s - b) / (2.0);

        if (dstToSphereFar >= 0.0)
            return vec2(dstToSphereNear, dstToSphereFar - dstToSphereNear);
    } 

    return vec2(INFINITY);
}

void calcOceanColor(vec3 currentPos, vec3 stepDirection, out vec3 color) {
    float sceneDepth = length(currentPos - uEyeWorldPos);

    vec2 sphereHitInfo = raySphereIntersection(vec3(0.0), SPHERE_RADIUS + OCEAN_DEPTH, uEyeWorldPos, stepDirection);
    float distanceToOcean = sphereHitInfo.x;
    float distanceThroughOcean = sphereHitInfo.y;
    float oceanViewDepth = min(distanceThroughOcean, sceneDepth - distanceToOcean);

    if (oceanViewDepth > 0.0) {
        // Interpolating between the deep and light ocean color 
        float opticalDepth = 1.0 - exp(-oceanViewDepth * OCEAN_DEPTH_FACTOR);
        vec3 oceanColor    = mix(LIGHT_OCEAN_COLOR, DEEP_OCEAN_COLOR, opticalDepth);
        
        // Interpolating between the terrain color and the calculated ocean color 
        float alpha = 1.0 - exp(-oceanViewDepth * OCEAN_ALPHA_FACTOR);
        color = mix(color, oceanColor, alpha);
    }
}

void main() {
    vec3 color;
    int steps = 0;

    // the computation distance should not exceed uBailout
    vec3 stepDirection = normalize(vFragmentPos);
    vec3 currentPos = uEyeWorldPos;
    
    float terrainDisplacement;
    vec3 normal;

    while(true) {
        steps++;

        float nearestDist = sdf(currentPos, terrainDisplacement, normal);

        currentPos += stepDirection * nearestDist;

        if(steps > MAX_STEPS || nearestDist >= BAILOUT_DIST) {
            color = vec3(0.0f);
            break;
        }

        if(nearestDist <= MIN_DIST) {
            calcTerrainColor(currentPos, normal, terrainDisplacement, color);
            break;
        }
    }

    // calcOceanColor(currentPos, stepDirection, color);

    fColor = vec4(color, 1.0f);
}
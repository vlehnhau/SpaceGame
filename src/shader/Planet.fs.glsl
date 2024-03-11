#version 300 es
precision mediump float;

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
const float OCEAN_DEPTH = 0.01f;
const float OCEAN_DEPTH_FACTOR = 80.0f;
const float OCEAN_ALPHA_FACTOR = 420.0f;
const vec3 LIGHT_OCEAN_COLOR = vec3(0.0f, 0.55f, 0.97f);
const vec3 DEEP_OCEAN_COLOR  = vec3(0.04f, 0.01f, 0.27f);

// Variables configuring the look of the atmosphere
const float ATMOSPHERE_SPHERE_RADIUS = SPHERE_RADIUS + 0.2f;
const float IN_SCATTER_LIGHT_SAMPLE_POINTS_COUNT = 20.0f;
const float OPTICAL_DEPTH_SAMPLE_POINTS_COUNT = 20.0f;
const float ATMOSPHERE_DENSITY_FALLOFF = 5.0;
const float LIGHT_SCATTERING_STRENGTH = 20.0;
const vec3 LIGTH_SCATTERING_COEFFICIENTS = vec3(pow(400.0 / 700.0, 4.0) * LIGHT_SCATTERING_STRENGTH,
                                                pow(400.0 / 530.0, 4.0) * LIGHT_SCATTERING_STRENGTH,
                                                pow(400.0 / 440.0, 4.0) * LIGHT_SCATTERING_STRENGTH);

const float PI = 3.14159265358f;
const float FLOAT_MAX = 16384.0f;

// From https://youtu.be/lctXaT9pxA0?si=YdBNYSMocZimnVDZ&t=951
// rayDir has to be normalized
vec2 raySphereIntersection(vec3 center, float radius, vec3 rayOrigin, vec3 rayDir) {
    vec3 offset = rayOrigin - center;
    float b = 2.0 * dot(offset, rayDir);
    float c = dot(offset, offset) - radius * radius;

    float discriminant = b * b - 4.0 * c;

    if (discriminant > 0.0) {
        float s = sqrt(discriminant);
        float dstToSphereNear = max(0.0, -(b + s) / 2.0);
        float dstToSphereFar = (s - b) / 2.0;

        if (dstToSphereFar >= 0.0)
            return vec2(dstToSphereNear, dstToSphereFar - dstToSphereNear);
    } 

    return vec2(FLOAT_MAX, 0.0);
}

float sdSphereWithNoise(vec3 p, float s, out float terrainDisplacement) {
    float sdfSphereVal = length(p) - s;

    // The current position on a unit sphere
    vec3 unitP = p / s;
    vec2 uv = vec2(atan(unitP.x, unitP.z) / PI, unitP.y) * 0.5 + 0.5;

    terrainDisplacement = texture(uNoiseMap, uv).r;
    
    terrainDisplacement *= uDisplacementFactor;
    terrainDisplacement = pow(terrainDisplacement, uDisplacementExponent);

    return sdfSphereVal - terrainDisplacement;
}

float sdf(vec3 pos, out float terrainDisplacement) {
    return sdSphereWithNoise(pos, SPHERE_RADIUS, terrainDisplacement);
}

vec3 calcSDFNormal(in vec3 p) {
    const float eps = 0.00001f;
    const vec2 h = vec2(eps, 0);
    float terrainDisplacement;
    return normalize(vec3(sdf(p + h.xyy, terrainDisplacement) - sdf(p - h.xyy, terrainDisplacement), 
                          sdf(p + h.yxy, terrainDisplacement) - sdf(p - h.yxy, terrainDisplacement), 
                          sdf(p + h.yyx, terrainDisplacement) - sdf(p - h.yyx, terrainDisplacement)));
}

void calcTerrainColor(vec3 currentPos, float terrainDisplacement, out vec3 color) {
    vec3 normal = calcSDFNormal(currentPos);

    // Blinn-Phong model
    float diffuse = clamp(dot(normal, SUNLIGHT_DIR), 0.0f, 1.0f);
    float ambient = 0.5f + 0.5f * dot(normal, SUNLIGHT_DIR);
    vec3 halfwaySpecVec = SUNLIGHT_DIR + normalize(currentPos - uEyeWorldPos);
    halfwaySpecVec = normalize(halfwaySpecVec);
    float specular = pow(max(dot(halfwaySpecVec, normal), 0.0), 32.0);

    float normalizedTerrainDisplacement = terrainDisplacement / (pow(uDisplacementFactor, uDisplacementExponent));

    if (normalizedTerrainDisplacement <= 0.3) {
        color = vec3(0.42f, 0.77f, 0.11f);
    }
    else if (normalizedTerrainDisplacement <= 0.5) {
        color = vec3(0.33f, 0.28f, 0.28f);
    }
    else {
        color = vec3(1.0);
    }

    color = color * (ambient + diffuse + specular);
}

void calcOceanColor(vec3 currentPos, vec3 stepDirection, out vec3 color) {
    float sceneDepth = length(currentPos - uEyeWorldPos);

    vec2 oceanSphereHitInfo = raySphereIntersection(vec3(0.0), SPHERE_RADIUS + OCEAN_DEPTH, uEyeWorldPos, stepDirection);
    float distanceToOcean = oceanSphereHitInfo.x;
    float distanceThroughOcean = oceanSphereHitInfo.y;
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

float calcAtmosphereDensityAtPoint(vec3 densitySamplePoint) {
    float heightAboveSurface = length(densitySamplePoint) - SPHERE_RADIUS;
    float normalizedHeight = heightAboveSurface / (ATMOSPHERE_SPHERE_RADIUS - SPHERE_RADIUS);

    return exp(-normalizedHeight * ATMOSPHERE_DENSITY_FALLOFF);
}

float calcAtmosphereOpticalDepth(vec3 rayOrigin, vec3 rayDirection, float rayLength) {
    vec3 densitySamplePoint = rayOrigin;
    float stepSize = rayLength / (OPTICAL_DEPTH_SAMPLE_POINTS_COUNT - 1.0);
    float opticalDepth = 0.0f;

    for (float i = 0.0; i < OPTICAL_DEPTH_SAMPLE_POINTS_COUNT; i++) {
        opticalDepth += calcAtmosphereDensityAtPoint(densitySamplePoint);    
        densitySamplePoint += rayDirection * stepSize;
    }
    opticalDepth *= stepSize;

    return opticalDepth;
}

vec3 calcScatteredAtmosphereLight(vec3 rayOrigin, vec3 rayDirection, float rayLength, vec3 color) {
    vec3 currentRayPos = rayOrigin;
    float stepSize = rayLength / (IN_SCATTER_LIGHT_SAMPLE_POINTS_COUNT - 1.0);
    vec3 inScatteredLight = vec3(0.0f);

    float viewRayOpticalDepth;

    for(float i = 0.0f; i < IN_SCATTER_LIGHT_SAMPLE_POINTS_COUNT; i++) {
        float sunRayLength = raySphereIntersection(vec3(0.0), ATMOSPHERE_SPHERE_RADIUS, currentRayPos, SUNLIGHT_DIR).y;
        float sunRayOpticalDepth = calcAtmosphereOpticalDepth(currentRayPos, SUNLIGHT_DIR, sunRayLength);
        viewRayOpticalDepth = calcAtmosphereOpticalDepth(currentRayPos, -rayDirection, stepSize * i);

        vec3 transmittance = exp(-(sunRayOpticalDepth + viewRayOpticalDepth) * LIGTH_SCATTERING_COEFFICIENTS);
        float localDensity = calcAtmosphereDensityAtPoint(currentRayPos);
        
        inScatteredLight += localDensity * transmittance;
    
        currentRayPos += rayDirection * stepSize;
    }
    inScatteredLight *= LIGTH_SCATTERING_COEFFICIENTS * stepSize;
    float originalColorTransmittance = exp(-viewRayOpticalDepth);
    return color * originalColorTransmittance + inScatteredLight;
}

void calcAtmosphereColor(vec3 currentPos, vec3 stepDirection, out vec3 color) {
    float sceneDepth = length(currentPos - uEyeWorldPos);
    
    vec2 oceanSphereHitInfo = raySphereIntersection(vec3(0.0), SPHERE_RADIUS + OCEAN_DEPTH, uEyeWorldPos, stepDirection);
    float dstToOcean = oceanSphereHitInfo.x;
    
    // the distance to either the terrain or the ocean
    float dstToSurface = min(dstToOcean, sceneDepth);

    vec2 atmosphereSphereHitInfo = raySphereIntersection(vec3(0.0), ATMOSPHERE_SPHERE_RADIUS, uEyeWorldPos, stepDirection);

    float dstThroughAtmosphere = min(atmosphereSphereHitInfo.y, dstToSurface - atmosphereSphereHitInfo.x);

    if (dstThroughAtmosphere > 0.0) {
        vec3 firstPointInAtmosphere = uEyeWorldPos + stepDirection * atmosphereSphereHitInfo.x;
        vec3 light = calcScatteredAtmosphereLight(firstPointInAtmosphere, stepDirection, dstThroughAtmosphere, color);
        // color = vec3(light);
        // color = firstPointInAtmosphere / 2.0 + 0.5;
        // color = color * (1.0 - light) + light;
        color = light;
    }
}

void main() {
    vec3 color;
    int steps = 0;

    // the computation distance should not exceed uBailout
    vec3 stepDirection = normalize(vFragmentPos);
    vec3 currentPos = uEyeWorldPos;
    
    float terrainDisplacement;

    while(true) {
        steps++;

        float nearestDist = sdf(currentPos, terrainDisplacement);

        currentPos += stepDirection * nearestDist;

        if(steps > MAX_STEPS || nearestDist >= BAILOUT_DIST) {
            color = vec3(0.0f);
            break;
        }

        if(nearestDist <= MIN_DIST) {
            calcTerrainColor(currentPos, terrainDisplacement, color);
            break;
        }
    }

    calcOceanColor(currentPos, stepDirection, color);

    calcAtmosphereColor(currentPos, stepDirection, color);

    fColor = vec4(color, 1.0f);
}
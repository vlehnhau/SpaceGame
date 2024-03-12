#version 300 es
precision mediump float;

uniform vec3 uEyeWorldPos;
uniform sampler2D uNoiseMap;
uniform samplerCube uCubeBackground;

uniform float uDisplacementFactor;
uniform float uDisplacementExponent;

in vec3 vFragmentPos;

out vec4 fColor;

const int MAX_STEPS = 100;
const float BAILOUT_DIST = 100.0f;
const float MIN_DIST = 0.0001f;

// const vec3 SUNLIGHT_DIR = normalize(vec3(0.2f, 0.6f, 0.5f));
const vec3 SUN_POSITION = vec3(0.0, 0.0, 1.0) * 100.0;
const float SPHERE_RADIUS = 0.5f;

// Variables configuring the look of the ocean
const float OCEAN_DEPTH = 0.02f;
const float OCEAN_DEPTH_FACTOR = 80.0f;
const float OCEAN_ALPHA_FACTOR = 420.0f;
const vec3 LIGHT_OCEAN_COLOR = vec3(0.0f, 0.55f, 0.97f);
const vec3 DEEP_OCEAN_COLOR  = vec3(0.04f, 0.01f, 0.27f);

// Variables configuring the look of the atmosphere
const float ATMOSPHERE_SPHERE_RADIUS = SPHERE_RADIUS + 0.2f;
const float IN_SCATTER_LIGHT_SAMPLE_POINTS_COUNT = 20.0f;
const float OPTICAL_DEPTH_SAMPLE_POINTS_COUNT = 20.0f;
const float ATMOSPHERE_DENSITY_FALLOFF = 7.0;
const float LIGHT_SCATTERING_STRENGTH = 20.0;
const vec3 LIGTH_SCATTERING_COEFFICIENTS = vec3(pow(400.0 / 700.0, 4.0) * LIGHT_SCATTERING_STRENGTH,
                                                pow(400.0 / 530.0, 4.0) * LIGHT_SCATTERING_STRENGTH,
                                                pow(400.0 / 440.0, 4.0) * LIGHT_SCATTERING_STRENGTH);

// Variables configuring the look of the terrain
const int TERRAIN_COLORS_COUNT = 5;
const vec3 TERRAIN_COLORS[TERRAIN_COLORS_COUNT] = vec3[](
    vec3(1.0,  1.0,  1.0), // bottom of the sea
    vec3(1.0,  0.8,  0.34), // beach
    vec3(0.5,  1.0,  0.0), // grass
    vec3(0.15, 0.15, 0.15), // mountains
    vec3(1.0,  1.0,  1.0) // top of the mountains
);

const float TERRAIN_COLORS_HEIGHTS[TERRAIN_COLORS_COUNT - 1] = float[](
    0.05,
    0.2f,
    0.3f,
    0.2f
);

const float TERRAIN_COLOR_TRANSITION_COEFF = 1.0f;

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

float sdfSphereWithNoise(vec3 p, float s, out float terrainDisplacement) {
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
    return sdfSphereWithNoise(pos, SPHERE_RADIUS, terrainDisplacement);
}

vec3 calcSDFNormal(in vec3 p) {
    const float eps = 0.00001f;
    const vec2 h = vec2(eps, 0);
    float terrainDisplacement;
    return normalize(vec3(sdf(p + h.xyy, terrainDisplacement) - sdf(p - h.xyy, terrainDisplacement), 
                          sdf(p + h.yxy, terrainDisplacement) - sdf(p - h.yxy, terrainDisplacement), 
                          sdf(p + h.yyx, terrainDisplacement) - sdf(p - h.yyx, terrainDisplacement)));
}

void calcTerrainColor(float terrainDisplacement, out vec3 color) {
    float normalizedTerrainDisplacement = terrainDisplacement / (pow(uDisplacementFactor, uDisplacementExponent));
    float normalizedOceanHeight = OCEAN_DEPTH / (pow(uDisplacementFactor, uDisplacementExponent));
    
    float currentHeight = normalizedOceanHeight;

    for(int i = 0; i < TERRAIN_COLORS_COUNT - 1; i++) {
        
        if (normalizedTerrainDisplacement <= currentHeight || 
            i == TERRAIN_COLORS_COUNT - 2) {
            float currentTransitionDiff = TERRAIN_COLORS_HEIGHTS[i] * TERRAIN_COLOR_TRANSITION_COEFF;

            color = TERRAIN_COLORS[i] * smoothstep(currentHeight + currentTransitionDiff,
                                                    currentHeight - currentTransitionDiff,
                                                    normalizedTerrainDisplacement)
                                                    +
                    TERRAIN_COLORS[i + 1] * smoothstep(currentHeight - currentTransitionDiff,
                                                       currentHeight + currentTransitionDiff,
                                                       normalizedTerrainDisplacement);
            break;
        }

        currentHeight += TERRAIN_COLORS_HEIGHTS[i];
    }
}   

// Returns true if the ocean was hit by the ray
bool calcOceanColor(vec3 currentPos, vec3 rayDirection, out vec3 color, out vec3 normal, out vec3 oceanHitPos) {
    float sceneDepth = length(currentPos - uEyeWorldPos);

    vec2 oceanSphereHitInfo = raySphereIntersection(vec3(0.0), SPHERE_RADIUS + OCEAN_DEPTH, uEyeWorldPos, rayDirection);
    float distanceToOcean = oceanSphereHitInfo.x;
    float distanceThroughOcean = oceanSphereHitInfo.y;
    float oceanViewDepth = min(distanceThroughOcean, sceneDepth - distanceToOcean);

    if (oceanViewDepth <= 0.0) 
        return false;
    
    // Interpolating between the deep and light ocean color 
    float opticalDepth = 1.0 - exp(-oceanViewDepth * OCEAN_DEPTH_FACTOR);
    vec3 oceanColor    = mix(LIGHT_OCEAN_COLOR, DEEP_OCEAN_COLOR, opticalDepth);
    
    // Interpolating between the terrain color and the calculated ocean color 
    float alpha = 1.0 - exp(-oceanViewDepth * OCEAN_ALPHA_FACTOR);
    color = mix(color, oceanColor, alpha);

    oceanHitPos = uEyeWorldPos + rayDirection * distanceToOcean;
    normal = normalize(oceanHitPos);
    return true;
}

void applyBlinnPhongLighting(vec3 currentPos, vec3 normal, float shininess, out vec3 color) {
    vec3 lightDir = normalize(currentPos - SUN_POSITION);

    vec3 viewDir = normalize(currentPos - uEyeWorldPos);
    
    float attInput = length(normalize(SUN_POSITION - currentPos));
    float attenuation = 0.8 / (1.0f + 0.1f * attInput + 0.01f * attInput * attInput);

    // diffuse light 
    float diffuse = max(dot(normal, -lightDir), 0.0f);

    // specular light
    vec3 halfwayVec = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, -halfwayVec), 0.0f), shininess * 2.0f);

    // ambient light
    float ambient = 0.2f;

    color *= ambient + (diffuse + specular) * attenuation;
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
        vec3 sunlightDir = normalize(SUN_POSITION - currentRayPos);
        float sunRayLength = raySphereIntersection(vec3(0.0), ATMOSPHERE_SPHERE_RADIUS, currentRayPos, sunlightDir).y;
        float sunRayOpticalDepth = calcAtmosphereOpticalDepth(currentRayPos, sunlightDir, sunRayLength);
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

void calcAtmosphereColor(vec3 currentPos, vec3 rayDirection, out vec3 color) {
    float sceneDepth = length(currentPos - uEyeWorldPos);
    
    vec2 oceanSphereHitInfo = raySphereIntersection(vec3(0.0), SPHERE_RADIUS + OCEAN_DEPTH, uEyeWorldPos, rayDirection);
    float dstToOcean = oceanSphereHitInfo.x;
    
    // The distance to either the terrain or the ocean
    float dstToSurface = min(dstToOcean, sceneDepth);

    vec2 atmosphereSphereHitInfo = raySphereIntersection(vec3(0.0), ATMOSPHERE_SPHERE_RADIUS, uEyeWorldPos, rayDirection);

    float dstThroughAtmosphere = min(atmosphereSphereHitInfo.y, dstToSurface - atmosphereSphereHitInfo.x);

    if (dstThroughAtmosphere > 0.0) {
        vec3 firstPointInAtmosphere = uEyeWorldPos + rayDirection * atmosphereSphereHitInfo.x;
        color = calcScatteredAtmosphereLight(firstPointInAtmosphere, rayDirection, dstThroughAtmosphere, color);
    }
}

void main() {
    vec3 color;
    int steps = 0;

    vec3 rayDirection = normalize(vFragmentPos);
    vec3 currentPos = uEyeWorldPos;
    
    float terrainDisplacement;
    bool hitTerrain = false;

    while(true) {
        steps++;

        float nearestDist = sdf(currentPos, terrainDisplacement);

        currentPos += rayDirection * nearestDist;

        if(steps > MAX_STEPS || nearestDist >= BAILOUT_DIST) {
            color = vec3(0.0f);
            break;
        }

        if(nearestDist <= MIN_DIST) {
            calcTerrainColor(terrainDisplacement, color);
            hitTerrain = true;
            break;
        }
    }

    vec3 normal = vec3(0.0); 
    vec3 oceanHitPos = vec3(0.0);
    bool hitOcean = calcOceanColor(currentPos, rayDirection, color, normal, oceanHitPos);

    if (!hitOcean && hitTerrain) {
        normal = calcSDFNormal(currentPos);
        applyBlinnPhongLighting(currentPos, normal, .5, color);
    }
    else {
        currentPos = oceanHitPos;
        applyBlinnPhongLighting(currentPos, normal, 200.0, color);
    }
    
    calcAtmosphereColor(currentPos, rayDirection, color);

    rayDirection.y *= -1.0;
    if (!hitTerrain && !hitOcean) {
        color += texture(uCubeBackground, rayDirection).rgb * 0.5;
        color /= 1.5;
    }

    float gamma = 1.5;
    // reinhard tone mapping
    color = color / (color + vec3(1.0));
    // gamma correction 
    color = pow(color, vec3(1.0 / gamma));

    
    fColor = vec4(color, 1.0f);
}
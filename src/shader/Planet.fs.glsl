#version 300 es
precision highp float;

uniform vec3 uEyeWorldPos;
uniform mat3 uRotationMatrix;

in vec3 vFragmentPos;

out vec4 fColor;

const int MAX_STEPS = 100;
const float BAILOUT_DIST = 10.0f;
const float MIN_DIST = 0.0001f;

const vec3 SUNLIGHT_DIR = vec3(0.2f, 0.6f, 0.5f);

// quadratic polynomial smoothing min function
float smin(float a, float b, float k) {
    k *= 4.0f;
    float h = max(k - abs(a - b), 0.0f) / k;
    return min(a, b) - h * h * k * (1.0f / 4.0f);
}

float opSmoothSubtraction( float d1, float d2, float k )
{
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h);
}

float opSmoothIntersection( float d1, float d2, float k )
{
    float h = clamp( 0.5 - 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) + k*h*(1.0-h);
}

float sdSphere(vec3 p, float s) {
    return length(p) - s;
}

float sdBoxFrame(vec3 p, vec3 b, float e) {
    p = abs(p) - b;
    vec3 q = abs(p + e) - e;
    return min(min(length(max(vec3(p.x, q.y, q.z), 0.0f)) +
        min(max(p.x, max(q.y, q.z)), 0.0f), length(max(vec3(q.x, p.y, q.z), 0.0f)) +
        min(max(q.x, max(p.y, q.z)), 0.0f)), length(max(vec3(q.x, q.y, p.z), 0.0f)) +
        min(max(q.x, max(q.y, p.z)), 0.0f));
}

float sdRoundBox(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b + r;
    return length(max(q, 0.0f)) + min(max(q.x, max(q.y, q.z)), 0.0f) - r;
}

float sdHexPrism(vec3 p, vec2 h) {
    const vec3 k = vec3(-0.8660254f, 0.5f, 0.57735f);
    p = abs(p);
    p.xy -= 2.0f * min(dot(k.xy, p.xy), 0.0f) * k.xy;
    vec2 d = vec2(length(p.xy - vec2(clamp(p.x, -k.z * h.x, k.z * h.x), h.x)) * sign(p.y - h.x), p.z - h.y);
    return min(max(d.x, d.y), 0.0f) + length(max(d, 0.0f));
}

float sdBox( vec3 p, vec3 b )
{
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sph( vec3 i, vec3 f, vec3 c )
{
    // random radius at grid vertex i+c (please replace this hash by
    // something better if you plan to use this for a real application)
    vec3  p = 17.0*fract( (i+c)*0.3183099+vec3(0.11,0.17,0.13) );
    float w = fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
    float r = 0.7*w*w;
    // distance to sphere at grid vertex i+c
    return length(f-c) - r;
}

float sdBase( vec3 p )
{
   vec3 i = floor(p);
    vec3 f =       fract(p);
   // distance to the 8 corners spheres
   return min(min(min(sph(i,f,vec3(0,0,0)),
                      sph(i,f,vec3(0,0,1))),
                  min(sph(i,f,vec3(0,1,0)),
                      sph(i,f,vec3(0,1,1)))),
              min(min(sph(i,f,vec3(1,0,0)),
                      sph(i,f,vec3(1,0,1))),
                  min(sph(i,f,vec3(1,1,0)),
                      sph(i,f,vec3(1,1,1)))));
}

float sdf(vec3 p) {
    // return sdBoxFrame(pos, vec3(0.4f), 0.04f);
    // return sdRoundBox(pos, vec3(0.5f, 0.3f, 0.5f), 0.025f);
    // return sdHexPrism(pos, vec2(0.2));
    // return sdSphere(pos, 1.0f);
    // float s = 1.0;
    // float sdfVal = sdSphere(pos, 1.0f);
    // for(int i = 0; i < 6; i++) {
    //     vec3 repPos = pos - s * round(pos / s);

    //     sdfVal = max(sdfVal, -sdBox(repPos, vec3(s * 0.3f)));

    //     s *= 0.5;
    // }
    // return sdfVal;
    float d = sdSphere(p, 0.5f);
    float s = 1.0;
    for(int i = 0; i < 7; i++)
    {
        // evaluate new octave
        float n = s*sdBase(p);

        // add
        n = opSmoothIntersection(n, d - 0.1 * s, 0.3 * s);
        d = smin(n, d, 0.3 * s);

        // prepare next octave
        p = mat3( 0.00,  1.60,  1.20,
                 -1.60,  0.72, -0.96,
                 -1.20, -0.96,  1.28 )*p;
        s = 0.5*s;
    }
    return d;
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
    vec3 stepDirection = uRotationMatrix * normalize(vFragmentPos - vec3(0, 0, 1));
    vec3 currentPos = uEyeWorldPos;
    while(true) {
        steps++;

        float nearestDist = sdf(currentPos);

        currentPos += stepDirection * nearestDist;

        if(steps > MAX_STEPS || nearestDist >= BAILOUT_DIST) {
            color = vec3(0.0f);
            break;
        }

        if(nearestDist <= MIN_DIST) {
            vec3 normal = calcSDFNormal(currentPos);

            float diffuse = clamp(dot(normal, SUNLIGHT_DIR), 0.0f, 1.0f);
            float ambient = 0.5f + 0.5f * dot(normal, SUNLIGHT_DIR);
            color = vec3(0.2f, 0.3f, 0.4f) * ambient + vec3(0.8f, 0.7f, 0.6f) * diffuse;

            break;
        }
    }

    fColor = vec4(color, 1.0f);
}

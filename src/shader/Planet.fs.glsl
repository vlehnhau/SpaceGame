#version 300 es
precision highp float;

uniform vec3 uEyeWorldPos;

in vec3 vFragmentPos;

out vec4 fColor;

const int MAX_STEPS = 200;
const float BAILOUT_DIST = 10.0f;
const float MIN_DIST = 0.0001f;

const vec3 SUNLIGHT_DIR = vec3(0.2f, 0.6f, 0.5f);

// quadratic polynomial smoothing min function
float smin(float a, float b, float k) {
    k *= 4.0f;
    float h = max(k - abs(a - b), 0.0f) / k;
    return min(a, b) - h * h * k * (1.0f / 4.0f);
}

float opSmoothSubtraction(float d1, float d2, float k) {
    float h = clamp(0.5f - 0.5f * (d2 + d1) / k, 0.0f, 1.0f);
    return mix(d2, -d1, h) + k * h * (1.0f - h);
}

float opSmoothIntersection(float d1, float d2, float k) {
    float h = clamp(0.5f - 0.5f * (d2 - d1) / k, 0.0f, 1.0f);
    return mix(d2, d1, h) + k * h * (1.0f - h);
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

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0f)) + min(max(q.x, max(q.y, q.z)), 0.0f);
}

float sph( vec3 i, vec3 f, vec3 c )
{
    // random radius at grid vertex i+c (please replace this hash by
    // something better if you plan to use this for a real application)
    vec3  p = 17.0*fract( (i+c)*0.3183099+vec3(0.11,0.17,0.13) );
    float w = fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
    float r = 0.4*w*w;
    // distance to sphere at grid vertex i+c
    return length(f-c) - r; 
}

// https://iquilezles.org/articles/fbmsdf
float sdBase( in vec3 p )
{
    vec3 i = floor(p);
    vec3 f = fract(p);
    return min(min(min(sph(i,f,vec3(0,0,0)),
                       sph(i,f,vec3(0,0,1))),
                   min(sph(i,f,vec3(0,1,0)),
                       sph(i,f,vec3(0,1,1)))),
               min(min(sph(i,f,vec3(1,0,0)),
                       sph(i,f,vec3(1,0,1))),
                   min(sph(i,f,vec3(1,1,0)),
                       sph(i,f,vec3(1,1,1)))));
}

float sdf(vec3 pos) {
    // return sdBoxFrame(p, vec3(0.4f), 0.04f);
    // return sdRoundBox(p, vec3(0.5f, 0.3f, 0.5f), 0.025f);
    // return sdHexPrism(p, vec2(0.2));
    // return sdSphere(pos - vec3(0.8, 0, 0), 0.3f);

    // float s = 1.0;
    // float sdfVal = sdSphere(pos, 1.2f);
    // for(int i = 0; i < 6; i++) {
    //     vec3 repPos = pos - s * round(pos / s);

    //     float repSDF = sdBox(repPos, s * vec3(0.5f));

    //     sdfVal = opSmoothIntersection(repSDF, sdfVal - 0.1f * s, 0.3f * s);

    //     s *= 0.5;
    // }
    // return sdfVal;
    return sdBase(pos);
}

float map_correct( in vec3 p )
{
    // domain repetition
    const int   n = 8;
    const float b = 6.283185/float(n);
    float a = atan(p.y,p.x);
    float i = floor(a/b);

    float c1 = b*(i+0.0); 
    vec2 p1 = mat2(cos(c1),-sin(c1),sin(c1), cos(c1))*p.xy;
    
    float c2 = b*(i+1.0); 
    vec2 p2 = mat2(cos(c2),-sin(c2),sin(c2), cos(c2))*p.xy;
    
    // evaluate two SDF instances
    return min( sdf(vec3(p1, p.z)), sdf(vec3(p2, p.z)) );
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
    while(true) {
        steps++;

        // float nearestDist = min(map_correct(currentPos), map_correct(currentPos.xzy));
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

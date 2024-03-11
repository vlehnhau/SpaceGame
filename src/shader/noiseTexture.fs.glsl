// Modified from: https://cs.nyu.edu/~perlin/noise/

const int[512] pArr = int[512] (
151,160,0,91,90,15, 131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,

151,160,0,91,90,15, 131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
);


float fade(float t) { 
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); 
}

float lerp(float t, float a, float b) { 
    return a + t * (b - a); 
}

float grad(int hash, float x, float y, float z) {
      int h = hash & 15;                      // CONVERT LO 4 BITS OF HASH CODE
      float u = h<8 ? x : y,                 // INTO 12 GRADIENT DIRECTIONS.
             v = h<4 ? y : h==12||h==14 ? x : z;
      return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
   }

float noise(float x, float y, float z, int additiveSeed) {
    int X = int(floor(x)) & 255;                  // FIND UNIT CUBE THAT
    int Y = int(floor(y)) & 255;                  // CONTAINS POINT.
    int Z = int(floor(z)) & 255;
    
    x -= floor(x);                                // FIND RELATIVE X,Y,Z
    y -= floor(y);                                // OF POINT IN CUBE.
    z -= floor(z);
    
    float u = fade(x);                                // COMPUTE FADE CURVES
    float v = fade(y);                                // FOR EACH OF X,Y,Z.
    float w = fade(z);

    // HASH COORDINATES OF THE 8 CUBE CORNERS
    int A  = pArr[X]   + Y;
    int AA = pArr[A]   + Z;
    int AB = pArr[A+1] + Z;      
    int B  = pArr[X+1] + Y; 
    int BA = pArr[B]   + Z; 
    int BB = pArr[B+1] + Z;      

    return lerp(w, lerp(v,  lerp(u, grad(pArr[AA    ] + additiveSeed, x      , y      , z      ),  // AND ADD
                                    grad(pArr[BA    ] + additiveSeed, x - 1.0, y      , z      )), // BLENDED
                            lerp(u, grad(pArr[AB    ] + additiveSeed, x      , y - 1.0, z      ),  // RESULTS
                                    grad(pArr[BB    ] + additiveSeed, x - 1.0, y - 1.0, z      ))),// FROM  8
                    lerp(v, lerp(u, grad(pArr[AA + 1] + additiveSeed, x      , y      , z - 1.0),  // CORNERS
                                    grad(pArr[BA + 1] + additiveSeed, x - 1.0, y      , z - 1.0)), // OF CUBE
                            lerp(u, grad(pArr[AB + 1] + additiveSeed, x      , y - 1.0, z - 1.0),
                                    grad(pArr[BB + 1] + additiveSeed, x - 1.0, y - 1.0, z - 1.0))));
}

const float PI = 3.145;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    float alpha = uv.y * PI - PI / 2.0;
    float beta = uv.x * 2.0 * PI - PI;
    
        int additiveSeed = 0;
    
    float noiseSum = 0.0;
    
    float frequency = 1.0;
    float amplitude = 1.0;
    
    float numIterations = 10.0;
    
    for (int i = 0; i < int(numIterations); i++) {        
        vec3 samplePoint = vec3(cos(alpha) * sin(beta),
                                sin(alpha),
                                cos(alpha) * cos(beta));
                                
        samplePoint *= frequency;
        
        noiseSum += noise(samplePoint.x, samplePoint.y, samplePoint.z, additiveSeed) * amplitude;
        
        frequency *= 4.0;
        amplitude *= 0.3;
    }
    
    vec3 col = vec3(noiseSum + 0.2);
    
    // Output to screen
    fragColor = vec4(col,1.0);
}
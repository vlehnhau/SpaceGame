#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vPosition;

uniform vec3 uLightColor;
uniform vec3 uLightPosition;
uniform vec3 uViewPosition; 
uniform float uShininess;

uniform vec3 uMaterialAmbient;
uniform vec3 uMaterialDiffuse;
uniform vec3 uMaterialSpecular;
uniform vec3 uMaterialEmissive;
uniform float uOpacity;
uniform float uOpticalDensity;
uniform int uIllum;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vPosition);
    vec3 viewDir = normalize(uViewPosition - vPosition);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    float diff = max(dot(norm, lightDir), 0.0);
    float spec = pow(max(dot(norm, halfwayDir), 0.0), uShininess);

    float diffusionCoefficient = 10000.0; 
    vec3 diffuse = uMaterialDiffuse * diff * uLightColor * diffusionCoefficient;

    vec3 ambient = uMaterialAmbient * uLightColor;
    vec3 specular = uMaterialSpecular * spec * uLightColor;
    vec3 emissive = uMaterialEmissive;

    vec3 result = ambient * (1.0 / uOpticalDensity) + (diffuse + specular + emissive) * 0.0001;

    // if (uIllum == 2) {
    //     result *= 0.2; 
    // } else {
    //     result *= 0.5;
    // }

    float gamma = 1.2;
    result = result / (result + vec3(1.0));
    result = pow(result, vec3(1.0 / gamma));

    fragColor = vec4(result, uOpacity);
}

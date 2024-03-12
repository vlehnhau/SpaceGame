#version 300 es
precision highp float;

in vec3 vNormal;
in vec3 vPosition;

uniform vec3 uMaterialDiffuse;
uniform vec3 uLightColor;
uniform vec3 uLightPosition;
uniform float uAmbientStrength;
uniform vec3 uAmbientColor;

out vec4 fColor;

void main() {
    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(uLightPosition - vPosition);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diff * uLightColor * uMaterialDiffuse;
    
    // vec3 ambient = uAmbientStrength * uAmbientColor * uMaterialDiffuse;
    vec3 ambient = uMaterialDiffuse;

    vec3 result = diffuse + ambient;
    
    fColor = vec4(result, 1.0);
}

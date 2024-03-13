#version 300 es
precision highp float;

in vec3 vTextureCoord;

uniform samplerCube uSkybox;

out vec4 fragColor;

void main() {
    fragColor = texture(uSkybox, vTextureCoord);
}

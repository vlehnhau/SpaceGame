#version 300 es
precision highp float;

in vec3 uColor;

out vec4 fColor;

void main() {
    fColor = vec4(vIntensity*uColor.r,vIntensity*uColor.g,vIntensity*uColor.b,1.0);
}

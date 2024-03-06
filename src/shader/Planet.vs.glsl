#version 300 es
precision highp float;

uniform mat4 uProjectionMatrix;

layout(location = 0)in vec3 aPosition;

out vec3 vFragmentPos;

void main() {
    vec4 testVec = vec4(aPosition, 1.0);
    vFragmentPos = vec3(testVec.xyz / testVec.w);
    gl_Position = uProjectionMatrix * vec4(aPosition, 1.0);
}

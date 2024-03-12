#version 300 es
precision highp float;

uniform mat4 uProjectionMatrix;
uniform mat3 uViewDirectionRotationMatrix;

layout(location = 0)in vec3 aPosition;

out vec3 vFragmentPos;

void main() {
    vFragmentPos = uViewDirectionRotationMatrix * aPosition;
    gl_Position = uProjectionMatrix * vec4(aPosition, 1.0);
}

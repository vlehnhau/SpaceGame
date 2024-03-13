#version 300 es

layout (location = 0) in vec3 aPosition;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vTextureCoord;

void main() {
    vTextureCoord = aPosition;
    vec4 pos = uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);
    gl_Position = pos.xyww;
}

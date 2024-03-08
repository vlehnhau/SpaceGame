#version 300 es

in vec3 aPosition;
in vec2 aTextCord;
in vec3 aNormal;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;

out vec3 vNormal;
out vec3 vPosition;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);

    vNormal = uNormalMatrix * aNormal;
    
    vPosition = vec3(uModelViewMatrix * vec4(aPosition, 1.0));
}

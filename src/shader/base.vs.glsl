#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;

uniform mat4 uModelView;
uniform mat4 uProjection;

out vec3 uColor;

void main() {
    gl_Position = uProjection * uModelView * vec4(aPosition,1.0);
    uColor = aColor;
}

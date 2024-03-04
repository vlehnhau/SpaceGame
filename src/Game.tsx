import * as comp from "./Components";
import * as ent from "./Entity";


import VertexCode from './shader/base.vs.glsl?raw';
import FragmentCode from './shader/base.fs.glsl?raw';
import { compileShaderProgram } from "./Utility";
import { Matrix4, Vector3 } from "@math.gl/core";

export class Game {
    draw(gl: WebGL2RenderingContext) {
        let near = 10;
        let far = 100;

        let aspect = gl.canvas.width / gl.canvas.height;

        const projMatrix = new Matrix4().perspective(
            {
                fovy: 80,
                aspect: aspect,
                near: near,
                far: far
            });

        const viewMatrix = new Matrix4().lookAt(
            {
                eye: new Vector3(0, 0, 1),
                center: new Vector3(0),
                up: new Vector3(0, 1, 0)
            });
    }


    constructor(gl: WebGL2RenderingContext) {
        const program = compileShaderProgram(gl, VertexCode, FragmentCode);
        gl.useProgram(program);
    }
}
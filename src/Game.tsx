import * as comp from "./Components";
import * as ent from "./Entity";


import VertexCode from './shader/base.vs.glsl?raw';
import FragmentCode from './shader/base.fs.glsl?raw';
import { compileShaderProgram } from "./Utility";
import { Matrix4, Vector3 } from "@math.gl/core";

export class Game {
    entities: Array<ent.Entity>;
    shaderID: WebGLProgram;

    constructor(gl: WebGL2RenderingContext) {
        this.shaderID = compileShaderProgram(gl, VertexCode, FragmentCode);

        const vbo = [
            -1, -1, -1,
            1, -1, -1,
            -1, 1, -1,
            1, 1, -1,
            -1, 1, 1,
            1, 1, 1,
            -1, -1, 1,
            1, -1, 1,
            -1, -1, -1,
            -1, 1, -1,
            1, -1, -1,
            1, 1, -1,
            -1, -1, 1,
            -1, 1, 1,
            1, -1, 1,
            1, 1, 1,
            -1, -1, -1,
            -1, -1, 1,
            1, -1, -1,
            1, -1, 1,
            1, 1, -1,
            1, 1, 1,
            -1, 1, -1,
            -1, 1, 1,
    
            -1, -1, -1,
            1e10, -1, -1,
            -1, 1, -1,
            1e10, 1, -1,
            -1, 1, 1,
            1e10, 1, 1,
            -1, -1, 1,
            1e10, -1, 1,
    
            -1, -1, -1,
            -1, -1, -1e10,
            -1, 1, -1,
            -1, 1, -1e10,
            1, -1, -1,
            1, -1, -1e10,
            1, 1, -1,
            1, 1, -1e10,
    
            -1, -1, -1,
            -1, -1e10, -1,
            -1, -1, 1,
            -1, -1e10, 1,
            1, -1, -1,
            1, -1e10, -1,
            1, -1, 1,
            1, -1e10, 1
        ];

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbo), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        this.entities = [new ent.Player(new Vector3(0,0,0), vao, vbo.length/3)]
    }

    draw(gl: WebGL2RenderingContext) {
        let near = 0.1;
        let far = 100;

        let aspect = gl.canvas.width / gl.canvas.height;
        console.log(gl.canvas.height);

        const projMatrix = new Matrix4().perspective(
            {
                fovy: 80 * Math.PI / 180,
                aspect: aspect,
                near: near,
                far: far
            });

        const viewMatrix = new Matrix4().lookAt(
            {
                eye: new Vector3(0, 0, 1),
                center: new Vector3(0,0,-1),
                up: new Vector3(0, 1, 0)
            });

        gl.useProgram(this.shaderID);
        let projectionLoc = gl.getUniformLocation(this.shaderID, 'uProjection');
        let modelViewLoc = gl.getUniformLocation(this.shaderID, 'uModelView');
        gl.uniformMatrix4fv(projectionLoc, false, projMatrix);

        this.entities.forEach(entity => {
            const renderComp = entity.components.find(component => component instanceof comp.RenderComp) as comp.RenderComp;
            const positionComp = entity.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

            if (renderComp && positionComp) {
                const modelMatrix = new Matrix4().makeTranslation(positionComp.pos.x, positionComp.pos.y, positionComp.pos.z);
                
                modelMatrix.multiplyRight(viewMatrix);

                gl.bindVertexArray(renderComp.vao);
                gl.uniformMatrix4fv(modelViewLoc, false, modelMatrix);
                gl.drawArrays(gl.TRIANGLES, 0, renderComp.countTriangles);
            }
        }); 
    }
}
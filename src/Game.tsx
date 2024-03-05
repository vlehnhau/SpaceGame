import * as comp from "./Components";
import * as ent from "./Entity";
import { loadObj } from "./ObjLoader";


import VertexCode from './shader/base.vs.glsl?raw';
import FragmentCode from './shader/base.fs.glsl?raw';
import ModelObjRaw from './../resources/Spaceship.obj?raw';
import ModelMtlRaw from './../resources/Spaceship.mtl?raw';
import { compileShaderProgram } from "./Utility";
import { Matrix4, Vector3 } from "@math.gl/core";

export class Game {
    entities: Array<ent.Entity>;
    shaderID: WebGLProgram;

    constructor(gl: WebGL2RenderingContext) {
        const obj = loadObj(gl, ModelObjRaw, ModelMtlRaw);
        this.shaderID = compileShaderProgram(gl, VertexCode, FragmentCode);

        // const vbo = [
        //     -1, -1, -1,
        //     1, -1, -1,
        //     -1, 1, -1,
        //     1, 1, -1,
        //     -1, 1, 1,
        //     1, 1, 1,
        //     -1, -1, 1,
        //     1, -1, 1,
        //     -1, -1, -1,
        //     -1, 1, -1,
        //     1, -1, -1,
        //     1, 1, -1,
        //     -1, -1, 1,
        //     -1, 1, 1,
        //     1, -1, 1,
        //     1, 1, 1,
        //     -1, -1, -1,
        //     -1, -1, 1,
        //     1, -1, -1,
        //     1, -1, 1,
        //     1, 1, -1,
        //     1, 1, 1,
        //     -1, 1, -1,
        //     -1, 1, 1
        // ];

        // const vao = gl.createVertexArray();
        // gl.bindVertexArray(vao);

        // const vertexBuffer = gl.createBuffer();
        // gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbo), gl.STATIC_DRAW);
        // gl.enableVertexAttribArray(0);
        // gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        this.entities = [new ent.Player(new Vector3(0, 0, 0), obj.vbo, obj.iboLength / 3)]
    }

    move(direction: string) { 
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

        switch(direction) {
            case 'left':
                playerPos.pos.x = playerPos.pos.x - 10;
                break;
            case 'right':
                playerPos.pos.x = playerPos.pos.x + 10;
                break;
            case 'up':
                playerPos.pos.y = playerPos.pos.y + 10;
                break;
            case 'down':
                playerPos.pos.y = playerPos.pos.y - 10;
                break;
        }
    }

    draw(gl: WebGL2RenderingContext) {
        let near = 0.1;
        let far = 10000;

        let aspect = gl.canvas.width / gl.canvas.height;

        const projMatrix = new Matrix4().perspective(
            {
                fovy: 80 * Math.PI / 180,
                aspect: aspect,
                near: near,
                far: far
            });

        const viewMatrix = new Matrix4().lookAt(
            {
                eye: new Vector3(0, 0, -400),
                center: new Vector3(0, 0, -300),
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
                // gl.drawArrays(gl.TRIANGLES, 0, renderComp.countTriangles);
                gl.drawElements(gl.TRIANGLES, renderComp.countTriangles * 3, gl.UNSIGNED_INT, 0);
            }
        });
    }
}
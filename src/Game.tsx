import * as comp from "./Components";
import * as ent from "./Entity";
import { loadObj } from "./ObjLoader";


import VertexCode from './shader/base.vs.glsl?raw';
import FragmentCode from './shader/base.fs.glsl?raw';
import ModelObjRaw from './../resources/Spaceship.obj?raw';
import ModelMtlRaw from './../resources/Spaceship.mtl?raw';
import { compileShaderProgram } from "./Utility";
import { Matrix4, Vector3 } from "@math.gl/core";

import ModelObjRawBullettracer from './../resources/LazerBullet.obj?raw';
import ModelMtlRawBullettracer from './../resources/LazerBullet.mtl?raw';

import ModelObjRawAsteroidOne from './../resources/Rock.obj?raw';
import ModelMtlRawAsteroidOne from './../resources/Rock.mtl?raw';

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export class Game {
    entities: Array<ent.Entity>;
    shaderID: WebGLProgram;

    modelVBO: Array<WebGLVertexArrayObject>; 
    modelLength: Array<number>;

    modelVBOBullet: WebGLVertexArrayObject;
    modelLengthBullet: number;

    constructor(gl: WebGL2RenderingContext) {
        const obj = loadObj(gl, ModelObjRaw, ModelMtlRaw);
        this.shaderID = compileShaderProgram(gl, VertexCode, FragmentCode);

        this.modelVBO = [loadObj(gl, ModelObjRawAsteroidOne, ModelMtlRawAsteroidOne).vbo];
        this.modelLength = [loadObj(gl, ModelObjRawAsteroidOne, ModelMtlRawAsteroidOne).iboLength];

        this.modelVBOBullet = loadObj(gl, ModelObjRawBullettracer, ModelMtlRawBullettracer).vbo;
        this.modelLengthBullet = loadObj(gl, ModelObjRawBullettracer, ModelMtlRawBullettracer).iboLength;


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

        this.entities = [];

        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.entities.push(new ent.Player(new Vector3(0, -300, -10), obj.vbo, obj.iboLength / 3));
    }

    shoot() {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

        let source = playerPos.pos
        let destination = new Vector3(0, 0, 0);

        destination.x = source.x;
        destination.y = source.y;
        destination.z = source.z;   
        
        this.entities.push(new ent.Bullet(destination, this.modelVBOBullet, this.modelLengthBullet / 3));
    }

    spawnAstroid() {
        let startPos = new Vector3(randomIntFromInterval(-10000,10000), randomIntFromInterval(-4000, 4000), randomIntFromInterval(-6000, -5000));
        let x = randomIntFromInterval(0, this.modelVBO.length - 1);

        this.entities.push(new ent.Asteroid(startPos, this.modelVBO[x], this.modelLength[x] / 3));
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

    autoMove() {
        this.entities.forEach(entity => {
            const velocityComp = entity.components.find(component => component instanceof comp.Velocity) as comp.Velocity;
            const positionComp = entity.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

            if (velocityComp && positionComp) {
                positionComp.pos = new Vector3().add(velocityComp.vel, positionComp.pos);

                if (entity instanceof ent.Asteroid && positionComp.pos.z > 500) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                    this.spawnAstroid();
                } else if(positionComp.pos.z< -10000) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                } 
            }

        });
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

        let copy = this.entities.slice();
        copy.sort((entityA, entityB) => {
            const positionCompA = entityA.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
            const positionCompB = entityB.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

            if (positionCompA && positionCompB) {
                return positionCompA.pos.z - positionCompB.pos.z;
            } else if (positionCompA) {
                return positionCompA.pos.z
            } else if (positionCompB) {
                return positionCompB.pos.z
            } else {
                //toDo: stimmt das hier für jeden Fall?
            }
        })

        copy.forEach(entity => {
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
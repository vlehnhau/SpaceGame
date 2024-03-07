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

        this.entities = [];

        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();

        this.entities.push(new ent.Player(new Vector3(0, -300, -1000), obj.vbo, obj.iboLength / 3));
    }

    shoot() {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

        let destination = new Vector3(playerPos.pos.x, playerPos.pos.y, playerPos.pos.z - 50);
        
        this.entities.push(new ent.Bullet(destination, this.modelVBOBullet, this.modelLengthBullet / 3));
    }

    spawnAstroid() {
        let startPos = new Vector3(randomIntFromInterval(-10000,10000), randomIntFromInterval(-4000, 4000), randomIntFromInterval(-6000, -5000));
        let x = randomIntFromInterval(0, this.modelVBO.length - 1);

        this.entities.push(new ent.Asteroid(startPos, this.modelVBO[x], this.modelLength[x] / 3));
    }

    move(direction: string) { 
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let newPos = new Vector3();

        switch(direction) {
            case 'left':
                newPos = new Vector3(player.newPos.x - 100, player.newPos.y, player.newPos.z);
                break;
            case 'right':
                newPos = new Vector3(player.newPos.x + 100, player.newPos.y, player.newPos.z);
                break;
            case 'up':
                newPos = new Vector3(player.newPos.x, player.newPos.y + 100, player.newPos.z);
                break;
            case 'down':
                newPos = new Vector3(player.newPos.x, player.newPos.y - 100, player.newPos.z);
                break;
        }

        let pos = (player.components.find(componentPos => componentPos instanceof comp.PositionComp) as comp.PositionComp).pos
        
        let borderX = 2000;
        let borderY = 1000;
        
        if (pos.x > borderX) {
            player.InitiatePlayerMove(new Vector3(borderX - 1, newPos.y, pos.z));
        } else if (pos.x < -borderX) {
            player.InitiatePlayerMove(new Vector3(-borderX + 1, newPos.y, pos.z));
        } else if (pos.y > borderY) {
            player.InitiatePlayerMove(new Vector3(newPos.x, borderY - 1, pos.z));
        } else if (pos.y < -borderY) {
            player.InitiatePlayerMove(new Vector3(newPos.x, -borderY + 1, pos.z));
        } else {
            player.InitiatePlayerMove(newPos)
        }
    }

    autoMove() {
        this.entities.forEach(entity => {
            const velocityComp = entity.components.find(component => component instanceof comp.VelocityComp) as comp.VelocityComp;
            const positionComp = entity.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

            if (velocityComp && positionComp) {
                positionComp.pos = new Vector3().add(velocityComp.vel, positionComp.pos);

                if (entity instanceof ent.Asteroid && positionComp.pos.z > 500) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                    this.spawnAstroid();
                } else if(positionComp.pos.z< -10000) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                } else if(entity instanceof ent.Player) {
                    let vel = (entity.components.find(componentVel => componentVel instanceof comp.VelocityComp) as comp.VelocityComp).vel

                    if (vel === new Vector3(0)) { 
                        vel = positionComp.pos;
                    } else {
                        vel = vel.multiplyByScalar(0.99);
                    }
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
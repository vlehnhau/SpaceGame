import * as comp from "./Components";
import * as ent from "./Entity";
import { loadObj } from "./ObjLoader";
import { VaoMaterialInfo, exportObjLoader } from "./ObjLoader";


import VertexCode from './shader/base.vs.glsl?raw';
import FragmentCode from './shader/base.fs.glsl?raw';
import ModelObjRaw from './../resources/Spaceship.obj?raw';
import ModelMtlRaw from './../resources/Spaceship.mtl?raw';
import { compileShaderProgram, normalMatrix } from "./Utility";
import { Matrix4, Vector3 } from "@math.gl/core";

import ModelObjRawBullettracer from './../resources/LazerBullet.obj?raw';
import ModelMtlRawBullettracer from './../resources/LazerBullet.mtl?raw';

import ModelObjRawAsteroidOne from './../resources/Rock.obj?raw';
import ModelMtlRawAsteroidOne from './../resources/Rock.mtl?raw';
import { render } from "react-dom";

function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export class Game {
    entities: Array<ent.Entity>;
    shaderID: WebGLProgram;

    objListAsteroids: Array<exportObjLoader>;

    objBullet: exportObjLoader;

    modelVBO: Array<WebGLVertexArrayObject>; 
    modelLength: Array<number>;
    modelMaterials: Array<{}>;
    modelVertices: number;

    modelVBOBullet: WebGLVertexArrayObject;
    modelLengthBullet: number;
    modelMaterialBullet: {};

    constructor(gl: WebGL2RenderingContext) {
        const objSpaceship = loadObj(gl, ModelObjRaw, ModelMtlRaw);
        this.shaderID = compileShaderProgram(gl, VertexCode, FragmentCode);

        this.objListAsteroids = [loadObj(gl, ModelObjRawAsteroidOne, ModelMtlRawAsteroidOne)];

        this.objBullet = loadObj(gl, ModelObjRawBullettracer, ModelMtlRawBullettracer);

        this.entities = [];

        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();
        this.spawnAstroid();

        this.entities.push(new ent.Player(new Vector3(0, -300, -1000), objSpaceship.vaoInfos, objSpaceship.vertexPositions));
    }

    shoot() {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

        let destination = new Vector3(playerPos.pos.x, playerPos.pos.y, playerPos.pos.z - 50);
        
        this.entities.push(new ent.Bullet(destination, this.objBullet.vaoInfos));
    }

    spawnAstroid() {
        let startPos = new Vector3(randomIntFromInterval(-10000,10000), randomIntFromInterval(-4000, 4000), randomIntFromInterval(-6000, -5000));
        let x = randomIntFromInterval(0, this.objListAsteroids.length - 1);

        this.entities.push(new ent.Asteroid(startPos, this.objListAsteroids[x].vaoInfos, this.objListAsteroids[x].vertexPositions));
    }

    move(direction: string) { 
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let newPos = new Vector3();

        switch(direction) {
            case 'left':
                newPos = new Vector3(player.newPos.x - 100, player.newPos.y, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.z += -0.005
                break;
            case 'right':
                newPos = new Vector3(player.newPos.x + 100, player.newPos.y, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.z += 0.005
                break;
            case 'up':
                newPos = new Vector3(player.newPos.x, player.newPos.y + 100, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.x += -0.005
                break;
            case 'down':
                newPos = new Vector3(player.newPos.x, player.newPos.y - 100, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.x += 0.005
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
        } // ToDo: Eckpunkte müssen noch eingebunden werden und an ration anpassen

        (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).activity = true;        
    }

    autoMove() {
        this.entities.forEach(entity => {
            const velocityComp = entity.components.find(component => component instanceof comp.VelocityComp) as comp.VelocityComp;
            const positionComp = entity.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
            const rotationComp = entity.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp;

            if (velocityComp && positionComp) {
                positionComp.pos = new Vector3().add(velocityComp.vel, positionComp.pos );

                if (entity instanceof ent.Asteroid && positionComp.pos.z > 500) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                    this.spawnAstroid();
                } else if(positionComp.pos.z< -10000) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                } else if(entity instanceof ent.Player) {
                    let vel = (entity.components.find(componentVel => componentVel instanceof comp.VelocityComp) as comp.VelocityComp).vel

                    vel = vel.multiplyByScalar(0.99);

                    if(vel.x <= 2 && vel.x >= -2 && vel.y <= 2 && vel.y >= -2 && vel.z <= 2 && vel.z >= -2) {
                        rotationComp.activity = false;
                    }

                    if (rotationComp.activity){
                        if(rotationComp.rot.x <= 0.2 && rotationComp.rotFuture.x >= 0) {
                            rotationComp.rot.x = rotationComp.rot.x + rotationComp.rotFuture.x;
                        } else if (rotationComp.rot.x >= -0.2 && rotationComp.rotFuture.x <= 0) {
                            rotationComp.rot.x = rotationComp.rot.x + rotationComp.rotFuture.x;
                        }
        
                        if(rotationComp.rot.z <= 1 && rotationComp.rotFuture.z >= 0) {
                            rotationComp.rot.z = rotationComp.rot.z + rotationComp.rotFuture.z;
                        } else if (rotationComp.rot.z >= -1 && rotationComp.rotFuture.z <= 0) {
                            rotationComp.rot.z = rotationComp.rot.z + rotationComp.rotFuture.z;
                        }
                    } else {
                        rotationComp.rot = rotationComp.rot.multiplyByScalar(0.99);
                    }


                    rotationComp.rotFuture = rotationComp.rotFuture.multiplyByScalar(0.85);
                } else if (entity instanceof ent.Asteroid) {
                    rotationComp.rot = new Vector3().addVectors(rotationComp.rot, rotationComp.rotFuture);
                }
            }

        });
    }
    
    collisionAsteroid() {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let asteroid = (this.entities as any).find(entity => entity instanceof ent.Asteroid) as ent.Asteroid;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
        let asteroidPos = asteroid.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
        let playerRadius = player.components.find(component => component instanceof comp.MaxRadius) as comp.MaxRadius;
        let asteroidRadius = asteroid.components.find(component => component instanceof comp.MaxRadius) as comp.MaxRadius;

        let distanceCenter = Math.sqrt(Math.pow(playerPos.pos.x - asteroidPos.pos.x, 2) + Math.pow(playerPos.pos.y - asteroidPos.pos.y, 2) + Math.pow(playerPos.pos.z - asteroidPos.pos.z, 2));
        let distance = (distanceCenter - (playerRadius.maxRadius + asteroidRadius.maxRadius));

        //console.log(playerRadius, asteroidRadius, distance);

        if (distance <= 0) {
            console.log('Collision');
            asteroidPos.pos = new Vector3 (asteroidPos.pos.x + 10, asteroidPos.pos.y + 10, asteroidPos.pos.z + 10);
        }
    }

    draw(gl: WebGL2RenderingContext) {

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let near = 0.1;
        let far = 10000;
        let aspect = gl.canvas.width / gl.canvas.height;
    
        const projMatrix = new Matrix4().perspective({
            fovy: 80 * Math.PI / 180,
            aspect: aspect,
            near: near,
            far: far
        });
    
        const viewMatrix = new Matrix4().lookAt({
            eye: new Vector3(0, 0, -400),
            center: new Vector3(0, 0, -300),
            up: new Vector3(0, 1, 0)
        });
    
        gl.useProgram(this.shaderID);
        let projectionLoc = gl.getUniformLocation(this.shaderID, 'uProjectionMatrix');
        let modelViewLoc = gl.getUniformLocation(this.shaderID, 'uModelViewMatrix');
    
        gl.uniformMatrix4fv(projectionLoc, false, projMatrix);
    
        this.entities.forEach(entity => {
            const renderComp = entity.components.find(component => component instanceof comp.RenderComp) as comp.RenderComp;
            const positionComp = entity.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
            
            renderComp.voaMatInfo.forEach(phase => {
                const rotationComp = entity.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp;
    
                let modelMatrix = new Matrix4().makeTranslation(positionComp.pos.x, positionComp.pos.y, positionComp.pos.z);
    
                if (rotationComp) {
                    modelMatrix.rotateX(-rotationComp.rot.x); 
                    modelMatrix.rotateY(-rotationComp.rot.y); 
                    modelMatrix.rotateZ(-rotationComp.rot.z); 
                }                
    
                let modelViewMatrix = viewMatrix.clone().multiplyLeft(modelMatrix);
    
                const materialProps = phase.material;
                const uMaterialDiffuseLoc = gl.getUniformLocation(this.shaderID, 'uMaterialDiffuse');
                
                gl.uniform3fv(uMaterialDiffuseLoc, materialProps.diffuse);
                gl.bindVertexArray(phase.vao);
                gl.uniformMatrix4fv(modelViewLoc, false, modelViewMatrix);
                let normalMatrixPrivat = normalMatrix(modelViewMatrix);
                gl.uniformMatrix3fv(gl.getUniformLocation(this.shaderID, 'uNormalMatrix'), false, normalMatrixPrivat);
                gl.drawElements(gl.TRIANGLES, phase.iboLength, gl.UNSIGNED_INT, 0);
            });
        });
    }
    
}
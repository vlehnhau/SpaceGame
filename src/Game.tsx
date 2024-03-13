import * as comp from "./Components";
import * as ent from "./Entity";
import { loadObj } from "./ObjLoader";
import { VaoMaterialInfo, exportObjLoader } from "./ObjLoader";


import VertexCode from './shader/base.vs.glsl?raw';
import FragmentCode from './shader/base.fs.glsl?raw';
import VertexCodeSkyBox from './shader/SkyboxVertexShader.vs.glsl?raw';
import FragmentCodeSkyBox from './shader/SkyboxFragmentShader.fs.glsl?raw';
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
    skyboxShaderProgram: WebGLProgram;
    skyboxVao: WebGLVertexArrayObject;


    objListAsteroids: Array<exportObjLoader>;

    objBullet: exportObjLoader;
    
    skyboxTexture: WebGLTexture;

    constructor(gl: WebGL2RenderingContext) {
        const objSpaceship = loadObj(gl, ModelObjRaw, ModelMtlRaw);
        this.shaderID = compileShaderProgram(gl, VertexCode, FragmentCode);
        this.skyboxShaderProgram = compileShaderProgram(gl, VertexCodeSkyBox, FragmentCodeSkyBox);

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
        let startPos = new Vector3(randomIntFromInterval(-10000, 10000), randomIntFromInterval(-4000, 4000), randomIntFromInterval(-6000, -5000));
        let x = randomIntFromInterval(0, this.objListAsteroids.length - 1);

        this.entities.push(new ent.Asteroid(startPos, this.objListAsteroids[x].vaoInfos, this.objListAsteroids[x].vertexPositions));
    }

    move(direction: string) {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let newPos = new Vector3();

        switch (direction) {
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
                positionComp.pos = new Vector3().add(velocityComp.vel, positionComp.pos);

                if (entity instanceof ent.Asteroid && positionComp.pos.z > 500) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                    this.spawnAstroid();
                } else if (positionComp.pos.z < -10000) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                } else if (entity instanceof ent.Player) {
                    let vel = (entity.components.find(componentVel => componentVel instanceof comp.VelocityComp) as comp.VelocityComp).vel

                    vel = vel.multiplyByScalar(0.99);

                    if (vel.x <= 2 && vel.x >= -2 && vel.y <= 2 && vel.y >= -2 && vel.z <= 2 && vel.z >= -2) {
                        rotationComp.activity = false;
                    }

                    if (rotationComp.activity) {
                        if (rotationComp.rot.x <= 0.2 && rotationComp.rotFuture.x >= 0) {
                            rotationComp.rot.x = rotationComp.rot.x + rotationComp.rotFuture.x;
                        } else if (rotationComp.rot.x >= -0.2 && rotationComp.rotFuture.x <= 0) {
                            rotationComp.rot.x = rotationComp.rot.x + rotationComp.rotFuture.x;
                        }

                        if (rotationComp.rot.z <= 1 && rotationComp.rotFuture.z >= 0) {
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
            asteroidPos.pos = new Vector3(asteroidPos.pos.x + 10, asteroidPos.pos.y + 10, asteroidPos.pos.z + 10);
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

            console.log(renderComp.voaMatInfo.length)

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

                if (materialProps.diffuse) {const uMaterialDiffuseLoc = gl.getUniformLocation(this.shaderID, 'uMaterialDiffuse'); gl.uniform3fv(uMaterialDiffuseLoc, materialProps.diffuse);}
                if (materialProps.ambient) { const uMaterialAmbiantLoc = gl.getUniformLocation(this.shaderID, 'uMaterialAmbient'); gl.uniform3fv(uMaterialAmbiantLoc, materialProps.ambient);}
                if (materialProps.specular) { const uMaterialSpecularsLoc = gl.getUniformLocation(this.shaderID, 'uMaterialSpecular'); gl.uniform3fv(uMaterialSpecularsLoc, materialProps.specular);}
                if (materialProps.emissive) { const uMaterialEmissiveLoc = gl.getUniformLocation(this.shaderID, 'uMaterialEmissive'); gl.uniform3fv(uMaterialEmissiveLoc, materialProps.emissive); }
                if (materialProps.opticalDensity) { const uOpticalDensityLoc = gl.getUniformLocation(this.shaderID, 'uOpticalDensity'); gl.uniform1f(uOpticalDensityLoc, materialProps.opticalDensity || 1.0); }
                if (materialProps.illum) {const uIllumLoc = gl.getUniformLocation(this.shaderID, 'uIllum'); gl.uniform1i(uIllumLoc, materialProps.illum || 0); };

                let opacityLoc = gl.getUniformLocation(this.shaderID, 'uOpacity'); 
                
                const lightPosition = [15000.0, 15000.0, 1500.0]; 
                const lightColor = [1.0, 1.0, 1.0]

                const lightPositionLoc = gl.getUniformLocation(this.shaderID, 'uLightPosition');
                const lightColorLoc = gl.getUniformLocation(this.shaderID, 'uLightColor');
                gl.uniform3fv(lightPositionLoc, lightPosition);
                gl.uniform3fv(lightColorLoc, lightColor);

                const opacity = materialProps.opacity * 2 || 1.0;
                gl.uniform1f(opacityLoc, opacity);
            
                
                gl.bindVertexArray(phase.vao);
                gl.uniformMatrix4fv(modelViewLoc, false, modelViewMatrix);
                let normalMatrixPrivat = normalMatrix(modelViewMatrix);
                gl.uniformMatrix3fv(gl.getUniformLocation(this.shaderID, 'uNormalMatrix'), false, normalMatrixPrivat);
                gl.drawElements(gl.TRIANGLES, phase.iboLength, gl.UNSIGNED_INT, 0);
            });
        });

        //this.drawSkybox(gl, projMatrix, viewMatrix);

    }


    



    



























    
    // async loadCubemapTextures(gl, paths) {
    //     this.skyboxTexture = gl.createTexture();
    //     gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
    
    //     const faceInfos = [
    //         { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, path: paths.right },
    //         { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, path: paths.left },
    //         { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, path: paths.top },
    //         { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, path: paths.bottom },
    //         { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, path: paths.front },
    //         { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, path: paths.back },
    //     ];
    
    //     const promises = faceInfos.map(faceInfo => new Promise((resolve, reject) => {
    //         const image = new Image();
    //         image.onload = () => {
    //             gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
    //             gl.texImage2D(faceInfo.target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    //             gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //             gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //             gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //             gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //             gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    //         };
    //         image.onerror = () => reject(new Error(`Failed to load image at ${faceInfo.path}`));
    //         image.src = faceInfo.path;
    //     }));
    
    //     await Promise.all(promises);
    //     // Keine Notwendigkeit, das Textur-Objekt zurückzugeben, da es bereits an this.skyboxTexture zugewiesen wurde
    // }    
    
    
    // async drawSkybox(gl, projMatrix, viewMatrix) {
    //     if (!this.skyboxTexture) {
    //         const paths = {
    //             right: './src/pic/interstellar_bk.png',
    //             left: './src/pic/interstellar_bk.png',
    //             top: './src/pic/interstellar_bk.png',
    //             bottom: './src/pic/interstellar_bk.png',
    //             front: './src/pic/interstellar_bk.png',
    //             back: './src/pic/interstellar_bk.png',
    //         };
    //         await this.loadCubemapTextures(gl, paths);
    //     }
    
    //     if (!this.skyboxVao) {
    //         this.skyboxVao = this.createSkyboxVao(gl);
    //     }
    
    //     gl.useProgram(this.skyboxShaderProgram);
    
    //     gl.bindVertexArray(this.skyboxVao);
    //     gl.activeTexture(gl.TEXTURE0);
    //     gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
    
    //     const uProjectionMatrixLoc = gl.getUniformLocation(this.skyboxShaderProgram, 'uProjectionMatrix');
    //     const uViewMatrixLoc = gl.getUniformLocation(this.skyboxShaderProgram, 'uViewMatrix');
    //     const uSkyboxLoc = gl.getUniformLocation(this.skyboxShaderProgram, 'uSkybox');
    
    //     gl.uniformMatrix4fv(uProjectionMatrixLoc, false, projMatrix);
    //     const viewMatrixNoTranslation = new Float32Array(viewMatrix);
    //     viewMatrixNoTranslation[12] = 0; // Entferne Translation
    //     viewMatrixNoTranslation[13] = 0;
    //     viewMatrixNoTranslation[14] = 0;
    //     gl.uniformMatrix4fv(uViewMatrixLoc, false, viewMatrixNoTranslation);
    //     gl.uniform1i(uSkyboxLoc, 0);
    
    //     gl.depthFunc(gl.LEQUAL); // Wichtig für das Zeichnen der Skybox im Hintergrund
    //     gl.drawArrays(gl.TRIANGLES, 0, 36);
    //     gl.depthFunc(gl.LESS); // Setze die Tiefenfunktion zurück für den Rest der Szene
    
    //     gl.bindVertexArray(null);
    // }
    

    // createSkyboxVao(gl) {
    //     const vertices = new Float32Array([
    //         -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    //         -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0,
    //         -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    //         -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,
    //         1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0,
    //         -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,
    //     ]);
    
    //     const vao = gl.createVertexArray();
    //     gl.bindVertexArray(vao);
    
    //     const vbo = gl.createBuffer();
    //     gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    //     gl.bufferData(gl.ARRAY_BUFFER , vertices, gl.STATIC_DRAW);
    
    //     const positionAttributeLocation = gl.getAttribLocation(this.skyboxShaderProgram, 'aPosition');
    //     gl.enableVertexAttribArray(positionAttributeLocation);
    //     gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
    
    //     gl.bindVertexArray(null);
    //     return vao;
    // }
}
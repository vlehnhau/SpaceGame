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

import ModelObjRawPart from './../resources/Explo.obj?raw';
import ModelMtlRawPart from './../resources/Explo.mtl?raw';

import { render } from "react-dom";
import { createCubemap } from "./cubemap";

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

export class Game {
    entities: Array<ent.Entity>;

    shaderID: WebGLProgram;
    skyboxShaderProgram: WebGLProgram;
    skyboxVao: {vao: WebGLVertexArrayObject, iboSize: number};

    score: number;

    objListAsteroids: Array<exportObjLoader>;
    objBullet: exportObjLoader;
    objSpaceship: exportObjLoader;
    objExplo: exportObjLoader;
    
    skyboxTexture: WebGLTexture;

    difficulty: number;
    astCounter: number;
    gameOver: Boolean;

    constructor(gl: WebGL2RenderingContext) {
        this.shaderID = compileShaderProgram(gl, VertexCode, FragmentCode);
        this.skyboxShaderProgram = compileShaderProgram(gl, VertexCodeSkyBox, FragmentCodeSkyBox);

        this.objSpaceship = loadObj(gl, ModelObjRaw, ModelMtlRaw);
        this.objListAsteroids = [loadObj(gl, ModelObjRawAsteroidOne, ModelMtlRawAsteroidOne)];
        this.objBullet = loadObj(gl, ModelObjRawBullettracer, ModelMtlRawBullettracer);
        this.objExplo = loadObj(gl, ModelObjRawPart, ModelMtlRawPart);

        this.entities = [];
        this.entities.push(new ent.Player(new Vector3(0, -300, -1000), this.objSpaceship.vaoInfos, this.objSpaceship.vertexPositions));

        this.score = 0;        
        this.difficulty = 5;
        this.astCounter = 0;
        this.gameOver = false;
    }

    changeDif() {
        if (!this.gameOver) {
            if(this.score > 10) {
                this.difficulty = this.difficulty + this.score / 10;
            }
            while (this.astCounter <= this.difficulty) {
                this.spawnAstroid();
            }
        }
    }

    shoot() {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;

        let destination = new Vector3(playerPos.pos.x, playerPos.pos.y, playerPos.pos.z - 50);

        this.entities.push(new ent.Bullet(destination, this.objBullet.vaoInfos));
    }

    delAst(index) {
        let astPos = this.entities[index].components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
        if (astPos.pos.z < 0) {
            for (let index = 0; index < 100; index++) {
                this.entities.push(new ent.ExplotionParticle(astPos.pos, this.objExplo.vaoInfos));
            }
        }
        this.entities.splice(index, 1);
        this.astCounter -= 1;
    }

    delExplo() {
        this.entities.forEach(entity => {
            if (entity instanceof ent.ExplotionParticle) {
                entity.lifetime -= 1;
                if (entity.lifetime <= 0) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                }
            }
        });
    }

    spawnAstroid() {
        let startPos = new Vector3(randomIntFromInterval(-1000, 1000), randomIntFromInterval(-400, 400), randomIntFromInterval(-6000, -5000));
        let x = randomIntFromInterval(0, this.objListAsteroids.length - 1);
        this.astCounter += 1;
        this.entities.push(new ent.Asteroid(startPos, this.objListAsteroids[x].vaoInfos, this.objListAsteroids[x].vertexPositions));
    }

    move(direction: string) {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let newPos = new Vector3();

        switch (direction) {
            case 'left':
                newPos = new Vector3(player.newPos.x - 100, player.newPos.y, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.z += -0.005;
                break;
            case 'right':
                newPos = new Vector3(player.newPos.x + 100, player.newPos.y, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.z += 0.005;
                break;
            case 'up':
                newPos = new Vector3(player.newPos.x, player.newPos.y + 100, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.x += -0.005;
                break;
            case 'down':
                newPos = new Vector3(player.newPos.x, player.newPos.y - 100, player.newPos.z);
                (player.components.find(component => component instanceof comp.RotationComp) as comp.RotationComp).rotFuture.x += 0.005;
                break;
        }

        let pos = (player.components.find(componentPos => componentPos instanceof comp.PositionComp) as comp.PositionComp).pos;

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
                    this.delAst(this.entities.indexOf(entity));
                    this.spawnAstroid();
                } else if (positionComp.pos.z < -10000) {
                    this.entities.splice(this.entities.indexOf(entity), 1);
                } else if (entity instanceof ent.Player) {
                    let vel = (entity.components.find(componentVel => componentVel instanceof comp.VelocityComp) as comp.VelocityComp).vel;

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

    restart() {
        this.entities = [];

        this.entities.push(new ent.Player(new Vector3(0, -300, -1000), this.objSpaceship.vaoInfos, this.objSpaceship.vertexPositions));
        this.difficulty = 5;
        this.astCounter = 0;
        this.gameOver = true;
    }

    collisionAsteroid() {
        let player = (this.entities as any).find(entity => entity instanceof ent.Player) as ent.Player;
        let playerPos = player.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
        let playerRadius = player.components.find(component => component instanceof comp.MaxRadius) as comp.MaxRadius;

        let asteroids = this.entities.filter(entity => entity instanceof ent.Asteroid);
        let bullets = this.entities.filter(entity => entity instanceof ent.Bullet);

        asteroids.forEach(asteroid =>{
            let asteroidPos = asteroid.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
            let asteroidRadius = asteroid.components.find(component => component instanceof comp.MaxRadius) as comp.MaxRadius;  

            let distanceCenter = Math.sqrt(Math.pow(playerPos.pos.x - asteroidPos.pos.x, 2) + Math.pow(playerPos.pos.y - asteroidPos.pos.y, 2) + Math.pow(playerPos.pos.z - asteroidPos.pos.z, 2));
            let distance = (distanceCenter - (playerRadius.maxRadius + asteroidRadius.maxRadius));

            if (distance <= 1) {
                console.log('Collision');
                this.restart();
            }

            bullets.forEach(bullet =>{
                let bulletPos = bullet.components.find(component => component instanceof comp.PositionComp) as comp.PositionComp;
                let bulletRadius = 50;  

                let distanceCenterHit = Math.sqrt(Math.pow(asteroidPos.pos.x - bulletPos.pos.x, 2) + Math.pow(asteroidPos.pos.y - bulletPos.pos.y, 2) + Math.pow(asteroidPos.pos.z - bulletPos.pos.z, 2));
                let distanceHit = (distanceCenterHit - (asteroidRadius.maxRadius + bulletRadius));
                if (distanceHit <= 1) {
                    console.log('Hit');
                    this.delAst(this.entities.indexOf(asteroid));
                    this.entities.splice(this.entities.indexOf(bullet), 1);
                    this.spawnAstroid();
                    this.score += 1;
                }
            });
        });
    }

    draw(gl: WebGL2RenderingContext) {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let near = 0.1;
        let far = 10000;
        let aspect = gl.canvas.width / gl.canvas.height;

        const projMatrix = new Matrix4().perspective({
            fovy: 50 * Math.PI / 180,
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

                if (materialProps.diffuse) {const uMaterialDiffuseLoc = gl.getUniformLocation(this.shaderID, 'uMaterialDiffuse'); gl.uniform3fv(uMaterialDiffuseLoc, materialProps.diffuse);}
                if (materialProps.ambient) { const uMaterialAmbiantLoc = gl.getUniformLocation(this.shaderID, 'uMaterialAmbient'); gl.uniform3fv(uMaterialAmbiantLoc, materialProps.ambient);}
                if (materialProps.specular) { const uMaterialSpecularsLoc = gl.getUniformLocation(this.shaderID, 'uMaterialSpecular'); gl.uniform3fv(uMaterialSpecularsLoc, materialProps.specular);}
                if (materialProps.emissive) { const uMaterialEmissiveLoc = gl.getUniformLocation(this.shaderID, 'uMaterialEmissive'); gl.uniform3fv(uMaterialEmissiveLoc, materialProps.emissive); }
                if (materialProps.opticalDensity) { const uOpticalDensityLoc = gl.getUniformLocation(this.shaderID, 'uOpticalDensity'); gl.uniform1f(uOpticalDensityLoc, materialProps.opticalDensity || 1.0); }
                if (materialProps.illum) {const uIllumLoc = gl.getUniformLocation(this.shaderID, 'uIllum'); gl.uniform1i(uIllumLoc, materialProps.illum || 0); };

                let opacityLoc = gl.getUniformLocation(this.shaderID, 'uOpacity'); 
                
                const lightPosition = [1500000.0, 1500000.0, 1500.0]; 
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

        if (!this.gameOver) {
            this.drawUpdateScore("Score: " + this.score);
        } 
        
        this.drawEndScreen();       
        this.drawSkybox(gl, projMatrix, viewMatrix);
    }

    drawUpdateScore(content) {
        let textElement = document.getElementById('textOverlay');
        if (!textElement) {

            textElement = document.createElement('div');
            textElement.id = 'textOverlay';
            textElement.style.position = 'absolute';
            textElement.style.top = '50px'; 
            textElement.style.right = '50px'; 
            textElement.style.fontFamily = 'Arial, sans-serif';
            textElement.style.fontSize = '16px';
            textElement.style.color = 'white'; 
    
            const boxElement = document.createElement('div');
            boxElement.style.backgroundColor = 'red';
            boxElement.style.padding = '5px'; 
            boxElement.style.borderRadius = '5px';
            boxElement.style.display = 'inline-block';
            boxElement.style.border = '5px solid darkred'; 
            textElement.appendChild(boxElement);
    
            document.body.appendChild(textElement);
        }
        textElement.firstChild.textContent = content; 
    }

    drawEndScreen() {
        let gameOverElement = document.getElementById('gameOverOverlay');
        if (!gameOverElement) {

            gameOverElement = document.createElement('div');
            gameOverElement.id = 'gameOverOverlay';
            gameOverElement.style.position = 'absolute';
            gameOverElement.style.top = '50%'; 
            gameOverElement.style.left = '50%';
            gameOverElement.style.transform = 'translate(-50%, -50%)'; 
            gameOverElement.style.fontFamily = 'Arial, sans-serif';
            gameOverElement.style.fontSize = '48px'; 
            gameOverElement.style.color = 'white';
            gameOverElement.style.textAlign = 'center'; 
            gameOverElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            gameOverElement.style.border = '5px solid darkred';
            gameOverElement.style.padding = '20px';
            gameOverElement.style.borderRadius = '10px';
            gameOverElement.style.display = 'none';
    
            document.body.appendChild(gameOverElement);
        }
    
        if (this.gameOver) {
            gameOverElement.textContent = 'Game Over';
            gameOverElement.style.display = 'block'; 
        } else {
            gameOverElement.style.display = 'none'; 
        }
    }       
        
    async drawSkybox(gl, projMatrix, viewMatrix) {
        if (!this.skyboxTexture) {
            this.skyboxTexture = await createCubemap(gl);
        }
    
        if (!this.skyboxVao) {
            this.skyboxVao = this.createSkyboxVao(gl);
        }
    
        gl.useProgram(this.skyboxShaderProgram);
    
        gl.bindVertexArray(this.skyboxVao.vao);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);
    
        const uProjectionMatrixLoc = gl.getUniformLocation(this.skyboxShaderProgram, 'uProjectionMatrix');
        const uViewMatrixLoc = gl.getUniformLocation(this.skyboxShaderProgram, 'uViewMatrix');
        const uSkyboxLoc = gl.getUniformLocation(this.skyboxShaderProgram, 'uSkybox');
    
        gl.uniformMatrix4fv(uProjectionMatrixLoc, false, projMatrix);
        const viewMatrixNoTranslation = new Float32Array(viewMatrix);
        viewMatrixNoTranslation[12] = 0;
        viewMatrixNoTranslation[13] = 0;
        viewMatrixNoTranslation[14] = 0;
        gl.uniformMatrix4fv(uViewMatrixLoc, false, viewMatrixNoTranslation);
    
        gl.depthFunc(gl.LEQUAL);
        gl.drawElements(gl.TRIANGLES, this.skyboxVao.iboSize, gl.UNSIGNED_SHORT, 0);
        gl.depthFunc(gl.LESS); 
    
        gl.bindVertexArray(null);
    }

    createSkyboxVao(gl) {
        const vbo = [
        -1, -1, -1,
        1, -1, -1,
        -1, 1, -1,
        1, 1, -1,
        -1, -1, 1,
        1, -1, 1,
        -1, 1, 1,
        1, 1, 1
        ];
        const ibo = [0, 1, 2, 1, 3, 2, 4, 6, 5, 6, 7, 5, 0, 4, 5, 0, 5, 1, 2, 7, 6, 2, 3, 7, 7, 3, 1, 7, 1, 5, 0, 2, 6, 0, 6, 4];

        const iboSize = ibo.length;

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vbo), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
        const iboBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iboBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ibo), gl.STATIC_DRAW);
    
        return { vao, iboSize };
    }
}
import * as React from 'react'
import { compileShaderProgram, resizeCanvas, normalMatrix, loadImage } from './Utility';

import PlanetVertexShaderRaw from "./shader/Planet.vs.glsl?raw"
import PlanetFragmentShaderRaw from "./shader/Planet.fs.glsl?raw"
import { Matrix3, Matrix4, Quaternion, Vector2, Vector3 } from '@math.gl/core';
import { RangeSlider } from './ui/RangeSlider';
import { UIPanel } from './ui/UIPanel';
import { createHDRTexture } from './HDRTexture';
import { Camera } from './Camera';

import HDRBackgroundTexture from "./../resources/HDRBackground.hdr";
import Cookies from 'js-cookie';

type AppContext = {
    gl: WebGL2RenderingContext; 
    planetShader: WebGLProgram;
    quadVAO: WebGLBuffer;
    aspectRatio: number;
    backgroundTexture: WebGLTexture;
    noiseMap: WebGLTexture;

    sunPosition: Vector3;
    sunAngle: number;
    moonPosition: Vector3;
    moonRotation: Quaternion;

    displacementFactor: number;
    displacementExponent: number;

    keyPressedMap: Record<string, boolean>;
    mousePos: Vector2;
    mousePressed: boolean;

    camera: Camera;
    movementSpeed: number;
}

const drawScene = (context: AppContext) => {
    const gl = context.gl;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.useProgram(context.planetShader);

    gl.uniform1f(gl.getUniformLocation(context.planetShader, "uDisplacementFactor"), context.displacementFactor);

    gl.uniform1f(gl.getUniformLocation(context.planetShader, "uDisplacementExponent"), context.displacementExponent);

    gl.uniformMatrix4fv(gl.getUniformLocation(context.planetShader, "uProjectionMatrix"), false, context.camera.projectionMatrix);

    gl.uniformMatrix3fv(gl.getUniformLocation(context.planetShader, "uViewDirectionRotationMatrix"), false, context.camera.viewDirectionRotationMatrix);

    gl.uniform3fv(gl.getUniformLocation(context.planetShader, "uEyeWorldPos"), context.camera.position);
    gl.uniform3fv(gl.getUniformLocation(context.planetShader, "uSunPosition"), context.sunPosition);
    gl.uniform3fv(gl.getUniformLocation(context.planetShader, "uMoonPosition"), context.moonPosition);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, context.noiseMap);
    gl.uniform1i(gl.getUniformLocation(context.planetShader, 'uNoiseMap'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, context.backgroundTexture);
    gl.uniform1i(gl.getUniformLocation(context.planetShader, 'uHDRBackground'), 1);

    gl.bindVertexArray(context.quadVAO);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
}

const createQuadVAO = (gl: WebGL2RenderingContext) => {
    const quadVertexPositions = [-1, -1, -1,
                                 -1,  1, -1,
                                  1,  1, -1,
                                  1, -1, -1]

    const quadIndices = [0, 1, 2, 
                         0, 2, 3]

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertexPositions), gl.STATIC_DRAW);    
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quadIndices), gl.STATIC_DRAW);

    return vao;
}

async function createNoiseMap(gl: WebGL2RenderingContext, shaderProgram: WebGLProgram, uniformName: string): Promise<WebGLTexture> {
    const noiseMapImage = await loadImage("./../resources/NoiseMap.png");

    var noiseMapTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);

    gl.useProgram(shaderProgram);
    gl.bindTexture(gl.TEXTURE_2D, noiseMapTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, noiseMapImage);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LEVEL, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, uniformName), 0);

    return noiseMapTexture;
}

const App = () => {
    const canvas = React.useRef<HTMLCanvasElement>();
    const contextRef = React.useRef<AppContext>();

    const terrainDisplacementFactorSlider = React.useRef<HTMLInputElement>(null);
    const terrainDisplacementExponentSlider = React.useRef<HTMLInputElement>(null);

    const init = async () => {
        const gl = canvas.current.getContext('webgl2', { antialias: false })
        if (!gl) return;
        
        const planetShader = compileShaderProgram(gl, PlanetVertexShaderRaw, PlanetFragmentShaderRaw);
        const quadVAO = createQuadVAO(gl);

        const noiseMap = await createNoiseMap(gl, planetShader, "uNoiseMap");

        const backgroundTexture = await createHDRTexture(gl, HDRBackgroundTexture, gl.TEXTURE1);
        
        const cameraPitch = parseFloat(Cookies.get("CameraPitch") ?? "0.0");
        const cameraYaw = parseFloat(Cookies.get("CameraYaw") ?? "0.0");
        const cameraZoom = parseFloat(Cookies.get("CameraZoom") ?? "0.0");

        const cameraObj = new Camera(cameraPitch, cameraYaw, cameraZoom);
        
        contextRef.current = {
            gl: gl,
            planetShader: planetShader,
            quadVAO: quadVAO,
            aspectRatio: 1.0,
            backgroundTexture: backgroundTexture,
            noiseMap: noiseMap,

            sunPosition: new Vector3(0, 0.2, 1).scale(100),
            sunAngle: 0,

            moonPosition: new Vector3(0, 0, 2.0),
            moonRotation: new Quaternion().rotateX(0.01).rotateY(0.02).rotateZ(0.004),

            displacementFactor: terrainDisplacementFactorSlider.current.valueAsNumber,
            displacementExponent: terrainDisplacementExponentSlider.current.valueAsNumber,

            keyPressedMap: {},
            mousePos: null,
            mousePressed: false,

            camera: cameraObj,
        
            movementSpeed: 0.07
        }

        resizeCanvas(canvas.current);
        resizeViewport();

        drawScene(contextRef.current);

        setInterval(() => {
            contextRef.current.sunAngle += 0.001;
            contextRef.current.sunPosition = new Vector3(-Math.cos(contextRef.current.sunAngle), 0.2, Math.sin(contextRef.current.sunAngle)).scale(100);
            contextRef.current.moonPosition.transformByQuaternion(contextRef.current.moonRotation);
            drawScene(contextRef.current);
        }, 10);

        canvas.current.addEventListener('wheel', mouseWheel);
        canvas.current.addEventListener('mousedown', mouseDown);
        canvas.current.addEventListener('mouseup', mouseUp);
        canvas.current.addEventListener('mousemove', mouseMove);
        window.addEventListener('keydown', keyDown);
        window.addEventListener('keyup', keyUp);
        window.addEventListener('beforeunload', () => {
            Cookies.set("CameraPitch", contextRef.current.camera.getPitch().toString());
            Cookies.set("CameraYaw",   contextRef.current.camera.getYaw().toString());
            Cookies.set("CameraZoom",  contextRef.current.camera.getZoom().toString());
        });

        window.addEventListener('resize', () => {
            if (resizeCanvas(canvas.current))
            {
                resizeViewport();
                drawScene(contextRef.current);
            }
        });
    }

    const resizeViewport = () => {
        contextRef.current.aspectRatio = canvas.current.width / canvas.current.height;
        contextRef.current.gl.viewport(0, 0, canvas.current.width, canvas.current.height);
        contextRef.current.camera.updateProjectionMatrix(contextRef.current.aspectRatio);
    }

    const mouseWheel = (event: WheelEvent): void => {
        if (!contextRef.current) 
            return;
        const newZoom = contextRef.current.camera.getZoom() + event.deltaY * 0.0008;
        contextRef.current.camera.setZoom(newZoom);

        drawScene(contextRef.current);
    }

    const mouseDown = (event: MouseEvent): void => {
        if (!contextRef.current) 
            return;
        const ctx = contextRef.current;
        ctx.mousePressed = true;
        ctx.mousePos = new Vector2(event.clientX, event.clientY);
    }

    const mouseUp = (event: MouseEvent): void => {
        if (!contextRef.current) 
            return;

        const ctx = contextRef.current;
        ctx.mousePressed = false;
    }
    
    const mouseMove = (event: MouseEvent): void => {
        if (!contextRef.current) 
            return;
        const ctx = contextRef.current;

        if (ctx.mousePressed) {
            const newPos = new Vector2(event.clientX, event.clientY);
            
            const newYaw   = ctx.camera.getYaw() - ((newPos.x - ctx.mousePos.x) * 0.11) * Math.PI / 180;
            const newPitch = ctx.camera.getPitch(); //+ ((newPos.y - ctx.mousePos.y) * 0.11) * Math.PI / 180;

            ctx.camera.setRotation(newPitch, newYaw);
            
            ctx.mousePos = newPos;

            drawScene(contextRef.current);
        }
    }

    const keyDown = (event: KeyboardEvent): void => {
        contextRef.current.keyPressedMap[event.key.toLowerCase()] = true;
        drawScene(contextRef.current);
    }

    const keyUp = (event: KeyboardEvent): void => {
        contextRef.current.keyPressedMap[event.key.toLowerCase()] = false;
        drawScene(contextRef.current);
    }

    React.useEffect(() => {
        init();
    }, [])

    return (
        <div className='relative bg-white h-screen w-full'>
            <canvas ref={canvas} className='w-full h-screen'></canvas>
            
            <UIPanel>
                Terrain Displacement Factor:
                <RangeSlider 
                    inputRef={terrainDisplacementFactorSlider}
                    cookieName="displacementFactor"
                    value={0.6}
                    min={0}
                    max={3}
                    step={0.001}
                    onChange={(value) => {
                        contextRef.current.displacementFactor = value;
                        drawScene(contextRef.current);
                    }}>
                </RangeSlider>   
                Terrain Displacement Exponent:
                <RangeSlider 
                    inputRef={terrainDisplacementExponentSlider}
                    cookieName="displacementExponent"
                    value={6.0}
                    min={1}
                    max={10}
                    step={0.05}
                    onChange={(value) => {
                        contextRef.current.displacementExponent = value;
                        drawScene(contextRef.current);
                    }}>
                </RangeSlider>   
                
            </UIPanel>
        </div>
    )
}

export default App;